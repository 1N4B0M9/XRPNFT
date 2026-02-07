import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import {
  Home,
  Plus,
  ShoppingBag,
  Wallet,
  Briefcase,
  LogOut,
  Zap,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Create', icon: Plus },
  { path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { wallet, logout } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  Digital Asset Tartan
                </span>
                <span className="hidden sm:block text-[10px] text-surface-500 -mt-1">
                  Tokenize Any Asset on XRPL
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Status */}
            <div className="flex items-center gap-3">
              {wallet ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-surface-400">Balance</p>
                    <p className="text-sm font-semibold text-primary-400">
                      {parseFloat(wallet.balance).toFixed(2)} XRP
                    </p>
                  </div>
                  <div className="px-3 py-1.5 bg-surface-800 rounded-lg text-xs font-mono text-surface-300">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-surface-500 hover:text-red-400 transition-colors"
                    title="Disconnect"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/wallet"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Connect Wallet
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-surface-800">
          <div className="flex justify-around py-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${
                    isActive ? 'text-primary-400' : 'text-surface-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800 py-6 text-center text-surface-600 text-xs">
        <p>Digital Asset Tartan &mdash; Built on XRPL Testnet &mdash; Hackathon 2026</p>
      </footer>
    </div>
  );
}
