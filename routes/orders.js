import express from 'express';
import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { prisma } from '../index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize Viem RPC Public Client connected to Sepolia
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.ALCHEMY_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org')
});

router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { txHash, cartItems } = req.body; // cartItems: [{ productId, quantity }]
    const userId = req.user.id;

    if (!txHash || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'Transaction hash and valid cart items are required.' });
    }

    // 1. Anti-Replay Check: Ensure txHash hasn't been used before
    const existingOrder = await prisma.order.findUnique({
      where: { txHash }
    });
    if (existingOrder) {
      return res.status(400).json({ error: 'This transaction hash has already been processed.' });
    }

    // 2. Fetch products from DB & compute expected total independently
    const productIds = cartItems.map(item => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    let expectedTotalEth = 0;
    for (const item of cartItems) {
      const product = dbProducts.find(p => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.productId} not found.` });
      }
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}.` });
      }
      expectedTotalEth += product.priceEth * item.quantity;
    }

    // Fix floating point rounding errors before converting to Wei
    const expectedEthFormatted = expectedTotalEth.toFixed(6);
    const expectedWei = parseEther(expectedEthFormatted);

    // 3. Fetch transaction receipt and transaction data from Sepolia RPC
    const [tx, receipt] = await Promise.all([
      publicClient.getTransaction({ hash: txHash }),
      publicClient.getTransactionReceipt({ hash: txHash })
    ]);

    if (!tx || !receipt) {
      return res.status(404).json({ error: 'Transaction not found on Sepolia network.' });
    }

    // 4. Verify transaction status
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed or was reverted on-chain.' });
    }

    // 5. Verify recipient address matches server's ADMIN_WALLET_ADDRESS
    const expectedAdminWallet = process.env.ADMIN_WALLET_ADDRESS.toLowerCase();
    if (!tx.to || tx.to.toLowerCase() !== expectedAdminWallet) {
      return res.status(400).json({ error: 'Transaction recipient address does not match admin wallet.' });
    }

    // 6. Verify value paid matches expected total (allow small precision tolerance if needed)
    if (tx.value < expectedWei) {
      return res.status(400).json({ 
        error: `Insufficient payment amount. Paid: ${formatEther(tx.value)} ETH, Expected: ${expectedEthFormatted} ETH` 
      });
    }

    // 7. Atomic DB Transaction: Create order record & deduct stock
    const result = await prisma.$transaction(async (txPrisma) => {
      // Create order
      const newOrder = await txPrisma.order.create({
        data: {
          userId,
          totalEth: parseFloat(expectedEthFormatted),
          status: 'PAID',
          txHash
        }
      });

      // Deduct product stock quantities
      for (const item of cartItems) {
        await txPrisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }

      return newOrder;
    });

    return res.status(201).json({
      message: 'Payment verified and order created successfully.',
      order: result
    });

  } catch (error) {
    console.error('Order verification error:', error);
    return res.status(500).json({ error: 'Failed to verify payment transaction.' });
  }
});

export default router;