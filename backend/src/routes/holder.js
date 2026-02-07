import { Router } from 'express';
import pool from '../db/pool.js';
import * as xrplService from '../services/xrpl.js';

const router = Router();

// ─── Get Holder Portfolio ────────────────────────────────────────
router.get('/:address/portfolio', async (req, res) => {
  try {
    const address = req.params.address;

    // Get owned NFTs (with royalty pool info and creator name)
    const nftsResult = await pool.query(
      `SELECT n.*, u.display_name as creator_name, rp.name as royalty_pool_name
       FROM nfts n
       LEFT JOIN users u ON n.creator_address = u.wallet_address
       LEFT JOIN royalty_pools rp ON n.royalty_pool_id = rp.id
       WHERE n.owner_address = $1 AND n.status IN ('owned', 'listed')
       ORDER BY n.created_at DESC`,
      [address]
    );

    // Get live XRP balance
    const balance = await xrplService.getBalance(address);

    // Calculate portfolio stats (market value based on last sale price or list price)
    const totalValue = nftsResult.rows.reduce(
      (sum, nft) => sum + parseFloat(nft.last_sale_price_xrp || nft.list_price_xrp || 0),
      0
    );

    res.json({
      address,
      xrpBalance: balance,
      nfts: nftsResult.rows,
      stats: {
        totalNFTs: nftsResult.rows.length,
        totalPortfolioValue: totalValue,
      },
    });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Transaction History ─────────────────────────────────────
router.get('/:address/transactions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, n.asset_name, n.token_id
       FROM transactions t
       JOIN nfts n ON t.nft_id = n.id
       WHERE t.from_address = $1 OR t.to_address = $1
       ORDER BY t.created_at DESC`,
      [req.params.address]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Royalty Earnings ────────────────────────────────────────
router.get('/:address/royalty-earnings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rp_out.*, rp.name as pool_name, n.asset_name
       FROM royalty_payouts rp_out
       JOIN royalty_pools rp ON rp_out.pool_id = rp.id
       JOIN nfts n ON rp_out.nft_id = n.id
       WHERE rp_out.holder_address = $1
       ORDER BY rp_out.created_at DESC`,
      [req.params.address]
    );

    const totalEarnings = result.rows.reduce(
      (sum, p) => sum + parseFloat(p.amount_xrp || 0),
      0
    );

    res.json({
      earnings: result.rows,
      totalEarnings,
    });
  } catch (err) {
    console.error('Error fetching royalty earnings:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
