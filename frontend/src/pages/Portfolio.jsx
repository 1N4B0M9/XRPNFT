import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import {
  Briefcase,
  Coins,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import * as api from '../services/api';
import NFTCard from '../components/NFTCard';
import { SkeletonPortfolio } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import ExplorerLink from '../components/ExplorerLink';

export default function Portfolio() {
  const { wallet, refreshBalance } = useWallet();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [royaltyEarnings, setRoyaltyEarnings] = useState({ earnings: [], totalEarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('nfts');

  useEffect(() => {
    if (wallet?.address) {
      loadPortfolio();
      refreshBalance();
    } else {
      setLoading(false);
    }
  }, [wallet?.address]);

  // Always re-fetch when the page is navigated to (e.g. after burn/buy on another page)
  useEffect(() => {
    if (wallet?.address) {
      loadPortfolio();
      refreshBalance();
    }
  }, []); // runs on every mount

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const [portRes, txRes, earningsRes] = await Promise.all([
        api.getPortfolio(wallet.address),
        api.getTransactions(wallet.address),
        api.getRoyaltyEarnings(wallet.address).catch(() => ({ data: { earnings: [], totalEarnings: 0 } })),
      ]);
      setPortfolio(portRes.data);
      setTransactions(txRes.data.transactions);
      setRoyaltyEarnings(earningsRes.data);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="relative text-center py-20 animate-fade-in overflow-hidden rounded-2xl border border-surface-800 bg-surface-900/80">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-600/20">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your Portfolio</h2>
          <p className="text-surface-400 mb-6">Connect a wallet to view your NFT holdings and history</p>
          <button
            onClick={() => navigate('/wallet')}
            className="px-8 py-3.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 rounded-xl font-semibold transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="animate-fade-in"><SkeletonPortfolio /></div>;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary-400" />
            Portfolio
          </h1>
          <div className="mt-1">
            <ExplorerLink type="account" value={wallet.address} />
          </div>
        </div>
        <button
          onClick={loadPortfolio}
          className="p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'XRP Balance', value: `${parseFloat(wallet?.balance ?? portfolio?.xrpBalance ?? 0).toFixed(2)} XRP`, icon: Wallet, color: 'text-blue-400', iconBg: 'bg-blue-500/15', border: 'border-blue-800/40' },
          { label: 'NFTs Held', value: portfolio?.stats?.totalNFTs || 0, icon: Briefcase, color: 'text-purple-400', iconBg: 'bg-purple-500/15', border: 'border-purple-800/40' },
          { label: 'Portfolio Value', value: `${(portfolio?.stats?.totalPortfolioValue || 0).toFixed(1)} XRP`, icon: TrendingUp, color: 'text-green-400', iconBg: 'bg-green-500/15', border: 'border-green-800/40' },
          { label: 'Royalty Earnings', value: `${(royaltyEarnings.totalEarnings || 0).toFixed(2)} XRP`, icon: DollarSign, color: 'text-amber-400', iconBg: 'bg-amber-500/15', border: 'border-amber-800/40' },
        ].map(({ label, value, icon: Icon, color, iconBg, border }) => (
          <div key={label} className={`bg-surface-900 border ${border} rounded-lg p-5 transition-colors hover:bg-surface-900/90`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-xs text-surface-500 uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-surface-900 border border-surface-700 rounded-lg p-1 flex gap-1 w-fit">
        {['nfts', 'transactions', 'royalty earnings'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/40'
                : 'text-surface-500 hover:text-white hover:bg-surface-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'nfts' && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden border-t-4 border-t-primary-500/60">
          <div className="p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full bg-primary-500" />
              Your NFTs
            </h2>
            {portfolio?.nfts?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {portfolio.nfts.map((nft) => (
                  <NFTCard key={nft.id} nft={nft} showRelist />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-lg bg-surface-800/30 border border-surface-700/50">
                <Coins className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                <p className="text-surface-400">No NFTs in your portfolio</p>
                <button
                  type="button"
                  onClick={() => navigate('/marketplace')}
                  className="mt-3 text-primary-400 hover:underline text-sm"
                >
                  Browse Marketplace
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden border-t-4 border-t-blue-500/60">
          <div className="p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full bg-blue-500" />
              Transaction History
            </h2>
            {transactions.length > 0 ? (
              <div className="rounded-lg overflow-hidden border border-surface-700">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider">Asset</th>
                    <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider hidden sm:table-cell">TX Hash</th>
                    <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-surface-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-surface-800/50 hover:bg-surface-800/50">
                      <td className="px-4 py-3 text-sm font-medium capitalize">{tx.tx_type}</td>
                      <td className="px-4 py-3 text-sm text-surface-400">{tx.asset_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {tx.amount_xrp ? `${parseFloat(tx.amount_xrp).toFixed(1)} XRP` : '-'}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <ExplorerLink type="tx" value={tx.tx_hash} />
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 py-3 text-xs text-surface-500 hidden md:table-cell">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <div className="text-center py-12 rounded-lg bg-surface-800/30 border border-surface-700/50">
                <p className="text-surface-500">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'royalty earnings' && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden border-t-4 border-t-amber-500/60">
          <div className="p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full bg-amber-500" />
              Royalty Earnings
            </h2>
            {royaltyEarnings.earnings.length > 0 ? (
            <div className="space-y-3">
              {royaltyEarnings.earnings.map((e) => (
                <div key={e.id} className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 flex items-center justify-between hover:bg-surface-800/70 transition-colors">
                  <div>
                    <p className="font-medium">{e.asset_name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-surface-500">{e.pool_name}</span>
                      {e.tx_hash && <ExplorerLink type="tx" value={e.tx_hash} />}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-400">
                      +{parseFloat(e.amount_xrp).toFixed(4)} XRP
                    </p>
                    <p className="text-xs text-surface-500">
                      {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            ) : (
            <div className="text-center py-12 rounded-lg bg-surface-800/30 border border-surface-700/50">
              <DollarSign className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400">No royalty earnings yet</p>
              <p className="text-surface-500 text-sm mt-2">
                Buy royalty NFTs to earn income when creators distribute royalties
              </p>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
