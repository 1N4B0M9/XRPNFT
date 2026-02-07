import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import {
  ArrowLeft,
  Coins,
  RefreshCw,
  TrendingUp,
  Tag,
  Repeat,
  DollarSign,
  Settings2,
  ExternalLink,
  Lock,
  Shield,
  Flame,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../services/api';
import { useToast } from '../components/Toast';
import { SkeletonNFTDetail } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import ExplorerLink from '../components/ExplorerLink';
import NFTVisual from '../components/NFTVisual';

export default function NFTDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallet, refreshBalance } = useWallet();
  const { toast } = useToast();

  const [nft, setNft] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [royaltyPayouts, setRoyaltyPayouts] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [relisting, setRelisting] = useState(false);
  const [relistPrice, setRelistPrice] = useState('');
  const [showRelistForm, setShowRelistForm] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false);

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
    const balance = parseFloat(wallet.balance || 0);
    const price = parseFloat(nft?.list_price_xrp || 0);
    if (balance < price) {
      toast({ type: 'error', title: 'Insufficient Balance', message: `You need ${price} XRP but only have ${balance.toFixed(2)} XRP` });
      return;
    }
    setBuying(true);
    try {
      const { data } = await api.purchaseNFT(id, wallet.address, wallet.seed);
      toast({ type: 'success', title: 'Purchase Successful!', message: `TX: ${data.txHash?.slice(0, 12)}...` });
      loadNFT();
      refreshBalance();
    } catch (err) {
      toast({ type: 'error', title: 'Purchase Failed', message: err.response?.data?.error || 'Purchase failed' });
    } finally {
      setBuying(false);
    }
  };

  const handleRelist = async () => {
    if (!relistPrice || parseFloat(relistPrice) <= 0) {
      toast({ type: 'error', message: 'Please enter a valid price' });
      return;
    }
    setRelisting(true);
    try {
      const { data } = await api.relistNFT(id, wallet.address, wallet.seed, parseFloat(relistPrice));
      toast({ type: 'success', title: 'NFT Relisted!', message: `Listed for ${relistPrice} XRP` });
      setShowRelistForm(false);
      setRelistPrice('');
      loadNFT();
      refreshBalance();
    } catch (err) {
      toast({ type: 'error', title: 'Relist Failed', message: err.response?.data?.error || 'Relist failed' });
    } finally {
      setRelisting(false);
    }
  };

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const { data } = await api.redeemNFT(id, wallet.address, wallet.seed);
      toast({ type: 'success', title: 'NFT Redeemed!', message: `${data.backingRedeemed} XRP released to your wallet` });
      setShowRedeemConfirm(false);
      loadNFT();
      refreshBalance();
    } catch (err) {
      toast({ type: 'error', title: 'Redemption Failed', message: err.response?.data?.error || 'Redemption failed' });
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) return <SkeletonNFTDetail />;
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
  const isRoyaltyNFT = !!nft.royalty_pool_id;
  const backingXrp = parseFloat(nft.backing_xrp || 0);
  const canRedeem = isOwner && backingXrp > 0 && nft.status !== 'redeemed';
  const creatorLabel = nft.creator_name || (nft.creator_address ? `${nft.creator_address.slice(0, 10)}...${nft.creator_address.slice(-4)}` : 'Unknown');

  // Resolve image URL
  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
    if (url.startsWith('/uploads/')) return `http://localhost:3001${url}`;
    return url;
  };
  const imageUrl = resolveUrl(nft.asset_image_url);
  const hasImage = !!imageUrl;

  // Parse properties
  let nftProperties = {};
  try {
    nftProperties = nft.properties ? (typeof nft.properties === 'string' ? JSON.parse(nft.properties) : nft.properties) : {};
  } catch { nftProperties = {}; }
  const hasProperties = Object.keys(nftProperties).length > 0;

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

      <div className="grid lg:grid-cols-2 gap-8 lg:items-start">
        {/* Left: Square image (fits like card); column sizes to content so no black gap */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden w-full">
          <div className="aspect-square relative">
            {hasImage ? (
              <img src={imageUrl} alt={nft.asset_name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 w-full h-full">
                <NFTVisual nft={nft} size="detail" />
              </div>
            )}

            {/* Escrow & List price badge */}
            <div className="absolute bottom-4 left-4 right-4 bg-surface-900/90 backdrop-blur-md rounded-xl p-4 flex items-center justify-between z-20">
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Escrow
                </p>
                <p className={`text-lg font-bold ${backingXrp > 0 ? 'text-amber-400' : 'text-surface-500'}`}>
                  {backingXrp > 0 ? `${backingXrp.toFixed(1)} XRP` : '—'}
                </p>
              </div>
              {nft.sale_count > 0 && (
                <div className="text-center">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">Sales</p>
                  <p className="text-lg font-bold text-blue-400">{nft.sale_count}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">List</p>
                <p className="text-lg font-bold text-white">
                  {nft.list_price_xrp != null ? `${parseFloat(nft.list_price_xrp).toFixed(1)} XRP` : '—'}
                </p>
              </div>
            </div>
          </div>
          {/* Royalty pool message under image (left column) */}
          {isRoyaltyNFT && (
            <div className="p-4 border-t border-surface-800 bg-purple-900/10 border-b border-l border-r border-surface-800 rounded-b-2xl border-t-purple-800/30">
              <p className="text-xs text-purple-400 uppercase tracking-wider mb-1 font-semibold">Royalty Pool</p>
              <p className="text-white font-medium">{nft.royalty_pool_name}</p>
              <p className="text-sm text-surface-400 mt-0.5">
                This NFT entitles the holder to <span className="text-purple-400 font-bold">{nft.royalty_percentage}%</span> of distributed royalty income.
              </p>
              {nft.pool_total_distributed > 0 && (
                <p className="text-sm text-green-400 mt-1.5">
                  Total distributed from pool: {parseFloat(nft.pool_total_distributed).toFixed(2)} XRP
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          {/* Title row: name + author left, You own this NFT (compact) right */}
            <div className="flex flex-wrap items-start justify-between gap-4">
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
            {nft.owner_address && (
              <div className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 shrink-0">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-0.5">
                  {isOwner ? 'You Own This NFT' : 'Current Owner'}
                </p>
                <ExplorerLink type="account" value={nft.owner_address} className="text-xs" />
              </div>
            )}
          </div>

          {/* Description */}
          {nft.asset_description && (
            <p className="text-surface-300 leading-relaxed">{nft.asset_description}</p>
          )}

          {/* Escrow Backing Banner */}
          {backingXrp > 0 && (
            <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-900/30 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400">Escrow-Backed NFT</p>
                <p className="text-sm text-surface-300 mt-0.5">
                  This NFT has <span className="font-bold text-white">{backingXrp.toFixed(1)} XRP</span> locked
                  in an XRPL escrow. The owner can burn the NFT at any time to redeem the backing.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Guaranteed Floor</p>
                <p className="text-xl font-bold text-amber-400">{backingXrp.toFixed(1)} XRP</p>
              </div>
            </div>
          )}

          {/* Details Grid: Escrow, List, Last Sale, Asset Type, Token ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Escrow</p>
              <p className={`text-lg font-bold mt-1 ${backingXrp > 0 ? 'text-amber-400' : 'text-surface-500'}`}>
                {backingXrp > 0 ? `${backingXrp.toFixed(1)} XRP` : '—'}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider">List Price</p>
              <p className="text-lg font-bold text-white mt-1">
                {nft.list_price_xrp != null ? `${parseFloat(nft.list_price_xrp).toFixed(1)} XRP` : '—'}
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
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 col-span-2">
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

          {/* Actions — directly under Token ID */}
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
                  className="input-no-spinner w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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

            {canRedeem && !showRedeemConfirm && (
              <button
                onClick={() => setShowRedeemConfirm(true)}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3"
              >
                <Flame className="w-5 h-5" />
                Burn & Redeem {backingXrp.toFixed(1)} XRP
              </button>
            )}

            {showRedeemConfirm && (
              <div className="bg-amber-900/10 border border-amber-800/40 rounded-xl p-5 space-y-4">
                <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Confirm Burn & Redeem
                </p>
                <p className="text-sm text-surface-300">
                  This will <span className="font-bold text-red-400">permanently burn</span> the NFT and release{' '}
                  <span className="font-bold text-white">{backingXrp.toFixed(1)} XRP</span> from escrow to your wallet.
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-surface-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {redeeming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Burning on XRPL...
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        Burn & Redeem
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRedeemConfirm(false)}
                    className="px-6 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm transition-colors"
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

          {/* Game Properties */}
          {hasProperties && (
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-3 font-semibold flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />
                Game / App Properties
              </p>
              <div className="space-y-2">
                {Object.entries(nftProperties).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-surface-800/60 rounded-lg px-3 py-2">
                    <span className="text-sm text-surface-400 font-mono">{key}</span>
                    <span className="text-sm font-medium text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Price History Chart */}
      {chartData.length > 0 && (
        <div className="mt-8">
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
                  contentStyle={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
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
        <div className="mt-8">
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
        <div className="mt-8">
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
