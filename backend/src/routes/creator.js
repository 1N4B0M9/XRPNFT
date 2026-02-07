import { Router } from 'express';
import multer from 'multer';
import pool from '../db/pool.js';
import * as xrplService from '../services/xrpl.js';
import * as ipfsService from '../services/ipfs.js';

const router = Router();

// Multer configured for memory storage (buffer available for IPFS upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// ─── Mint NFTs ──────────────────────────────────────────────────
router.post('/mint', upload.single('file'), async (req, res) => {
  try {
    const { walletAddress, assetName, assetDescription, assetType, listPriceXrp, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const listPrice = parseFloat(listPriceXrp) || 50;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Parse properties from JSON string (sent via FormData)
    let properties = {};
    if (req.body.properties) {
      try {
        properties = JSON.parse(req.body.properties);
      } catch {
        return res.status(400).json({ error: 'Invalid properties JSON' });
      }
    }

    // Validate: at least one of file or properties must be provided
    const hasFile = !!req.file;
    const hasProperties = Object.keys(properties).length > 0;
    if (!hasFile && !hasProperties) {
      return res.status(400).json({ error: 'Please upload a file and/or add properties to the NFT' });
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

    // Upload file to IPFS/local if provided
    let contentUrl = null;
    let contentMimeType = null;
    if (hasFile) {
      contentUrl = await ipfsService.pinFile(req.file.buffer, req.file.originalname);
      contentMimeType = req.file.mimetype;
    }

    const mintedNFTs = [];

    for (let i = 0; i < qty; i++) {
      // 1. Build & pin metadata (with content + properties)
      const metadata = ipfsService.buildNFTMetadata({
        name: assetName || `${displayName} Asset #${i + 1}`,
        description: assetDescription || `Digital asset NFT by ${displayName}`,
        imageUrl: contentUrl,
        assetType: assetType || 'digital_asset',
        backingXrp: 0,
        creatorName: displayName,
        properties: hasProperties ? properties : undefined,
        contentMimeType,
      });
      const metadataUri = await ipfsService.pinMetadata(metadata);

      // 2. Mint NFT on XRPL
      const mintResult = await xrplService.mintNFT(userSeed, metadataUri);

      // 3. Create sell offer
      let sellOffer = null;
      if (mintResult.tokenId) {
        sellOffer = await xrplService.createSellOffer(
          userSeed,
          mintResult.tokenId,
          listPrice
        );
      }

      // 4. Store in database
      const nftResult = await pool.query(
        `INSERT INTO nfts (token_id, creator_address, asset_type, asset_name, asset_description,
         asset_image_url, metadata_uri, properties, backing_xrp, list_price_xrp,
         last_sale_price_xrp, sale_count, status, owner_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          mintResult.tokenId,
          walletAddress,
          assetType || 'digital_asset',
          assetName || `${displayName} Asset #${i + 1}`,
          assetDescription || `Digital asset NFT by ${displayName}`,
          contentUrl,
          metadataUri,
          JSON.stringify(properties),
          0,
          listPrice,
          0,
          0,
          'listed',
          walletAddress,
        ]
      );

      // 5. Record transaction
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
      message: `Successfully minted ${qty} NFT(s)`,
      nfts: mintedNFTs,
    });
  } catch (err) {
    console.error('Error minting NFTs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Creator's NFTs ─────────────────────────────────────────
router.get('/:address/nfts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, rp.name as royalty_pool_name
       FROM nfts n
       LEFT JOIN royalty_pools rp ON n.royalty_pool_id = rp.id
       WHERE n.creator_address = $1
       ORDER BY n.created_at DESC`,
      [req.params.address]
    );
    res.json({ nfts: result.rows });
  } catch (err) {
    console.error('Error fetching creator NFTs:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
