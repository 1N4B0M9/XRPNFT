import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

const isHome = (path) => path === '/';
import {
  Home,
  Plus,
  ShoppingBag,
  Briefcase,
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
  const { wallet, logout } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - BackedX */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-10 py-3 bg-black/30 backdrop-blur-[20px] border-b border-primary-400/10">
        {/* Logo */}
        <Link to="/" className="text-primary-200 text-2xl font-bold tracking-[-1px] shrink-0">
          BackedX
        </Link>

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
              {/* Logout */}
              <div className="flex items-center border-l border-white/10 pl-2">
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
