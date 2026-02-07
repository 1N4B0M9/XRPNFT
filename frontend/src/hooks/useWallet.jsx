import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as api from '../services/api';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('dat_wallet');
    return saved ? JSON.parse(saved) : null;
  });
  const walletRef = useRef(wallet);
  const [company, setCompanyState] = useState(() => {
    const saved = localStorage.getItem('dat_company');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const saveWallet = (w) => {
    setWallet(w);
    if (w) localStorage.setItem('dat_wallet', JSON.stringify(w));
    else localStorage.removeItem('dat_wallet');
  };

  const setCompany = useCallback((c) => {
    setCompanyState(c);
    if (c) localStorage.setItem('dat_company', JSON.stringify(c));
    else localStorage.removeItem('dat_company');
  }, []);

  const createNewWallet = useCallback(async (displayName) => {
    setLoading(true);
    try {
      const { data } = await api.createWallet(displayName);
      saveWallet({ address: data.address, seed: data.seed, balance: data.balance });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithSeed = useCallback(async (seed) => {
    setLoading(true);
    try {
      const { data } = await api.loginWithSeed(seed);
      saveWallet({ address: data.address, seed, balance: data.balance });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep walletRef in sync so refreshBalance always reads latest wallet
  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  const refreshBalance = useCallback(async () => {
    const current = walletRef.current;
    if (!current?.address) return;
    try {
      const { data } = await api.getBalance(current.address);
      const updated = { ...current, balance: data.balance };
      setWallet(updated);
      localStorage.setItem('dat_wallet', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, []);

  // Auto-refresh balance on mount (when restoring from localStorage) and on window focus
  useEffect(() => {
    if (!wallet?.address) return;

    // Refresh immediately on mount
    refreshBalance();

    // Refresh when user returns to the tab
    const handleFocus = () => refreshBalance();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [wallet?.address]); // only re-run if the address itself changes

  const logout = useCallback(() => {
    saveWallet(null);
    setCompany(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        company,
        setCompany,
        loading,
        createNewWallet,
        loginWithSeed,
        refreshBalance,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
