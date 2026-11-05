import express from 'express';
import { prisma } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import {
  createCheckoutQuoteToken,
  getEthUsdPrice,
  getQuoteExpiry,
  normalizeCartItems
} from '../services/ethPricing.js';

const router = express.Router();

router.get('/eth-usd', async (req, res) => {
  try {
    const ethUsd = await getEthUsdPrice();
    res.json({ ethUsd, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('ETH price fetch error:', error);
    res.status(503).json({ error: 'Live ETH pricing is temporarily unavailable.' });
  }
});

router.post('/checkout-quote', verifyToken, async (req, res) => {
  try {
    const cartItems = normalizeCartItems(req.body.cartItems);
    const products = await prisma.product.findMany({
      where: { id: { in: cartItems.map((item) => item.productId) } }
    });

    let totalUsd = 0;
    for (const item of cartItems) {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.productId} was not found.` });
      }
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}.` });
      }
      totalUsd += product.priceUsd * item.quantity;
    }

    totalUsd = Math.round(totalUsd * 100) / 100;
    const ethUsd = await getEthUsdPrice();
    const totalEth = (totalUsd / ethUsd).toFixed(8);
    const quote = { userId: req.user.id, cartItems, totalUsd, ethUsd, totalEth };
    const quoteToken = createCheckoutQuoteToken(quote);

    res.json({
      cartItems,
      totalUsd,
      ethUsd,
      totalEth,
      quoteToken,
      expiresAt: getQuoteExpiry()
    });
  } catch (error) {
    console.error('Checkout quote error:', error);
    const status = error.message?.includes('Cart') ? 400 : 503;
    res.status(status).json({
      error: status === 400 ? error.message : 'Unable to create a live checkout quote.'
    });
  }
});

export default router;
