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
    const { name, description, imageUrl } = req.body;
    const priceUsd = Number(req.body.priceUsd);
    const stockQuantity = Number(req.body.stockQuantity);

    if (!name || !description || !imageUrl || !Number.isFinite(priceUsd) || priceUsd <= 0) {
      return res.status(400).json({ error: 'Valid product details and a positive USD price are required.' });
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({ error: 'Stock quantity must be a non-negative integer.' });
    }

    const product = await prisma.product.create({
      data: { name, description, imageUrl, priceUsd, stockQuantity }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT update product pricing and inventory (Admin Only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const priceUsd = Number(req.body.priceUsd);
    const stockQuantity = Number(req.body.stockQuantity);

    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return res.status(400).json({ error: 'USD price must be greater than zero.' });
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({ error: 'Stock quantity must be a non-negative integer.' });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { priceUsd, stockQuantity }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product.' });
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