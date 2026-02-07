import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useToast } from '../components/Toast';
import { Wallet, Plus, KeyRound, Copy, Check, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ExplorerLink from '../components/ExplorerLink';

export default function WalletPage() {
  const { wallet, loading, createNewWallet, loginWithSeed, refreshBalance, logout } = useWallet();
  const { toast } = useToast();
  const [seed, setSeed] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState('create');
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      await createNewWallet(displayName || undefined);
      toast({ type: 'success', title: 'Wallet Created!', message: 'Funded with ~100 testnet XRP' });
    } catch (err) {
      toast({ type: 'error', title: 'Wallet Creation Failed', message: err.response?.data?.error || 'Failed to create wallet' });
    }
  };

  const handleImport = async () => {
    if (!seed.trim()) {
      toast({ type: 'error', message: 'Please enter a wallet seed' });
      return;
    }
    try {
      await loginWithSeed(seed.trim());
      toast({ type: 'success', title: 'Wallet Connected!', message: 'Successfully imported wallet' });
    } catch (err) {
      toast({ type: 'error', title: 'Connection Failed', message: err.response?.data?.error || 'Invalid seed or connection error' });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <LoadingSpinner text="Connecting to XRPL Testnet..." />;
  }

  // Connected state
  if (wallet) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Wallet Connected</h2>
              <p className="text-xs text-surface-500">XRPL Testnet</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-surface-500 uppercase tracking-wider">Address</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 bg-surface-800 rounded-lg px-3 py-2">
                  <ExplorerLink type="account" value={wallet.address} truncate={false} />
                </div>
                <button
                  onClick={() => copyToClipboard(wallet.address)}
                  className="p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-surface-500 uppercase tracking-wider">Seed (keep secret!)</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 bg-surface-800 rounded-lg px-3 py-2 text-sm font-mono text-surface-300 break-all">
                  {wallet.seed}
                </code>
                <button
                  onClick={() => copyToClipboard(wallet.seed)}
                  className="p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-amber-500 mt-1">Save this seed! You need it to log back in.</p>
            </div>

            <div className="flex items-center justify-between bg-surface-800 rounded-xl p-4">
              <div>
                <p className="text-xs text-surface-500">Balance</p>
                <p className="text-2xl font-bold text-primary-400">
                  {parseFloat(wallet.balance).toFixed(2)} <span className="text-sm">XRP</span>
                </p>
              </div>
              <button
                onClick={refreshBalance}
                className="p-2 bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate('/marketplace')}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl text-sm font-semibold transition-colors"
            >
              Browse Marketplace
            </button>
            <button
              onClick={logout}
              className="px-6 py-2.5 bg-surface-800 hover:bg-red-900/30 border border-surface-700 hover:border-red-800 rounded-xl text-sm font-semibold transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not connected
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Connect Wallet</h1>
        <p className="text-surface-400 mt-2">Create a new testnet wallet or import an existing one</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mode === 'create' ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          New Wallet
        </button>
        <button
          onClick={() => setMode('import')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mode === 'import' ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
          }`}
        >
          <KeyRound className="w-4 h-4 inline mr-1" />
          Import Seed
        </button>
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-8">
        {mode === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Display Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Alice"
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 rounded-xl font-semibold transition-colors"
            >
              Create Testnet Wallet
            </button>
            <p className="text-xs text-surface-500 text-center">
              Creates a funded wallet on XRPL Testnet (~100 XRP)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Wallet Seed</label>
              <input
                type="password"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="sEdV..."
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 rounded-xl font-semibold transition-colors"
            >
              Connect with Seed
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
