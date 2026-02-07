import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Plus,
  Coins,
  Package,
  RefreshCw,
  ChevronRight,
  Music,
  Send,
  Minus,
  Gamepad2,
  Palette,
  Diamond,
  Sparkles,
  Info,
  Upload,
  X,
  Settings2,
  Lock,
  Shield,
} from 'lucide-react';
import * as api from '../services/api';
import { useToast } from '../components/Toast';
import NFTCard from '../components/NFTCard';
import NFTVisual from '../components/NFTVisual';
import StepIndicator from '../components/StepIndicator';

const WIZARD_STEPS = [
  { id: 'mint', label: 'Mint NFTs', icon: Plus },
  { id: 'royalty', label: 'Royalty Pools', icon: Music },
  { id: 'distribute', label: 'Distribute', icon: Send },
];

const ASSET_TYPES = [
  { value: 'digital_asset', label: 'Digital Asset', icon: Package, color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/40' },
  { value: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/40' },
  { value: 'art', label: 'Art', icon: Palette, color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800/40' },
  { value: 'music', label: 'Music', icon: Music, color: 'text-pink-400', bg: 'bg-pink-900/30 border-pink-800/40' },
  { value: 'collectible', label: 'Collectible', icon: Diamond, color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800/40' },
  { value: 'other', label: 'Other', icon: Sparkles, color: 'text-surface-400', bg: 'bg-surface-800 border-surface-700' },
];

export default function Dashboard() {
  const { wallet, refreshBalance } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Minting form
  const [mintForm, setMintForm] = useState({
    assetName: '',
    assetDescription: '',
    assetType: 'digital_asset',
    listPriceXrp: '50',
    backingXrp: '1',
    quantity: 1,
  });

  // File upload
  const [mintFile, setMintFile] = useState(null);
  const [mintFilePreview, setMintFilePreview] = useState(null);

  // Properties (key-value pairs for game integration)
  const [mintProperties, setMintProperties] = useState([{ key: '', value: '' }]);

  // Royalty pool form
  const [royaltyForm, setRoyaltyForm] = useState({
    name: '',
    description: '',
    totalNfts: '10',
    royaltyPerNft: '1',
    listPriceXrp: '10',
  });

  // Distribute form
  const [distributePoolId, setDistributePoolId] = useState('');
  const [distributeAmount, setDistributeAmount] = useState('');
  const [showDistributeConfirm, setShowDistributeConfirm] = useState(false);

  // State
  const [myNFTs, setMyNFTs] = useState([]);
  const [royaltyPools, setRoyaltyPools] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [creatingPool, setCreatingPool] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Validation
  const [mintErrors, setMintErrors] = useState({});

  useEffect(() => {
    if (wallet?.address) loadCreatorData();
  }, [wallet?.address]);

  const loadCreatorData = async () => {
    if (!wallet?.address) return;
    setLoading(true);
    try {
      const [nftRes, poolsRes, balRes] = await Promise.all([
        api.getCreatorNFTs(wallet.address),
        api.getRoyaltyPools(),
        api.getBalance(wallet.address),
      ]);
      setMyNFTs(Array.isArray(nftRes.data?.nfts) ? nftRes.data.nfts : []);
      const pools = Array.isArray(poolsRes.data?.pools) ? poolsRes.data.pools : [];
      setRoyaltyPools(pools.filter((p) => p.creator_address === wallet.address));
      setBalance(balRes.data.balance);
    } catch (err) {
      console.error('Failed to load creator data:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateMint = () => {
    const errors = {};
    if (!mintForm.assetName.trim()) errors.assetName = 'Asset name is required';
    if (mintForm.assetName.length > 100) errors.assetName = 'Name must be under 100 characters';
    if (!mintForm.listPriceXrp || parseFloat(mintForm.listPriceXrp) <= 0) errors.listPriceXrp = 'Price must be greater than 0';
    if (mintForm.backingXrp && parseFloat(mintForm.backingXrp) < 0) errors.backingXrp = 'Backing cannot be negative';
    if (mintForm.backingXrp && parseFloat(mintForm.backingXrp) >= parseFloat(mintForm.listPriceXrp)) errors.backingXrp = 'Backing must be less than list price';
    if (mintForm.quantity < 1 || mintForm.quantity > 20) errors.quantity = 'Quantity must be 1-20';
    setMintErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMintFile(file);
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setMintFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setMintFilePreview(null);
    }
  };

  const clearFile = () => {
    setMintFile(null);
    setMintFilePreview(null);
  };

  const addProperty = () => {
    setMintProperties([...mintProperties, { key: '', value: '' }]);
  };

  const removeProperty = (idx) => {
    setMintProperties(mintProperties.filter((_, i) => i !== idx));
  };

  const updateProperty = (idx, field, val) => {
    const updated = [...mintProperties];
    updated[idx] = { ...updated[idx], [field]: val };
    setMintProperties(updated);
  };

 const handleMint = async () => {
  if (!validateMint()) return;  // from ui-changes
  setMinting(true);
  try {
    // Build properties (from main)
    const propsObj = {};
    for (const { key, value } of mintProperties) {
      if (key.trim()) propsObj[key.trim()] = value.trim();
    }

    // Use FormData to support file uploads (from main)
    const formData = new FormData();
    formData.append('walletAddress', wallet.address);
    formData.append('assetName', mintForm.assetName);
    formData.append('assetDescription', mintForm.assetDescription || 'Digital asset NFT');
    formData.append('assetType', mintForm.assetType);
    formData.append('listPriceXrp', mintForm.listPriceXrp);
    formData.append('backingXrp', mintForm.backingXrp || '0');
    formData.append('quantity', mintForm.quantity);
    if (Object.keys(propsObj).length > 0) {
      formData.append('properties', JSON.stringify(propsObj));
    }
    if (mintFile) {
      formData.append('file', mintFile);
    }

    const { data } = await api.mintNFTs(formData);
    toast({ type: 'success', title: 'NFTs Minted!', message: data.message });  // ui-changes toast
    setMintForm({ assetName: '', assetDescription: '', assetType: 'digital_asset', listPriceXrp: '50', backingXrp: '1', quantity: 1 });
    clearFile();                              // from main
    setMintProperties([{ key: '', value: '' }]); // from main
    loadCreatorData();
    refreshBalance();
  } catch (err) {
    toast({ type: 'error', title: 'Minting Failed', message: err.response?.data?.error || 'Minting failed' });
  } finally {
    setMinting(false);
  }
};

  const handleCreateRoyaltyPool = async () => {
    if (!royaltyForm.name.trim()) {
      toast({ type: 'error', message: 'Pool name is required' });
      return;
    }
    setCreatingPool(true);
    try {
      const { data } = await api.createRoyaltyPool({
        walletAddress: wallet.address,
        name: royaltyForm.name,
        description: royaltyForm.description,
        totalNfts: parseInt(royaltyForm.totalNfts),
        royaltyPerNft: parseFloat(royaltyForm.royaltyPerNft),
        listPriceXrp: parseFloat(royaltyForm.listPriceXrp),
      });
      toast({ type: 'success', title: 'Royalty Pool Created!', message: data.message });
      setRoyaltyForm({ name: '', description: '', totalNfts: '10', royaltyPerNft: '1', listPriceXrp: '10' });
      loadCreatorData();
      refreshBalance();
    } catch (err) {
      toast({ type: 'error', title: 'Pool Creation Failed', message: err.response?.data?.error || 'Failed to create royalty pool' });
    } finally {
      setCreatingPool(false);
    }
  };

  const handleDistribute = async () => {
    if (!distributePoolId || !distributeAmount) {
      toast({ type: 'error', message: 'Select a pool and enter an amount' });
      return;
    }
    setDistributing(true);
    try {
      const { data } = await api.distributeRoyalty(
        distributePoolId,
        parseFloat(distributeAmount),
        wallet.address
      );
      toast({ type: 'success', title: 'Distribution Complete!', message: data.message });
      setDistributeAmount('');
      setShowDistributeConfirm(false);
      loadCreatorData();
      refreshBalance();
    } catch (err) {
      toast({ type: 'error', title: 'Distribution Failed', message: err.response?.data?.error || 'Distribution failed' });
    } finally {
      setDistributing(false);
    }
  };

  // Create a preview NFT object for the live preview card
  const previewNFT = {
    id: 'preview-' + mintForm.assetType + mintForm.assetName,
    asset_name: mintForm.assetName || 'Your Asset Name',
    asset_type: mintForm.assetType,
    list_price_xrp: mintForm.listPriceXrp || 0,
    backing_xrp: mintForm.backingXrp || 0,
    status: 'listed',
    sale_count: 0,
    last_sale_price_xrp: 0,
    creator_name: 'You',
  };

  if (!wallet) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Creator Dashboard</h2>
        <p className="text-surface-400 mb-6 max-w-md mx-auto">
          Connect a wallet to start minting NFTs on XRPL and creating royalty pools
        </p>
        <button
          onClick={() => navigate('/wallet')}
          className="px-8 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-colors active:scale-[0.98]"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary-400" />
            Creator Dashboard
          </h1>
          <p className="text-surface-400 mt-1 font-mono text-sm">
            {wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}
          </p>
        </div>
        <button
          onClick={loadCreatorData}
          className="p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors self-start"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Wallet Balance', value: `${parseFloat(balance || wallet.balance || 0).toFixed(1)} XRP`, icon: Coins, color: 'text-blue-400' },
          { label: 'NFTs Created', value: myNFTs.length, icon: Package, color: 'text-purple-400' },
          { label: 'Listed', value: myNFTs.filter((n) => n.status === 'listed').length, icon: ChevronRight, color: 'text-amber-400' },
          { label: 'Royalty Pools', value: royaltyPools.length, icon: Music, color: 'text-green-400' },
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

      {/* Step Indicator */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <StepIndicator
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
      </div>

      {/* ── Step 0: Mint NFTs ─────────────────────────────────────────── */}
      {currentStep === 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form (2 cols) */}
          <div className="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-primary-400" />
              Mint New NFTs
            </h2>

            <div className="space-y-5">
              {/* Asset Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Asset Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={mintForm.assetName}
                  onChange={(e) => {
                    setMintForm({ ...mintForm, assetName: e.target.value });
                    if (mintErrors.assetName) setMintErrors({ ...mintErrors, assetName: null });
                  }}
                  placeholder="e.g., Cosmic Blade, Beat Drop #1"
                  maxLength={100}
                  className={`w-full bg-surface-800 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    mintErrors.assetName ? 'border-red-600' : 'border-surface-700'
                  }`}
                />
                <div className="flex items-center justify-between mt-1.5">
                  {mintErrors.assetName ? (
                    <p className="text-xs text-red-400">{mintErrors.assetName}</p>
                  ) : (
                    <p className="text-xs text-surface-600">This appears on the marketplace listing</p>
                  )}
                  <p className="text-xs text-surface-600">{mintForm.assetName.length}/100</p>
                </div>
              </div>

              {/* Asset Type - Visual Cards */}
              <div>
                <label className="block text-sm font-medium mb-3">Asset Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ASSET_TYPES.map(({ value, label, icon: Icon, color, bg }) => (
                    <button
                      key={value}
                      onClick={() => setMintForm({ ...mintForm, assetType: value })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        mintForm.assetType === value
                          ? 'ring-2 ring-primary-500 bg-primary-900/20 border-primary-700'
                          : `${bg} hover:bg-surface-800`
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${mintForm.assetType === value ? 'text-primary-400' : color}`} />
                      <span className="text-[11px] font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={mintForm.assetDescription}
                  onChange={(e) => setMintForm({ ...mintForm, assetDescription: e.target.value })}
                  placeholder="Describe what makes this asset unique..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <p className="text-xs text-surface-600 mt-1.5">{mintForm.assetDescription.length}/500</p>
              </div>

              {/* Price + Quantity Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    List Price <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={mintForm.listPriceXrp}
                      onChange={(e) => {
                        setMintForm({ ...mintForm, listPriceXrp: e.target.value });
                        if (mintErrors.listPriceXrp) setMintErrors({ ...mintErrors, listPriceXrp: null });
                      }}
                      min="0.01"
                      step="0.1"
                      className={`input-no-spinner w-full bg-surface-800 border rounded-xl px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        mintErrors.listPriceXrp ? 'border-red-600' : 'border-surface-700'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-surface-500 font-semibold">
                      XRP
                    </span>
                  </div>
                  {mintErrors.listPriceXrp && (
                    <p className="text-xs text-red-400 mt-1.5">{mintErrors.listPriceXrp}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMintForm({ ...mintForm, quantity: Math.max(1, mintForm.quantity - 1) })}
                      className="p-3 bg-surface-800 border border-surface-700 rounded-xl hover:bg-surface-700 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-center text-sm font-bold">
                      {mintForm.quantity}
                    </div>
                    <button
                      onClick={() => setMintForm({ ...mintForm, quantity: Math.min(20, mintForm.quantity + 1) })}
                      className="p-3 bg-surface-800 border border-surface-700 rounded-xl hover:bg-surface-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {mintErrors.quantity && (
                    <p className="text-xs text-red-400 mt-1.5">{mintErrors.quantity}</p>
                  )}
                </div>
              </div>
              {/* XRP Backing (Escrow Floor) */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  XRP Backing (Floor Value)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={mintForm.backingXrp}
                    onChange={(e) => {
                      setMintForm({ ...mintForm, backingXrp: e.target.value });
                      if (mintErrors.backingXrp) setMintErrors({ ...mintErrors, backingXrp: null });
                    }}
                    min="0"
                    step="0.1"
                    className={`input-no-spinner w-full bg-surface-800 border rounded-xl px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      mintErrors.backingXrp ? 'border-red-600' : 'border-surface-700'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-surface-500 font-semibold">
                    XRP
                  </span>
                </div>
                {mintErrors.backingXrp ? (
                  <p className="text-xs text-red-400 mt-1.5">{mintErrors.backingXrp}</p>
                ) : (
                  <p className="text-xs text-surface-600 mt-1.5">
                    <Lock className="w-3 h-3 inline mr-0.5" />
                    Locked in XRPL escrow — redeemable by burning the NFT. Set to 0 for no backing.
                  </p>
                )}
                {parseFloat(mintForm.backingXrp) > 0 && (
                  <div className="mt-2 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-400">
                      <strong>Total escrow cost:</strong> {(parseFloat(mintForm.backingXrp || 0) * mintForm.quantity).toFixed(1)} XRP
                      ({mintForm.quantity} NFT{mintForm.quantity > 1 ? 's' : ''} x {parseFloat(mintForm.backingXrp || 0).toFixed(1)} XRP each)
                    </p>
                  </div>
                )}
              </div>

            {/* ── File Upload ── */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                Upload Content (image, 3D model, texture, etc.)
              </label>
              {!mintFile ? (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-surface-700 rounded-xl cursor-pointer hover:border-primary-500 transition-colors bg-surface-800/50">
                  <Upload className="w-8 h-8 text-surface-500 mb-2" />
                  <span className="text-sm text-surface-400">Click or drag to upload</span>
                  <span className="text-xs text-surface-600 mt-1">PNG, JPG, WEBP, GLB, MP3, etc. (max 25 MB)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.glb,.gltf,.fbx,.obj,.mp3,.wav,.mp4"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-4 bg-surface-800 rounded-xl p-4">
                  {mintFilePreview ? (
                    <img src={mintFilePreview} alt="preview" className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 bg-surface-700 rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-surface-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mintFile.name}</p>
                    <p className="text-xs text-surface-500">{(mintFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={clearFile} className="p-1.5 text-surface-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Properties (Game Integration) ── */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Settings2 className="w-4 h-4 inline mr-1" />
                Properties (for game/app integration)
              </label>
              <p className="text-xs text-surface-500 mb-3">
                Add key-value pairs that games can read from the blockchain (e.g., skin_id = warrior_gold)
              </p>
              <div className="space-y-2">
                {mintProperties.map((prop, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={prop.key}
                      onChange={(e) => updateProperty(idx, 'key', e.target.value)}
                      placeholder="Key (e.g., skin_id)"
                      className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={prop.value}
                      onChange={(e) => updateProperty(idx, 'value', e.target.value)}
                      placeholder="Value (e.g., warrior_gold)"
                      className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {mintProperties.length > 1 && (
                      <button
                        onClick={() => removeProperty(idx)}
                        className="p-2 text-surface-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addProperty}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Add Property
                </button>
              </div>
            </div>

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={minting}
                className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 disabled:from-surface-700 disabled:to-surface-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {minting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Minting on XRPL...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    Mint {mintForm.quantity > 1 ? `${mintForm.quantity} NFTs` : 'NFT'}
                    {parseFloat(mintForm.backingXrp) > 0
                      ? ` — ${parseFloat(mintForm.backingXrp || 0).toFixed(1)} XRP backed`
                      : ` for ${parseFloat(mintForm.listPriceXrp || 0).toFixed(1)} XRP each`}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Preview (1 col) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold mb-3">Live Preview</p>
              <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
                <div className="aspect-square relative">
                  <NFTVisual nft={previewNFT} size="card" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate">
                    {mintForm.assetName || 'Your Asset Name'}
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">by You</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase tracking-wider">Price</p>
                      <p className="text-sm font-bold text-green-400">
                        {parseFloat(mintForm.listPriceXrp || 0).toFixed(1)} XRP
                      </p>
                    </div>
                    {parseFloat(mintForm.backingXrp) > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-surface-500 uppercase tracking-wider flex items-center gap-0.5 justify-end">
                          <Lock className="w-2.5 h-2.5" /> Floor
                        </p>
                        <p className="text-sm font-bold text-amber-400">
                          {parseFloat(mintForm.backingXrp || 0).toFixed(1)} XRP
                        </p>
                      </div>
                    )}
                  </div>
                  {mintForm.quantity > 1 && (
                    <div className="mt-2 text-center">
                      <p className="text-[10px] text-surface-500 uppercase tracking-wider">Quantity</p>
                      <p className="text-sm font-bold text-blue-400">x{mintForm.quantity}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Royalty Pools ────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
            <Music className="w-5 h-5 text-purple-400" />
            Create Royalty Pool
          </h2>

          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-purple-900/10 border border-purple-800/30 rounded-xl p-4 mb-6">
            <Info className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
            <div className="text-sm text-surface-300">
              <p className="font-medium text-purple-400 mb-1">How Royalty Pools Work</p>
              <p>Create a pool of NFTs that each represent a percentage of your income. When you distribute XRP, it is sent proportionally to all NFT holders.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">Pool Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={royaltyForm.name}
                onChange={(e) => setRoyaltyForm({ ...royaltyForm, name: e.target.value })}
                placeholder="e.g., Song X Royalties, Album Revenue"
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-surface-600 mt-1.5">Displayed on the marketplace alongside each royalty NFT</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={royaltyForm.description}
                onChange={(e) => setRoyaltyForm({ ...royaltyForm, description: e.target.value })}
                placeholder="Describe the royalty stream..."
                rows={2}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of NFTs</label>
              <input
                type="number"
                min="1"
                max="100"
                value={royaltyForm.totalNfts}
                onChange={(e) => setRoyaltyForm({ ...royaltyForm, totalNfts: e.target.value })}
                className="input-no-spinner w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Royalty % Per NFT</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={royaltyForm.royaltyPerNft}
                onChange={(e) => setRoyaltyForm({ ...royaltyForm, royaltyPerNft: e.target.value })}
                className="input-no-spinner w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">List Price per NFT</label>
              <div className="relative">
                <input
                  type="number"
                  value={royaltyForm.listPriceXrp}
                  onChange={(e) => setRoyaltyForm({ ...royaltyForm, listPriceXrp: e.target.value })}
                  className="input-no-spinner w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-surface-500 font-semibold">XRP</span>
              </div>
            </div>

            {/* Visual Summary */}
            <div className="flex items-end">
              <div className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-4 w-full text-center">
                <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Total Royalty</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">
                  {(parseFloat(royaltyForm.royaltyPerNft || 0) * parseInt(royaltyForm.totalNfts || 0)).toFixed(1)}%
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  {royaltyForm.totalNfts} NFTs x {royaltyForm.royaltyPerNft}% each
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateRoyaltyPool}
            disabled={creatingPool}
            className="mt-6 w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-surface-700 disabled:to-surface-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {creatingPool ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating Pool & Minting NFTs...
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                Create Pool & Mint {royaltyForm.totalNfts} NFTs
              </>
            )}
          </button>

          {/* Existing Pools */}
          {Array.isArray(royaltyPools) && royaltyPools.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-lg font-semibold">Your Royalty Pools</h3>
              {royaltyPools.map((pool, idx) => (
                <div key={pool?.id ?? idx} className="bg-surface-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{pool?.name ?? 'Unnamed'}</p>
                    <p className="text-xs text-surface-500 mt-1">
                      {pool?.total_nfts ?? 0} NFTs @ {pool?.royalty_per_nft ?? 0}% each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">
                      {parseFloat(pool?.total_distributed_xrp ?? 0).toFixed(2)} XRP
                    </p>
                    <p className="text-xs text-surface-500">distributed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Distribute Income ───────────────────────────────── */}
      {currentStep === 2 && (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
            <Send className="w-5 h-5 text-green-400" />
            Distribute Royalty Income
          </h2>
          <p className="text-surface-400 text-sm mb-6">
            Send XRP to all current holders of a royalty pool, proportionally based on their ownership.
          </p>

          {(royaltyPools || []).length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400">No royalty pools yet</p>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="mt-3 text-primary-400 hover:underline text-sm"
              >
                Create a Royalty Pool first
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pool Selection as Cards */}
              <div>
                <label className="block text-sm font-medium mb-3">Select Pool</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(royaltyPools || []).map((pool, idx) => {
                    const poolId = pool?.id != null ? pool.id : '';
                    return (
                      <button
                        key={pool?.id ?? idx}
                        type="button"
                        onClick={() => setDistributePoolId(poolId)}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          distributePoolId === poolId
                            ? 'bg-green-900/20 border-green-700 ring-2 ring-green-600/30'
                            : 'bg-surface-800 border-surface-700 hover:border-surface-600'
                        }`}
                      >
                        <p className="font-medium">{pool?.name ?? 'Unnamed'}</p>
                        <p className="text-xs text-surface-500 mt-1">
                          {pool?.total_nfts ?? 0} NFTs &middot; {parseFloat(pool?.total_distributed_xrp ?? 0).toFixed(2)} XRP distributed
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amount to Distribute</label>
                <div className="relative">
                  <input
                    type="number"
                    value={distributeAmount}
                    onChange={(e) => setDistributeAmount(e.target.value)}
                    placeholder="e.g., 50"
                    min="0.01"
                    step="0.01"
                    className="input-no-spinner w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-surface-500 font-semibold">XRP</span>
                </div>
                {distributeAmount && distributePoolId && (
                  <p className="text-xs text-surface-500 mt-1.5">
                    Each holder receives proportional share based on NFTs owned
                  </p>
                )}
              </div>

              {!showDistributeConfirm ? (
                <button
                  onClick={() => {
                    if (!distributePoolId || !distributeAmount) {
                      toast({ type: 'error', message: 'Select a pool and enter an amount' });
                      return;
                    }
                    setShowDistributeConfirm(true);
                  }}
                  disabled={!distributePoolId || !distributeAmount}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-surface-700 disabled:to-surface-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  Review Distribution
                </button>
              ) : (
                <div className="bg-green-900/10 border border-green-800/40 rounded-xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-green-400">Confirm Distribution</p>
                  <p className="text-sm text-surface-300">
                    You are about to distribute <span className="font-bold text-white">{distributeAmount} XRP</span> to
                    holders of <span className="font-bold text-white">{(Array.isArray(royaltyPools) && royaltyPools.find(p => p?.id === distributePoolId))?.name ?? 'this pool'}</span>.
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDistribute}
                      disabled={distributing}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-surface-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {distributing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Confirm & Send
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowDistributeConfirm(false)}
                      className="px-6 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* My NFTs */}
      {myNFTs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Your NFTs ({myNFTs.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myNFTs.map((nft) => (
              <NFTCard key={nft.id} nft={{ ...nft, creator_name: 'You' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
