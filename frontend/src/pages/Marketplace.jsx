import { useState, useEffect } from 'react';
import { ShoppingBag, Search, SlidersHorizontal } from 'lucide-react';
import * as api from '../services/api';
import NFTCard from '../components/NFTCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Marketplace() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    assetType: '',
    sort: 'newest',
  });

  useEffect(() => {
    loadNFTs();
  }, [filters]);

  const loadNFTs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.assetType) params.assetType = filters.assetType;
      if (filters.sort) params.sort = filters.sort;
      const { data } = await api.getMarketplaceNFTs(params);
      setNfts(data.nfts);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary-400" />
            Marketplace
          </h1>
          <p className="text-surface-400 mt-1">Browse and purchase digital asset NFTs</p>
        </div>
        <div className="text-sm text-surface-500">
          {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-surface-900 border border-surface-800 rounded-xl px-4 py-2">
          <SlidersHorizontal className="w-4 h-4 text-surface-500" />
          <select
            value={filters.assetType}
            onChange={(e) => setFilters({ ...filters, assetType: e.target.value })}
            className="bg-transparent text-sm focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="digital_asset">Digital Asset</option>
            <option value="gaming">Gaming</option>
            <option value="art">Art</option>
            <option value="music">Music</option>
            <option value="collectible">Collectible</option>
            <option value="royalty">Royalty</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-surface-900 border border-surface-800 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-surface-500" />
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="bg-transparent text-sm focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="value_desc">Highest Value</option>
            <option value="most_traded">Most Traded</option>
          </select>
        </div>

        <button
          onClick={loadNFTs}
          className="px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* NFT Grid */}
      {loading ? (
        <LoadingSpinner text="Loading marketplace..." />
      ) : nfts.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-16 h-16 text-surface-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-surface-400">No NFTs Listed</h3>
          <p className="text-surface-500 mt-2">
            Be the first to mint and list digital asset NFTs!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} showBuy />
          ))}
        </div>
      )}
    </div>
  );
}
