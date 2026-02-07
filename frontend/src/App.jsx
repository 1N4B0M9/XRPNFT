import { Routes, Route, useNavigate } from 'react-router-dom';
import { WalletProvider } from './hooks/useWallet';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import NFTDetail from './pages/NFTDetail';
import Portfolio from './pages/Portfolio';
import WalletPage from './pages/WalletPage';

function AppRoutes() {
  const navigate = useNavigate();
  return (
    <ErrorBoundary onReset={() => navigate('/')}>
      <Layout>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/nft/:id" element={<NFTDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/wallet" element={<WalletPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </WalletProvider>
  );
}
