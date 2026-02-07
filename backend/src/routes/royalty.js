import { Router } from 'express';
import pool from '../db/pool.js';
import * as xrplService from '../services/xrpl.js';
import * as ipfsService from '../services/ipfs.js';

const router = Router();

// ─── Create Royalty Pool + Batch Mint NFTs ───────────────────────
router.post('/pool', async (req, res) => {
  try {
    const { walletAddress, name, description, totalNfts, royaltyPerNft, listPriceXrp } = req.body;

    if (!name || !totalNfts || !royaltyPerNft) {
      return res.status(400).json({ error: 'Name, total NFTs, and royalty per NFT are required' });
    }
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const qty = parseInt(totalNfts);
    const percentage = parseFloat(royaltyPerNft);
    const listPrice = parseFloat(listPriceXrp) || 10;

    if (qty <= 0 || qty > 100) {
      return res.status(400).json({ error: 'Total NFTs must be between 1 and 100' });
    }

    if (percentage <= 0 || percentage * qty > 100) {
      return res.status(400).json({ error: 'Total royalty percentage cannot exceed 100%' });
    }

    // Look up user's seed from the users table
    const userResult = await pool.query(
      'SELECT wallet_seed, display_name FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].wallet_seed) {
      return res.status(404).json({ error: 'Wallet not found. Please create or import a wallet first.' });
    }
    const userSeed = userResult.rows[0].wallet_seed;
    const displayName = userResult.rows[0].display_name || walletAddress.slice(0, 8);

    // Create royalty pool
    const poolResult = await pool.query(
      `INSERT INTO royalty_pools (creator_address, name, description, total_nfts, royalty_per_nft)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [walletAddress, name, description || '', qty, percentage]
    );
    const royaltyPool = poolResult.rows[0];

    // Batch mint NFTs tied to this pool
    const mintedNFTs = [];

    for (let i = 0; i < qty; i++) {
      // Build metadata with royalty info
      const metadata = ipfsService.buildNFTMetadata({
        name: `${name} #${i + 1}`,
        description: description || `Royalty NFT: ${percentage}% of ${name}`,
        image: null,
        assetType: 'royalty',
        backingXrp: 0,
        creatorName: displayName,
        royaltyPoolName: name,
        royaltyPercentage: percentage,
      });
      const metadataUri = await ipfsService.pinMetadata(metadata);

      // Mint NFT on XRPL
      const mintResult = await xrplService.mintNFT(userSeed, metadataUri);

      // Create sell offer
      let sellOffer = null;
      if (mintResult.tokenId) {
        sellOffer = await xrplService.createSellOffer(
          userSeed,
          mintResult.tokenId,
          listPrice
        );
      }

      // Store in database
      const nftResult = await pool.query(
        `INSERT INTO nfts (token_id, creator_address, asset_type, asset_name, asset_description,
         metadata_uri, backing_xrp, list_price_xrp, last_sale_price_xrp, sale_count,
         royalty_pool_id, royalty_percentage, status, owner_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          mintResult.tokenId,
          walletAddress,
          'royalty',
          `${name} #${i + 1}`,
          `${percentage}% royalty share of ${name}`,
          metadataUri,
          0,
          listPrice,
          0,
          0,
          royaltyPool.id,
          percentage,
          'listed',
          walletAddress,
        ]
      );

      // Record mint transaction
      await pool.query(
        `INSERT INTO transactions (nft_id, tx_type, from_address, amount_xrp, tx_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nftResult.rows[0].id, 'mint', walletAddress, 0, mintResult.txHash, 'confirmed']
      );

      mintedNFTs.push({
        nft: nftResult.rows[0],
        mintTx: mintResult.txHash,
        sellOfferIndex: sellOffer?.offerIndex || null,
      });
    }

    res.json({
      message: `Royalty pool "${name}" created with ${qty} NFTs`,
      pool: royaltyPool,
      nfts: mintedNFTs,
    });
  } catch (err) {
    console.error('Error creating royalty pool:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── List All Royalty Pools ──────────────────────────────────────
router.get('/pools', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rp.*, u.display_name as creator_name
       FROM royalty_pools rp
       LEFT JOIN users u ON rp.creator_address = u.wallet_address
       ORDER BY rp.created_at DESC`
    );
    res.json({ pools: result.rows });
  } catch (err) {
    console.error('Error listing royalty pools:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Royalty Pool Details ────────────────────────────────────
router.get('/pool/:poolId', async (req, res) => {
  try {
    const poolResult = await pool.query(
      `SELECT rp.*, u.display_name as creator_name
       FROM royalty_pools rp
       LEFT JOIN users u ON rp.creator_address = u.wallet_address
       WHERE rp.id = $1`,
      [req.params.poolId]
    );

    if (poolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Royalty pool not found' });
    }

    // Get NFTs in this pool
    const nftsResult = await pool.query(
      `SELECT id, asset_name, owner_address, status, royalty_percentage, last_sale_price_xrp
       FROM nfts WHERE royalty_pool_id = $1 ORDER BY asset_name`,
      [req.params.poolId]
    );

    // Get deposits
    const depositsResult = await pool.query(
      `SELECT * FROM royalty_deposits WHERE pool_id = $1 ORDER BY created_at DESC`,
      [req.params.poolId]
    );

    // Count unique holders (excluding the creator)
    const holdersResult = await pool.query(
      `SELECT COUNT(DISTINCT owner_address) as cnt FROM nfts
       WHERE royalty_pool_id = $1 AND status IN ('owned', 'listed') AND owner_address != $2`,
      [req.params.poolId, poolResult.rows[0].creator_address]
    );

    res.json({
      pool: poolResult.rows[0],
      nfts: nftsResult.rows,
      deposits: depositsResult.rows,
      holdersCount: parseInt(holdersResult.rows[0]?.cnt || 0),
    });
  } catch (err) {
    console.error('Error fetching royalty pool:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Distribute Royalty Income ───────────────────────────────────
router.post('/pool/:poolId/distribute', async (req, res) => {
  try {
    const { amountXrp, walletAddress } = req.body;
    const poolId = req.params.poolId;

    if (!amountXrp || !walletAddress) {
      return res.status(400).json({ error: 'Amount and wallet address required' });
    }

    const amount = parseFloat(amountXrp);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get pool info
    const poolResult = await pool.query(
      `SELECT * FROM royalty_pools WHERE id = $1`,
      [poolId]
    );

    if (poolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Royalty pool not found' });
    }

    const royaltyPool = poolResult.rows[0];

    // Verify the caller is the pool creator
    if (royaltyPool.creator_address !== walletAddress) {
      return res.status(403).json({ error: 'You are not authorized to distribute for this pool' });
    }

    // Look up user's seed from users table
    const userResult = await pool.query(
      'SELECT wallet_seed FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].wallet_seed) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    const userSeed = userResult.rows[0].wallet_seed;

    // Get all NFTs owned by someone OTHER than the creator
    const nftsResult = await pool.query(
      `SELECT id, owner_address, royalty_percentage FROM nfts
       WHERE royalty_pool_id = $1 AND status IN ('owned', 'listed')
       AND owner_address != $2`,
      [poolId, walletAddress]
    );

    if (nftsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No holders to distribute to' });
    }

    // Create deposit record
    const depositResult = await pool.query(
      `INSERT INTO royalty_deposits (pool_id, depositor_address, amount_xrp, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [poolId, walletAddress, amount, 'distributing']
    );
    const deposit = depositResult.rows[0];

    // Calculate total percentage held by external holders
    const totalPercentageHeld = nftsResult.rows.reduce(
      (sum, nft) => sum + parseFloat(nft.royalty_percentage || 0),
      0
    );

    // Group NFTs by holder address
    const holderMap = {};
    for (const nft of nftsResult.rows) {
      if (!holderMap[nft.owner_address]) {
        holderMap[nft.owner_address] = { nfts: [], totalPercentage: 0 };
      }
      holderMap[nft.owner_address].nfts.push(nft);
      holderMap[nft.owner_address].totalPercentage += parseFloat(nft.royalty_percentage || 0);
    }

    // Distribute to each holder
    const payouts = [];
    const errors = [];

    for (const [holderAddress, holderData] of Object.entries(holderMap)) {
      const payoutAmount = (holderData.totalPercentage / totalPercentageHeld) * amount;

      if (payoutAmount < 0.000001) continue; // Skip dust amounts

      try {
        // Send XRP payment from creator to holder
        const paymentResult = await xrplService.sendPayment(
          userSeed,
          holderAddress,
          payoutAmount
        );

        // Record payout for each NFT the holder owns
        for (const nft of holderData.nfts) {
          const nftPayout = (parseFloat(nft.royalty_percentage) / totalPercentageHeld) * amount;
          await pool.query(
            `INSERT INTO royalty_payouts (deposit_id, pool_id, nft_id, holder_address, amount_xrp, tx_hash, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [deposit.id, poolId, nft.id, holderAddress, nftPayout, paymentResult.txHash, 'completed']
          );
          payouts.push({
            holderAddress,
            nftId: nft.id,
            amount: nftPayout,
            txHash: paymentResult.txHash,
          });
        }
      } catch (payErr) {
        console.error(`Failed to pay ${holderAddress}:`, payErr.message);
        errors.push({ holderAddress, error: payErr.message });
      }
    }

    // Update deposit status
    const totalDistributed = payouts.reduce((sum, p) => sum + p.amount, 0);
    await pool.query(
      `UPDATE royalty_deposits SET status = 'distributed', tx_hash = $1 WHERE id = $2`,
      [payouts[0]?.txHash || null, deposit.id]
    );

    // Update pool totals
    await pool.query(
      `UPDATE royalty_pools SET total_deposited_xrp = total_deposited_xrp + $1,
       total_distributed_xrp = total_distributed_xrp + $2 WHERE id = $3`,
      [amount, totalDistributed, poolId]
    );

    res.json({
      message: `Distributed ${totalDistributed.toFixed(4)} XRP to ${Object.keys(holderMap).length} holder(s)`,
      deposit,
      payouts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Error distributing royalty:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
