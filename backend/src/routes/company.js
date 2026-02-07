import { Router } from 'express';
import pool from '../db/pool.js';
import * as xrplService from '../services/xrpl.js';
import * as ipfsService from '../services/ipfs.js';

const router = Router();

// ─── Register Company ────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Create a testnet wallet for the company
    const wallet = await xrplService.createTestnetWallet();

    const result = await pool.query(
      `INSERT INTO companies (name, description, wallet_address, wallet_seed, xrp_balance, verification_tier)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, wallet_address, xrp_balance, verification_tier, created_at`,
      [name, description || '', wallet.address, wallet.seed, wallet.balance, 'basic']
    );

    res.json({
      company: result.rows[0],
      wallet: {
        address: wallet.address,
        balance: wallet.balance,
      },
    });
  } catch (err) {
    console.error('Error registering company:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Company Info ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, wallet_address, wallet_seed, xrp_balance, verification_tier, created_at
       FROM companies WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get live balance from XRPL
    const liveBalance = await xrplService.getBalance(result.rows[0].wallet_address);
    const company = { ...result.rows[0], live_xrp_balance: liveBalance };

    // Get royalty pools for this company
    const poolsResult = await pool.query(
      `SELECT * FROM royalty_pools WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ company, royaltyPools: poolsResult.rows });
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── List All Companies ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, wallet_address, xrp_balance, verification_tier, created_at
       FROM companies ORDER BY created_at DESC`
    );
    res.json({ companies: result.rows });
  } catch (err) {
    console.error('Error listing companies:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Mint NFTs (Direct Sale - No Escrow) ─────────────────────────
router.post('/:id/mint', async (req, res) => {
  try {
    const { assetName, assetDescription, assetType, listPriceXrp, quantity } = req.body;
    const companyId = req.params.id;
    const qty = quantity || 1;
    const listPrice = parseFloat(listPriceXrp) || 50;

    // Get company
    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];

    const mintedNFTs = [];

    for (let i = 0; i < qty; i++) {
      // 1. Build & pin metadata
      const metadata = ipfsService.buildNFTMetadata({
        name: assetName || `${company.name} Asset #${i + 1}`,
        description: assetDescription || `Digital asset NFT from ${company.name}`,
        image: null,
        assetType: assetType || 'digital_asset',
        backingXrp: 0,
        companyName: company.name,
        verificationTier: company.verification_tier,
      });
      const metadataUri = await ipfsService.pinMetadata(metadata);

      // 2. Mint NFT on XRPL
      const mintResult = await xrplService.mintNFT(company.wallet_seed, metadataUri);

      // 3. Create sell offer
      let sellOffer = null;
      if (mintResult.tokenId) {
        sellOffer = await xrplService.createSellOffer(
          company.wallet_seed,
          mintResult.tokenId,
          listPrice
        );
      }

      // 4. Store in database
      const nftResult = await pool.query(
        `INSERT INTO nfts (token_id, company_id, asset_type, asset_name, asset_description,
         metadata_uri, backing_xrp, list_price_xrp, last_sale_price_xrp, sale_count,
         status, owner_address, verification_tier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          mintResult.tokenId,
          companyId,
          assetType || 'digital_asset',
          assetName || `${company.name} Asset #${i + 1}`,
          assetDescription || `Digital asset NFT from ${company.name}`,
          metadataUri,
          0,
          listPrice,
          0,
          0,
          'listed',
          company.wallet_address,
          company.verification_tier,
        ]
      );

      // 5. Record transaction
      await pool.query(
        `INSERT INTO transactions (nft_id, tx_type, from_address, amount_xrp, tx_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nftResult.rows[0].id, 'mint', company.wallet_address, 0, mintResult.txHash, 'confirmed']
      );

      mintedNFTs.push({
        nft: nftResult.rows[0],
        mintTx: mintResult.txHash,
        sellOfferIndex: sellOffer?.offerIndex || null,
      });
    }

    res.json({
      message: `Successfully minted ${qty} NFT(s)`,
      nfts: mintedNFTs,
    });
  } catch (err) {
    console.error('Error minting NFTs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Company NFTs ────────────────────────────────────────────
router.get('/:id/nfts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM nfts WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ nfts: result.rows });
  } catch (err) {
    console.error('Error fetching company NFTs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Update Verification Tier ────────────────────────────────────
router.patch('/:id/verify', async (req, res) => {
  try {
    const { tier } = req.body; // 'basic', 'verified', 'premium'
    const result = await pool.query(
      `UPDATE companies SET verification_tier = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, name, verification_tier`,
      [tier || 'verified', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Update all company NFTs
    await pool.query(
      `UPDATE nfts SET verification_tier = $1 WHERE company_id = $2`,
      [tier || 'verified', req.params.id]
    );

    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error('Error updating verification:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
