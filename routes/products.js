import express from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all products (Public)
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET single product (Public)
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// POST add new product (Admin Only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, priceEth, stockQuantity } = req.body;
    const product = await prisma.product.create({
      data: { name, description, imageUrl, priceEth, stockQuantity }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT update stock quantity (Admin Only)
router.put('/:id/stock', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { stockQuantity } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stockQuantity }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock.' });
  }
});

export default router;