import { Router } from 'express';
import pool from '../db/pool.js';
import * as xrplService from '../services/xrpl.js';

const router = Router();

// ─── Burn & Redeem NFT (release escrow backing) ─────────────────
router.post('/:nftId/redeem', async (req, res) => {
  try {
    const { ownerWalletAddress, ownerWalletSeed } = req.body;
    const nftId = req.params.nftId;

    if (!ownerWalletAddress || !ownerWalletSeed) {
      return res.status(400).json({ error: 'Wallet info required' });
    }

    // Get NFT and verify ownership
    const nftResult = await pool.query(
      `SELECT * FROM nfts WHERE id = $1 AND owner_address = $2 AND status IN ('owned', 'listed')`,
      [nftId, ownerWalletAddress]
    );

    if (nftResult.rows.length === 0) {
      return res.status(404).json({ error: 'NFT not found or you are not the owner' });
    }

    const nft = nftResult.rows[0];
    const backingAmount = parseFloat(nft.backing_xrp || 0);

    if (backingAmount <= 0) {
      return res.status(400).json({ error: 'This NFT has no XRP backing to redeem' });
    }

    if (!nft.escrow_sequence || !nft.escrow_owner) {
      return res.status(400).json({ error: 'Escrow info missing for this NFT' });
    }

    // 1. Finish the escrow to release the XRP to the current owner
    //    If this fails, DO NOT burn the NFT — the user would lose both the NFT and the escrow XRP.
    let escrowFinishResult;
    try {
      escrowFinishResult = await xrplService.finishEscrow(
        ownerWalletSeed,
        nft.escrow_owner,
        nft.escrow_sequence
      );
    } catch (escrowErr) {
      console.error('Escrow finish failed:', escrowErr.message);
      return res.status(400).json({
        error: 'Could not release escrow XRP. The escrow may not be finishable yet — please wait a few seconds and try again.',
      });
    }

    // 2. Burn the NFT on XRPL (only after escrow was successfully released)
    let burnResult;
    if (nft.token_id) {
      burnResult = await xrplService.burnNFT(ownerWalletSeed, nft.token_id);
    }

    // 3. Update NFT status in database
    await pool.query(
      `UPDATE nfts SET status = 'redeemed', backing_xrp = 0, updated_at = datetime('now') WHERE id = $1`,
      [nftId]
    );

    // 4. Record redemption transaction
    await pool.query(
      `INSERT INTO transactions (nft_id, tx_type, from_address, amount_xrp, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        nftId,
        'redeem',
        ownerWalletAddress,
        backingAmount,
        burnResult?.txHash || escrowFinishResult?.txHash || null,
        'confirmed',
      ]
    );

    res.json({
      message: `NFT burned and ${backingAmount} XRP redeemed successfully`,
      backingRedeemed: backingAmount,
      burnTxHash: burnResult?.txHash || null,
      escrowTxHash: escrowFinishResult?.txHash || null,
    });
  } catch (err) {
    console.error('Error redeeming NFT:', err);
    res.status(500).json({ error: err.message });
  }
});

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
