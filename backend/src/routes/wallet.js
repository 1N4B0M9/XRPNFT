import { Router } from 'express';
import * as xrplService from '../services/xrpl.js';
import pool from '../db/pool.js';

const router = Router();

// ─── Create Testnet Wallet ───────────────────────────────────────
router.post('/create', async (req, res) => {
  try {
    const { displayName } = req.body;
    const wallet = await xrplService.createTestnetWallet();

    // Store user
    await pool.query(
      `INSERT INTO users (wallet_address, wallet_seed, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_address) DO UPDATE SET display_name = $3`,
      [wallet.address, wallet.seed, displayName || `User_${wallet.address.slice(-6)}`]
    );

    res.json({
      address: wallet.address,
      seed: wallet.seed,
      balance: wallet.balance,
    });
  } catch (err) {
    console.error('Error creating wallet:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Wallet Balance ──────────────────────────────────────────
router.get('/balance/:address', async (req, res) => {
  try {
    const balance = await xrplService.getBalance(req.params.address);
    res.json({ address: req.params.address, balance });
  } catch (err) {
    console.error('Error fetching balance:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Login with Seed (hackathon shortcut) ────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { seed } = req.body;
    if (!seed) return res.status(400).json({ error: 'Seed required' });

    const wallet = xrplService.walletFromSeed(seed);
    const balance = await xrplService.getBalance(wallet.address);

    // Check user record
    const userResult = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet.address]
    );

    // If user doesn't exist yet, create a record
    if (userResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (wallet_address, wallet_seed, display_name)
         VALUES ($1, $2, $3)`,
        [wallet.address, seed, `User_${wallet.address.slice(-6)}`]
      );
    }

    res.json({
      address: wallet.address,
      balance,
      user: userResult.rows[0] || null,
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Invalid seed or connection error' });
  }
});

export default router;
