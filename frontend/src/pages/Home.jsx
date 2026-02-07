import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Shield, ArrowRightLeft, TrendingUp, Plus, ShoppingBag, Briefcase } from 'lucide-react';
import * as api from '../services/api';

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-16 animate-fade-in">
      {/* Hero */}
      <section className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900/30 border border-primary-800 rounded-full text-xs text-primary-400 mb-6">
          <Zap className="w-3 h-3" /> Built on XRPL Testnet
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
            Tokenize Any Asset
          </span>
          <br />
          <span className="text-white">Powered by XRP</span>
        </h1>
        <p className="mt-6 text-lg text-surface-400 max-w-2xl mx-auto leading-relaxed">
          Turn any digital asset into a tradeable NFT on the XRP Ledger.
          Mint, buy, sell, and earn royalty income with full on-chain transparency.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-8 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-primary-600/25"
          >
            Start Creating
          </Link>
          <Link
            to="/marketplace"
            className="px-8 py-3 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl font-semibold transition-all"
          >
            Browse Marketplace
          </Link>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Creators', value: stats.creators, color: 'text-blue-400' },
            { label: 'NFTs Minted', value: stats.nfts, color: 'text-purple-400' },
            { label: 'Transactions', value: stats.transactions, color: 'text-green-400' },
            { label: 'Trade Volume', value: `${stats.totalVolumeXrp?.toFixed(0) || 0} XRP`, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-900 border border-surface-800 rounded-2xl p-6 text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </section>
      )}

      {/* How It Works */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Plus,
              title: 'Create & Mint',
              desc: 'Connect your wallet and tokenize any digital asset as an NFT on XRPL. Set your price and list on the marketplace.',
              color: 'from-blue-600 to-blue-800',
            },
            {
              icon: ShoppingBag,
              title: 'Buy & Sell',
              desc: 'Browse the marketplace and buy digital asset NFTs. XRP goes directly to the seller. Relist at any price.',
              color: 'from-purple-600 to-purple-800',
            },
            {
              icon: ArrowRightLeft,
              title: 'Earn Royalties',
              desc: 'Create royalty pools and distribute income to NFT holders. Transparent, on-chain revenue sharing.',
              color: 'from-green-600 to-green-800',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="bg-surface-900 border border-surface-800 rounded-2xl p-8 text-center hover:border-primary-700/50 transition-colors"
            >
              <div
                className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: 'On-Chain Value', desc: 'Price history stored on XRPL' },
          { icon: Zap, label: 'XRPL Speed', desc: '3-5 second settlement times' },
          { icon: TrendingUp, label: 'Royalty Pools', desc: 'Earn income from creator royalties' },
          { icon: Briefcase, label: 'Free Market', desc: 'Relist at any price you choose' },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-start gap-3 bg-surface-900/50 border border-surface-800/50 rounded-xl p-5"
          >
            <Icon className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-surface-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
