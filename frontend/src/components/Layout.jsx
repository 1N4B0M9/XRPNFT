import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

const isHome = (path) => path === '/';
import {
  Home,
  Plus,
  ShoppingBag,
  Briefcase,
  Search,
  CreditCard,
  LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Create', icon: Plus },
  { path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { path: '/wallet', label: 'Wallet', icon: CreditCard },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { wallet, logout } = useWallet();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(search.trim())}`);
    } else {
      navigate('/marketplace');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - BackedX */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-10 py-3 bg-black/30 backdrop-blur-[20px] border-b border-primary-400/10">
        {/* Logo */}
        <Link to="/" className="text-primary-200 text-2xl font-bold tracking-[-1px] shrink-0">
          BackedX
        </Link>

        {/* Center search bar */}
        <form
          onSubmit={handleSearch}
          className="flex flex-1 items-center max-w-[500px] mx-4 lg:mx-6 bg-white/8 rounded-[20px] pl-4 pr-4 py-2.5 border border-white/10"
        >
          <Search className="w-[18px] h-[18px] text-white/90 shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search marketplace..."
            className="w-full bg-transparent border-0 outline-none text-white text-sm ml-2.5 placeholder:text-white/60"
          />
        </form>

        {/* Right side */}
        <div className="flex items-center shrink-0">
          {wallet ? (
            <>
              {/* Nav icons - only shown when logged in */}
              <nav className="hidden md:flex items-center gap-2 mr-2">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      title={label}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70 focus:outline-none focus:ring-0 ${
                        isActive ? 'text-white' : 'text-white/90'
                      }`}
                    >
                      <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                    </Link>
                  );
                })}
              </nav>
              {/* Mobile nav icons */}
              <nav className="md:hidden flex items-center gap-1 mr-2">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      title={label}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-opacity ${
                        isActive ? 'text-white' : 'text-white/80'
                      }`}
                    >
                      <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                    </Link>
                  );
                })}
              </nav>
              {/* Wallet info */}
              <div className="flex items-center gap-2 border-l border-white/10 pl-2">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-white/50">Balance</p>
                  <p className="text-xs font-semibold text-white">
                    {parseFloat(wallet.balance ?? 0).toFixed(2)} XRP
                  </p>
                </div>
                <div className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-mono text-white/90">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </div>
                <button
                  onClick={logout}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  title="Disconnect"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/wallet"
              className="px-4 py-2 bg-primary-300/15 hover:bg-primary-300/25 rounded-xl text-sm font-medium text-primary-200 transition-colors"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 shrink-0" />

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer (hidden on homepage) */}
      {!isHome(location.pathname) && (
        <footer className="border-t border-surface-800 py-6 text-center text-surface-600 text-xs">
          <p>BackedX &mdash; Built on XRPL Testnet &mdash; Hackathon 2026</p>
        </footer>
      )}
    </div>
  );
}
