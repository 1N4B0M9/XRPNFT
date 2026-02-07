import './env.js'; // load .env before anything else

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import creatorRoutes from './routes/creator.js';
import marketplaceRoutes from './routes/marketplace.js';
import holderRoutes from './routes/holder.js';
import walletRoutes from './routes/wallet.js';
import royaltyRoutes from './routes/royalty.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files statically (fallback when Pinata is not configured)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/creator', creatorRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/holder', holderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/royalty', royaltyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const { default: pool } = await import('./db/pool.js');
    const [creators, nfts, transactions, royaltyPools] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT creator_address) as cnt FROM nfts'),
      pool.query('SELECT COUNT(*) as cnt FROM nfts'),
      pool.query('SELECT COUNT(*) as cnt FROM transactions'),
      pool.query('SELECT COUNT(*) as cnt FROM royalty_pools'),
    ]);

    const totalVolume = await pool.query(
      "SELECT COALESCE(SUM(amount_xrp), 0) as total FROM transactions WHERE tx_type = 'purchase'"
    );

    res.json({
      creators: parseInt(creators.rows[0]?.cnt || 0),
      nfts: parseInt(nfts.rows[0]?.cnt || 0),
      transactions: parseInt(transactions.rows[0]?.cnt || 0),
      royaltyPools: parseInt(royaltyPools.rows[0]?.cnt || 0),
      totalVolumeXrp: parseFloat(totalVolume.rows[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Digital Asset Tartan - Backend Server      ║
  ║   Running on http://localhost:${PORT}           ║
  ║   XRPL: Testnet                              ║
  ╚══════════════════════════════════════════════╝
  `);
});
