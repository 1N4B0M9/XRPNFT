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
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import ExplorerLink from '../components/ExplorerLink';

export default function Portfolio() {
  const { wallet } = useWallet();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [royaltyEarnings, setRoyaltyEarnings] = useState({ earnings: [], totalEarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('nfts');

  useEffect(() => {
    if (wallet?.address) loadPortfolio();
    else setLoading(false);
  }, [wallet?.address]);

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
      <div className="text-center py-16 animate-fade-in">
        <Briefcase className="w-16 h-16 text-surface-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your Portfolio</h2>
        <p className="text-surface-400 mb-6">Connect a wallet to view your NFT holdings and history</p>
        <button
          onClick={() => navigate('/wallet')}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading portfolio..." />;

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
          {
            label: 'XRP Balance',
            value: `${parseFloat(portfolio?.xrpBalance || 0).toFixed(2)} XRP`,
            icon: Wallet,
            color: 'text-blue-400',
          },
          {
            label: 'NFTs Held',
            value: portfolio?.stats?.totalNFTs || 0,
            icon: Briefcase,
            color: 'text-purple-400',
          },
          {
            label: 'Portfolio Value',
            value: `${(portfolio?.stats?.totalPortfolioValue || 0).toFixed(1)} XRP`,
            icon: TrendingUp,
            color: 'text-green-400',
          },
          {
            label: 'Royalty Earnings',
            value: `${(royaltyEarnings.totalEarnings || 0).toFixed(2)} XRP`,
            icon: DollarSign,
            color: 'text-amber-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-surface-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-800">
        {['nfts', 'transactions', 'royalty earnings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'nfts' && (
        <div>
          {portfolio?.nfts?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolio.nfts.map((nft) => (
                <NFTCard key={nft.id} nft={nft} showRelist />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Coins className="w-12 h-12 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400">No NFTs in your portfolio</p>
              <button
                onClick={() => navigate('/marketplace')}
                className="mt-3 text-primary-400 hover:underline text-sm"
              >
                Browse Marketplace
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          {transactions.length > 0 ? (
            <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
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
            <p className="text-center py-12 text-surface-500">No transactions yet</p>
          )}
        </div>
      )}

      {activeTab === 'royalty earnings' && (
        <div>
          {royaltyEarnings.earnings.length > 0 ? (
            <div className="space-y-3">
              {royaltyEarnings.earnings.map((e) => (
                <div key={e.id} className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.asset_name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-surface-500">Burn TX:</span>
                      <ExplorerLink type="tx" value={r.burn_tx_hash} />
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
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400">No royalty earnings yet</p>
              <p className="text-surface-500 text-sm mt-2">
                Buy royalty NFTs to earn income when creators distribute royalties
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
