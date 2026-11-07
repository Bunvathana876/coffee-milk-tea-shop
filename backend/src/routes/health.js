import { Router } from 'express';
import { config } from '../config.js';
import { dbQuery } from '../db/database.js';

const router = Router();

router.get('/ready', async (req, res) => {
  try { await dbQuery('SELECT 1'); res.json({ status: 'ready' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Café backend API is running smoothly',
    app: 'Coffee & Milk Tea Shop API',
    version: '1.0.0',
    environment: config.environment,
  });
});

export default router;
