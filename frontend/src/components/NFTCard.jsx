import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function NFTCard({ nft }) {
  const isRoyalty = !!nft.royalty_pool_id || nft.asset_type === 'royalty';
  const displayValue = nft.last_sale_price_xrp > 0 ? nft.last_sale_price_xrp : nft.list_price_xrp;

  return (
    <Link
      to={`/nft/${nft.id}`}
      className="group block bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden hover:border-primary-600/50 transition-all hover:shadow-lg hover:shadow-primary-600/10"
    >
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-primary-900/50 to-surface-800 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Zap className="w-12 h-12 text-primary-500/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-surface-400 capitalize">{nft.asset_type || 'Digital Asset'}</p>
            {isRoyalty && nft.royalty_percentage && (
              <p className="text-xs text-purple-400 mt-1 font-bold">{nft.royalty_percentage}% Royalty</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1">
          <span
            className={`text-[10px] font-medium px-2 py-1 rounded-full ${
              nft.status === 'listed'
                ? 'bg-green-900/40 text-green-400'
                : nft.status === 'owned'
                ? 'bg-blue-900/40 text-blue-400'
                : 'bg-surface-700 text-surface-400'
            }`}
          >
            {nft.status?.toUpperCase()}
          </span>
          {isRoyalty && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-purple-900/40 text-purple-400">
              ROYALTY
            </span>
          )}
        </div>

        {/* Sale count badge */}
        {nft.sale_count > 0 && (
          <div className="absolute bottom-3 right-3 bg-surface-900/80 backdrop-blur px-2 py-1 rounded-full">
            <span className="text-[10px] text-surface-300">{nft.sale_count} sale{nft.sale_count !== 1 ? 's' : ''}</span>
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

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">
              {nft.last_sale_price_xrp > 0 ? 'Value' : 'Price'}
            </p>
            <p className="text-sm font-bold text-green-400">
              {parseFloat(displayValue || 0).toFixed(1)} XRP
            </p>
          </div>
          {nft.list_price_xrp && nft.last_sale_price_xrp > 0 && nft.status === 'listed' && (
            <div className="text-right">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Ask</p>
              <p className="text-sm font-bold text-white">
                {parseFloat(nft.list_price_xrp).toFixed(1)} XRP
              </p>
            </div>
          )}
          {!nft.last_sale_price_xrp && nft.list_price_xrp && (
            <div className="text-right">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Price</p>
              <p className="text-sm font-bold text-white">
                {parseFloat(nft.list_price_xrp).toFixed(1)} XRP
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
