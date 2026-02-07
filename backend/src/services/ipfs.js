import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Read env vars at call time (not import time) so dotenv has loaded first
function hasPinata() {
  const key = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_SECRET_KEY;
  return (
    key &&
    secret &&
    !key.startsWith('your_') &&
    !secret.startsWith('your_')
  );
}

/**
 * Pin a file (Buffer) to IPFS via Pinata, or save locally as fallback.
 * Returns a URL string (ipfs:// or /uploads/...).
 */
export async function pinFile(fileBuffer, fileName) {
  if (hasPinata()) {
    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName });
      formData.append(
        'pinataMetadata',
        JSON.stringify({ name: fileName })
      );

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const data = await response.json();
      if (data.IpfsHash) {
        console.log(`[Pinata] Pinned file: ipfs://${data.IpfsHash}`);
        return `ipfs://${data.IpfsHash}`;
      }
    } catch (err) {
      console.warn('Pinata file upload failed, falling back to local:', err.message);
    }
  }

  // Fallback: save to local uploads directory
  const ext = path.extname(fileName) || '.bin';
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);
  fs.writeFileSync(filePath, fileBuffer);
  console.log(`[Local] Saved file: /uploads/${uniqueName}`);
  return `/uploads/${uniqueName}`;
}

/**
 * Pin JSON metadata to IPFS (or simulate it).
 * Returns a URI string suitable for NFT metadata.
 */
export async function pinMetadata(metadata) {
  if (hasPinata()) {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
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
 * Build standard NFT metadata object with content and properties support.
 */
export function buildNFTMetadata({
  name,
  description,
  image,
  imageUrl,
  assetType,
  backingXrp,
  creatorName,
  royaltyPoolName,
  royaltyPercentage,
  properties,
  contentMimeType,
}) {
  const attributes = [
    { trait_type: 'Asset Type', value: assetType },
    { trait_type: 'Creator', value: creatorName },
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

  // Use uploaded image URL if available, otherwise fallback
  const resolvedImage = imageUrl || image || 'https://placehold.co/400x400/1a1a2e/e94560?text=DAT+NFT';

  const metadata = {
    name,
    description,
    image: resolvedImage,
    external_url: 'https://digitalassettartan.io',
    attributes,
  };

  // Add structured properties for game integration
  if (properties && Object.keys(properties).length > 0) {
    metadata.properties = properties;
  }

  // Add content info if a file was uploaded
  if (imageUrl) {
    metadata.content = {
      mime_type: contentMimeType || 'application/octet-stream',
      url: imageUrl,
    };
  }

  return metadata;
}
