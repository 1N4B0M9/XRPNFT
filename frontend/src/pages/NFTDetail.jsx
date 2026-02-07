import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import {
  ArrowLeft,
  Coins,
  ArrowRightLeft,
  AlertCircle,
  RefreshCw,
  Zap,
  TrendingUp,
  Tag,
  Repeat,
  DollarSign,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import ExplorerLink from '../components/ExplorerLink';

export default function NFTDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallet } = useWallet();

  const [nft, setNft] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [royaltyPayouts, setRoyaltyPayouts] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [relisting, setRelisting] = useState(false);
  const [relistPrice, setRelistPrice] = useState('');
  const [showRelistForm, setShowRelistForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadNFT();
  }, [id]);

  const loadNFT = async () => {
    setLoading(true);
    try {
      const [detailRes, historyRes] = await Promise.all([
        api.getNFTDetail(id),
        api.getNFTPriceHistory(id).catch(() => ({ data: { priceHistory: [] } })),
      ]);
      setNft(detailRes.data.nft);
      setTransactions(detailRes.data.transactions);
      setRoyaltyPayouts(detailRes.data.royaltyPayouts || []);
      setPriceHistory(historyRes.data.priceHistory || []);
    } catch (err) {
      console.error('Failed to load NFT:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!wallet) {
      navigate('/wallet');
      return;
    }
    setBuying(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.purchaseNFT(id, wallet.address, wallet.seed);
      setSuccess({ message: 'Purchase successful!', txHash: data.txHash });
      loadNFT();
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const handleRelist = async () => {
    if (!relistPrice || parseFloat(relistPrice) <= 0) {
      setError('Please enter a valid price');
      return;
    }
    setRelisting(true);
    setError('');
    setSuccess('');
    try {

      const { data } = await api.redeemNFT(id, wallet.address, wallet.seed);
      setSuccess({ message: `Redeemed! ${data.redemption.amountXrp} XRP released.`, txHash: data.redemption.burnTxHash });
      loadNFT();
    } catch (err) {
      setError(err.response?.data?.error || 'Relist failed');
    } finally {
      setRelisting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading NFT details..." />;
  if (!nft) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-400">NFT not found</p>
        <button onClick={() => navigate('/marketplace')} className="mt-4 text-primary-400 hover:underline">
          Back to Marketplace
        </button>
      </div>
    );
  }

  const isOwner = wallet && nft.owner_address === wallet.address;
  const canBuy = wallet && nft.status === 'listed' && !isOwner;
  const canRelist = wallet && nft.status === 'owned' && isOwner;
  const currentValue = nft.last_sale_price_xrp > 0 ? nft.last_sale_price_xrp : nft.list_price_xrp;
  const isRoyaltyNFT = !!nft.royalty_pool_id;
  const creatorLabel = nft.creator_name || (nft.creator_address ? `${nft.creator_address.slice(0, 10)}...${nft.creator_address.slice(-4)}` : 'Unknown');

  // Format price history for chart
  const chartData = priceHistory
    .filter((p) => p.price != null)
    .map((p) => ({
      date: new Date(p.date).toLocaleDateString(),
      price: parseFloat(p.price),
    }));

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Image / Visual */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <div className="aspect-square bg-gradient-to-br from-primary-900/40 to-surface-900 flex items-center justify-center relative">
            <div className="text-center">
              <Zap className="w-20 h-20 text-primary-500/30 mx-auto mb-4" />
              <p className="text-xl font-bold text-surface-400">{nft.asset_type}</p>
              <p className="text-sm text-surface-600 mt-1">
                {isRoyaltyNFT ? `${nft.royalty_percentage}% Royalty NFT` : 'Digital Asset NFT'}
              </p>
            </div>

            {/* Value Badge */}
            <div className="absolute bottom-4 left-4 right-4 bg-surface-900/90 backdrop-blur rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">
                  {nft.sale_count > 0 ? 'Market Value' : 'List Price'}
                </p>
                <p className="text-xl font-bold text-green-400">
                  {parseFloat(currentValue || 0).toFixed(1)} XRP
                </p>
              </div>
              {nft.sale_count > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">Sales</p>
                  <p className="text-lg font-bold text-blue-400">{nft.sale_count}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={nft.status} />
              {isRoyaltyNFT && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-purple-900/40 text-purple-400">
                  ROYALTY
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{nft.asset_name}</h1>
            <p className="text-surface-400 mt-2">by {creatorLabel}</p>
          </div>

          {/* Description */}
          {nft.asset_description && (
            <p className="text-surface-300 leading-relaxed">{nft.asset_description}</p>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider">List Price</p>
              <p className="text-lg font-bold text-white mt-1">
                {nft.list_price_xrp ? `${parseFloat(nft.list_price_xrp).toFixed(1)} XRP` : 'N/A'}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Last Sale</p>
              <p className="text-lg font-bold text-green-400 mt-1">
                {nft.last_sale_price_xrp > 0 ? `${parseFloat(nft.last_sale_price_xrp).toFixed(1)} XRP` : 'Never sold'}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Asset Type</p>
              <p className="text-sm font-semibold mt-1 capitalize">{nft.asset_type}</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Token ID</p>
              <div className="mt-1">
                {nft.token_id ? (
                  <ExplorerLink type="nft" value={nft.token_id} />
                ) : (
                  <span className="text-xs text-surface-400">N/A</span>
                )}
              </div>
            </div>
          </div>

          {/* Royalty Pool Info */}
          {isRoyaltyNFT && (
            <div className="bg-purple-900/10 border border-purple-800/30 rounded-xl p-4">
              <p className="text-xs text-purple-400 uppercase tracking-wider mb-2 font-semibold">Royalty Pool</p>
              <p className="text-white font-medium">{nft.royalty_pool_name}</p>
              <p className="text-sm text-surface-400 mt-1">
                This NFT entitles the holder to <span className="text-purple-400 font-bold">{nft.royalty_percentage}%</span> of distributed royalty income.
              </p>
              {nft.pool_total_distributed > 0 && (
                <p className="text-sm text-green-400 mt-2">
                  Total distributed from pool: {parseFloat(nft.pool_total_distributed).toFixed(2)} XRP
                </p>
              )}
            </div>
          )}

          {/* Owner */}
          {nft.owner_address && (
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">
                {isOwner ? 'You Own This NFT' : 'Current Owner'}
              </p>
              <ExplorerLink type="account" value={nft.owner_address} truncate={false} />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {canBuy && (
              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 disabled:from-surface-700 disabled:to-surface-700 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 glow-pulse"
              >
                {buying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing on XRPL...
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Buy for {parseFloat(nft.list_price_xrp).toFixed(1)} XRP
                  </>
                )}
              </button>
            )}

            {canRelist && !showRelistForm && (
              <button
                onClick={() => setShowRelistForm(true)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3"
              >
                <Tag className="w-5 h-5" />
                Relist on Marketplace
              </button>
            )}

            {showRelistForm && (
              <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-medium">Set Your Price (XRP)</label>
                <input
                  type="number"
                  value={relistPrice}
                  onChange={(e) => setRelistPrice(e.target.value)}
                  placeholder="e.g., 75"
                  min="0.01"
                  step="0.1"
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRelist}
                    disabled={relisting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {relisting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Listing on XRPL...
                      </>
                    ) : (
                      <>
                        <Repeat className="w-4 h-4" />
                        Confirm Relist
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowRelistForm(false); setRelistPrice(''); }}
                    className="px-4 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!wallet && nft.status === 'listed' && (
              <button
                onClick={() => navigate('/wallet')}
                className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-colors"
              >
                Connect Wallet to Purchase
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-xl text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-900/20 border border-green-800 rounded-xl text-sm text-green-400">
              <p>{success.message || success}</p>
              {success.txHash && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-green-500/70">TX:</span>
                  <ExplorerLink type="tx" value={success.txHash} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price History Chart */}
      {chartData.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Price History (On-Chain)
          </h2>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `${v} XRP`} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                  labelStyle={{ color: '#999' }}
                  formatter={(value) => [`${value} XRP`, 'Sale Price']}
                />
                <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Royalty Payouts */}
      {royaltyPayouts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            Royalty Payouts for This NFT
          </h2>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium hidden sm:table-cell">TX Hash</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {royaltyPayouts.map((p) => (
                  <tr key={p.id} className="border-b border-surface-800/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-sm font-bold text-green-400">
                      +{parseFloat(p.amount_xrp).toFixed(4)} XRP
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.tx_hash ? (
                        <code className="text-xs font-mono text-surface-400">{p.tx_hash.slice(0, 12)}...</code>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-surface-500 hidden md:table-cell">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium hidden sm:table-cell">TX Hash</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-surface-800/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium capitalize">{tx.tx_type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tx.amount_xrp ? `${parseFloat(tx.amount_xrp).toFixed(1)} XRP` : '-'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <ExplorerLink type="tx" value={tx.tx_hash} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500 hidden md:table-cell">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
