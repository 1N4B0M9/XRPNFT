import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import NFTVisual from './NFTVisual';

// Resolve image URL: handle ipfs:// links, local /uploads/ paths, and full URLs
function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  if (url.startsWith('/uploads/')) {
    // Local fallback — served from backend
    return `http://localhost:3001${url}`;
  }
  return url;
}

export default function NFTCard({ nft }) {
  const isRoyalty = !!nft.royalty_pool_id || nft.asset_type === 'royalty';
  const backingXrp = parseFloat(nft.backing_xrp || 0);
  const imageUrl = resolveImageUrl(nft.asset_image_url);
  const hasImage = !!imageUrl;

  return (
    <Link
      to={`/nft/${nft.id}`}
      className="group block bg-surface-900 border border-surface-800 rounded-lg overflow-hidden hover:border-primary-600/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/10 hover:scale-[1.02]"
    >
{/* Image or Generative Visual */}
<div className="aspect-square relative overflow-hidden">
  {hasImage ? (
    <img src={imageUrl} alt={nft.asset_name} className="absolute inset-0 w-full h-full object-cover" />
  ) : (
    <NFTVisual nft={nft} size="card" />
  )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 z-20">
          <span
            className={`text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm ${
              nft.status === 'listed'
                ? 'bg-green-900/60 text-green-400'
                : nft.status === 'owned'
                ? 'bg-blue-900/60 text-blue-400'
                : 'bg-surface-700/80 text-surface-400'
            }`}
          >
            {nft.status?.toUpperCase()}
          </span>
          {isRoyalty && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-purple-900/60 backdrop-blur-sm text-purple-400">
              ROYALTY
            </span>
          )}
        </div>

        {/* Backing badge */}
        {backingXrp > 0 && (
          <div className="absolute bottom-3 left-3 bg-amber-900/80 backdrop-blur-sm px-2 py-1 rounded-full z-20 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[10px] text-amber-300 font-medium">
              {backingXrp.toFixed(1)} XRP
            </span>
          </div>
        )}

        {/* Sale count badge */}
        {nft.sale_count > 0 && (
          <div className="absolute bottom-3 right-3 bg-surface-900/80 backdrop-blur-sm px-2 py-1 rounded-full z-20">
            <span className="text-[10px] text-surface-300">
              {nft.sale_count} sale{nft.sale_count !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
          {nft.asset_name}
        </h3>
        <p className="text-xs text-surface-500 mt-1 truncate">
          by {nft.creator_name || (nft.creator_address ? `${nft.creator_address.slice(0, 8)}...` : 'Unknown')}
          {nft.royalty_pool_name && (
            <span className="text-purple-400"> &middot; {nft.royalty_pool_name}</span>
          )}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Escrow</p>
            <p className={`text-sm font-bold ${backingXrp > 0 ? 'text-amber-400' : 'text-surface-500'}`}>
              {backingXrp > 0 ? `${backingXrp.toFixed(1)} XRP` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">List</p>
            <p className="text-sm font-bold text-white">
              {nft.list_price_xrp != null ? `${parseFloat(nft.list_price_xrp).toFixed(1)} XRP` : '—'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
