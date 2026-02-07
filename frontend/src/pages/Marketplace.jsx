import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, SlidersHorizontal, X } from 'lucide-react';
import * as api from '../services/api';
import NFTCard from '../components/NFTCard';
import { SkeletonMarketplace } from '../components/Skeleton';

export default function Marketplace() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    assetType: '',
    sort: 'newest',
    minPrice: '',
    maxPrice: '',
  });
  const debounceRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchText]);

  useEffect(() => {
    loadNFTs();
  }, [filters, debouncedSearch]);

  const loadNFTs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.assetType) params.assetType = filters.assetType;
      if (filters.sort) params.sort = filters.sort;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      const { data } = await api.getMarketplaceNFTs(params);
      setNfts(data.nfts);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = searchText || filters.assetType || filters.minPrice || filters.maxPrice;

  const clearFilters = () => {
    setSearchText('');
    setDebouncedSearch('');
    setFilters({ assetType: '', sort: 'newest', minPrice: '', maxPrice: '' });
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

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search NFTs by name or creator..."
          className="w-full bg-surface-900 border border-surface-800 rounded-xl pl-12 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-surface-600"
        />
        {searchText && (
          <button
            onClick={() => { setSearchText(''); setDebouncedSearch(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Row */}
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

        {/* Price Range */}
        <div className="flex items-center gap-2 bg-surface-900 border border-surface-800 rounded-xl px-3 py-1.5">
          <span className="text-xs text-surface-500">XRP</span>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            placeholder="Min"
            className="w-16 bg-transparent text-sm focus:outline-none placeholder-surface-600 text-center"
            min="0"
          />
          <span className="text-surface-600">-</span>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            placeholder="Max"
            className="w-16 bg-transparent text-sm focus:outline-none placeholder-surface-600 text-center"
            min="0"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-800/40 rounded-xl text-xs text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear Filters
          </button>
        )}
      </div>

      {/* NFT Grid */}
      {loading ? (
        <SkeletonMarketplace />
      ) : nfts.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-16 h-16 text-surface-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-surface-400">
            {hasActiveFilters ? 'No Results Found' : 'No NFTs Listed'}
          </h3>
          <p className="text-surface-500 mt-2">
            {hasActiveFilters
              ? `No NFTs match "${searchText || 'your filters'}". Try adjusting your search.`
              : 'Be the first to mint and list digital asset NFTs!'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}
    </div>
  );
}
