import dotenv from 'dotenv';

dotenv.config();

// For the hackathon, we simulate IPFS/Pinata by storing metadata as
// data URIs / mock IPFS hashes. If Pinata keys are configured, we
// can use the real API.

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

/**
 * Pin JSON metadata to IPFS (or simulate it).
 * Returns a URI string suitable for NFT metadata.
 */
export async function pinMetadata(metadata) {
  // If Pinata keys are available, use the real API
  if (PINATA_API_KEY && PINATA_SECRET_KEY) {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: metadata.name || 'DAT-NFT',
          },
        }),
      });

      const data = await response.json();
      return `ipfs://${data.IpfsHash}`;
    } catch (err) {
      console.warn('Pinata upload failed, falling back to mock:', err.message);
    }
  }

  // Fallback: encode metadata as a data URI for demo
  const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
  const mockHash = 'Qm' + encoded.slice(0, 44);
  console.log(`[Mock IPFS] Pinned metadata with hash: ${mockHash}`);
  return `ipfs://${mockHash}`;
}

/**
 * Build standard NFT metadata object.
 */
export function buildNFTMetadata({ name, description, image, assetType, backingXrp, companyName, verificationTier, royaltyPoolName, royaltyPercentage }) {
  const attributes = [
    { trait_type: 'Asset Type', value: assetType },
    { trait_type: 'Company', value: companyName },
    { trait_type: 'Verification Tier', value: verificationTier },
  ];

  if (backingXrp) {
    attributes.push({ trait_type: 'Backing (XRP)', value: backingXrp });
  }

  if (royaltyPoolName) {
    attributes.push({ trait_type: 'Royalty Pool', value: royaltyPoolName });
  }

  if (royaltyPercentage) {
    attributes.push({ trait_type: 'Royalty Percentage', value: `${royaltyPercentage}%` });
  }

  return {
    name,
    description,
    image: image || 'https://placehold.co/400x400/1a1a2e/e94560?text=DAT+NFT',
    external_url: 'https://digitalassettartan.io',
    attributes,
  };
}
