import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // XRPL operations can be slow
});

// ─── Company ─────────────────────────────────────────────────────
export const registerCompany = (name, description) =>
  api.post('/company/register', { name, description });

export const getCompany = (id) =>
  api.get(`/company/${id}`);

export const getCompanies = () =>
  api.get('/company');

export const mintNFTs = (companyId, data) =>
  api.post(`/company/${companyId}/mint`, data);

export const getCompanyNFTs = (companyId) =>
  api.get(`/company/${companyId}/nfts`);

export const updateVerification = (companyId, tier) =>
  api.patch(`/company/${companyId}/verify`, { tier });

// ─── Marketplace ─────────────────────────────────────────────────
export const getMarketplaceNFTs = (params) =>
  api.get('/marketplace', { params });

export const getNFTDetail = (id) =>
  api.get(`/marketplace/${id}`);

export const purchaseNFT = (nftId, buyerWalletAddress, buyerWalletSeed) =>
  api.post(`/marketplace/${nftId}/buy`, { buyerWalletAddress, buyerWalletSeed });

export const relistNFT = (nftId, ownerWalletAddress, ownerWalletSeed, listPriceXrp) =>
  api.post(`/marketplace/${nftId}/relist`, { ownerWalletAddress, ownerWalletSeed, listPriceXrp });

export const getNFTPriceHistory = (nftId) =>
  api.get(`/marketplace/${nftId}/price-history`);

// ─── Holder / Portfolio ──────────────────────────────────────────
export const getPortfolio = (address) =>
  api.get(`/holder/${address}/portfolio`);

export const getTransactions = (address) =>
  api.get(`/holder/${address}/transactions`);

export const getRoyaltyEarnings = (address) =>
  api.get(`/holder/${address}/royalty-earnings`);

// ─── Royalty ─────────────────────────────────────────────────────
export const createRoyaltyPool = (companyId, data) =>
  api.post(`/royalty/company/${companyId}/pool`, data);

export const getRoyaltyPools = () =>
  api.get('/royalty/pools');

export const getRoyaltyPool = (poolId) =>
  api.get(`/royalty/pool/${poolId}`);

export const distributeRoyalty = (poolId, amountXrp, companySeed) =>
  api.post(`/royalty/pool/${poolId}/distribute`, { amountXrp, companySeed });

// ─── Wallet ──────────────────────────────────────────────────────
export const createWallet = (displayName) =>
  api.post('/wallet/create', { displayName });

export const getBalance = (address) =>
  api.get(`/wallet/balance/${address}`);

export const loginWithSeed = (seed) =>
  api.post('/wallet/login', { seed });

// ─── Stats ───────────────────────────────────────────────────────
export const getStats = () =>
  api.get('/stats');

export default api;
