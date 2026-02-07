import { Router } from 'express';
import pool from '../db/pool.js';
import * as xrplService from '../services/xrpl.js';

const router = Router();

// ─── Browse Listed NFTs ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { assetType, maxPrice, sort } = req.query;

    let query = `
      SELECT n.*, u.display_name as creator_name,
             rp.name as royalty_pool_name
      FROM nfts n
      LEFT JOIN users u ON n.creator_address = u.wallet_address
      LEFT JOIN royalty_pools rp ON n.royalty_pool_id = rp.id
      WHERE n.status = 'listed'
    `;
    const params = [];

    if (assetType) {
      params.push(assetType);
      query += ` AND n.asset_type = $${params.length}`;
    }

    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      query += ` AND n.list_price_xrp <= $${params.length}`;
    }

    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY n.list_price_xrp ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY n.list_price_xrp DESC';
        break;
      case 'value_desc':
        query += ' ORDER BY n.last_sale_price_xrp DESC';
        break;
      case 'most_traded':
        query += ' ORDER BY n.sale_count DESC';
        break;
      default:
        query += ' ORDER BY n.created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json({ nfts: result.rows });
  } catch (err) {
    console.error('Error browsing marketplace:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Single NFT Detail ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.display_name as creator_name,
              rp.name as royalty_pool_name, rp.id as pool_id,
              rp.total_deposited_xrp as pool_total_deposited,
              rp.total_distributed_xrp as pool_total_distributed
       FROM nfts n
       LEFT JOIN users u ON n.creator_address = u.wallet_address
       LEFT JOIN royalty_pools rp ON n.royalty_pool_id = rp.id
       WHERE n.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    // Get transaction history (local cache)
    const txResult = await pool.query(
      `SELECT * FROM transactions WHERE nft_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    // Get royalty payouts for this NFT if applicable
    let royaltyPayouts = [];
    if (result.rows[0].royalty_pool_id) {
      const payoutsResult = await pool.query(
        `SELECT * FROM royalty_payouts WHERE nft_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      );
      royaltyPayouts = payoutsResult.rows;
    }

    res.json({
      nft: result.rows[0],
      transactions: txResult.rows,
      royaltyPayouts,
    });
  } catch (err) {
    console.error('Error fetching NFT detail:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get NFT Price History (On-Chain + Local) ────────────────────
router.get('/:id/price-history', async (req, res) => {
  try {
    const nftResult = await pool.query('SELECT token_id FROM nfts WHERE id = $1', [req.params.id]);
    if (nftResult.rows.length === 0) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    const tokenId = nftResult.rows[0].token_id;

    // Try on-chain history first
    let priceHistory = [];
    if (tokenId) {
      priceHistory = await xrplService.getNFTTransactionHistory(tokenId);
    }

    // Fallback to local DB if on-chain data unavailable
    if (priceHistory.length === 0) {
      const localTx = await pool.query(
        `SELECT * FROM transactions WHERE nft_id = $1 AND tx_type = 'purchase' ORDER BY created_at ASC`,
        [req.params.id]
      );
      priceHistory = localTx.rows.map((tx, idx) => ({
        date: tx.created_at,
        price: parseFloat(tx.amount_xrp),
        buyer: tx.from_address,
        seller: tx.to_address,
        txHash: tx.tx_hash,
        saleNumber: idx + 1,
      }));
    }

    res.json({ priceHistory });
  } catch (err) {
    console.error('Error fetching price history:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Purchase NFT (Direct Sale - XRP goes to seller) ────────────
router.post('/:id/buy', async (req, res) => {
  try {
    const { buyerWalletAddress, buyerWalletSeed } = req.body;
    const nftId = req.params.id;

    if (!buyerWalletAddress || !buyerWalletSeed) {
      return res.status(400).json({ error: 'Buyer wallet info required' });
    }

    // Get NFT
    const nftResult = await pool.query(
      `SELECT * FROM nfts WHERE id = $1 AND status = 'listed'`,
      [nftId]
    );

    if (nftResult.rows.length === 0) {
      return res.status(404).json({ error: 'NFT not found or not available' });
    }

    const nft = nftResult.rows[0];
    const sellerAddress = nft.owner_address;
    const saleNumber = (nft.sale_count || 0) + 1;
    const previousPrice = nft.last_sale_price_xrp || 0;

    // Build on-chain memo data for universal price history
    const memoData = {
      platform: 'DigitalAssetTartan',
      saleNumber,
      salePrice: String(nft.list_price_xrp),
      currency: 'XRP',
      previousPrice: String(previousPrice),
    };

    // Get sell offers for this NFT
    let sellOffers = [];
    if (nft.token_id) {
      sellOffers = await xrplService.getSellOffers(nft.token_id);
    }

    let purchaseTx;

    if (sellOffers.length > 0) {
      // Accept the sell offer on XRPL (XRP goes to seller automatically)
      purchaseTx = await xrplService.acceptSellOffer(
        buyerWalletSeed,
        sellOffers[0].nft_offer_index,
        memoData
      );
    } else {
      // Fallback: direct payment to current owner
      purchaseTx = await xrplService.sendPayment(
        buyerWalletSeed,
        sellerAddress,
        nft.list_price_xrp
      );
    }

    // Update NFT ownership, price, and sale count
    await pool.query(
      `UPDATE nfts SET status = 'owned', owner_address = $1, last_sale_price_xrp = $2,
       sale_count = $3, updated_at = datetime('now') WHERE id = $4`,
      [buyerWalletAddress, nft.list_price_xrp, saleNumber, nftId]
    );

    // Record transaction (from=buyer who paid, to=seller who received)
    await pool.query(
      `INSERT INTO transactions (nft_id, tx_type, from_address, to_address, amount_xrp, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nftId, 'purchase', buyerWalletAddress, sellerAddress, nft.list_price_xrp, purchaseTx.txHash, 'confirmed']
    );

    // Update or create user record
    await pool.query(
      `INSERT INTO users (wallet_address, wallet_seed, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [buyerWalletAddress, buyerWalletSeed, `User_${buyerWalletAddress.slice(-6)}`]
    );

    res.json({
      message: 'NFT purchased successfully',
      txHash: purchaseTx.txHash,
      nft: {
        id: nftId,
        tokenId: nft.token_id,
        owner: buyerWalletAddress,
        salePrice: nft.list_price_xrp,
        saleNumber,
      },
    });
  } catch (err) {
    console.error('Error purchasing NFT:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Relist NFT (Owner sets new price) ──────────────────────────
router.post('/:id/relist', async (req, res) => {
  try {
    const { ownerWalletAddress, ownerWalletSeed, listPriceXrp } = req.body;
    const nftId = req.params.id;

    if (!ownerWalletAddress || !ownerWalletSeed || !listPriceXrp) {
      return res.status(400).json({ error: 'Owner wallet info and list price required' });
    }

    const listPrice = parseFloat(listPriceXrp);
    if (listPrice <= 0) {
      return res.status(400).json({ error: 'List price must be greater than 0' });
    }

    // Get NFT and verify ownership
    const nftResult = await pool.query(
      `SELECT * FROM nfts WHERE id = $1 AND owner_address = $2 AND status = 'owned'`,
      [nftId, ownerWalletAddress]
    );

    if (nftResult.rows.length === 0) {
      return res.status(404).json({ error: 'NFT not found or you are not the owner' });
    }

    const nft = nftResult.rows[0];

    // Create sell offer on XRPL
    let sellOffer = null;
    if (nft.token_id) {
      sellOffer = await xrplService.createSellOffer(
        ownerWalletSeed,
        nft.token_id,
        listPrice
      );
    }

    // Update NFT status and price
    await pool.query(
      `UPDATE nfts SET status = 'listed', list_price_xrp = $1, updated_at = datetime('now') WHERE id = $2`,
      [listPrice, nftId]
    );

    // Record relist transaction
    await pool.query(
      `INSERT INTO transactions (nft_id, tx_type, from_address, amount_xrp, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nftId, 'relist', ownerWalletAddress, listPrice, sellOffer?.txHash || null, 'confirmed']
    );

    res.json({
      message: 'NFT relisted successfully',
      nft: {
        id: nftId,
        listPrice,
        sellOfferIndex: sellOffer?.offerIndex || null,
      },
    });
  } catch (err) {
    console.error('Error relisting NFT:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
