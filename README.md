# BackedX

**Asset-Backed NFTs on the XRP Ledger**

Transform real-world assets into verifiable, tradeable NFTs backed by XRP escrow. Mint, trade, and redeem with full transparency on XRPL Testnet.

---

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))

### 1. Install Dependencies

```bash
# From project root
npm run install:all
```

### 2. Set Up Database

```bash
# Initialize SQLite schema (creates backend/data.db automatically)
npm run db:init
```

### 3. Configure Environment

The backend `.env` file is pre-configured for local development. Edit `backend/.env` if needed:

```env
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Optionally add Pinata keys for real IPFS pinning (otherwise metadata is mocked):
```env
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret
```

### 4. Start the App

```bash
# Starts both frontend and backend server
npm run dev

# If needed reset database with
npm run db:reset
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

### Key XRPL Operations

- **NFTokenMint** — Mint burnable, transferable NFTs with metadata URI
- **NFTokenCreateOffer** — List NFT for sale at fixed XRP price
- **NFTokenAcceptOffer** — Buyer accepts sell offer (atomic swap)
- **NFTokenBurn** — Destroy NFT on redemption
- **EscrowCreate** — Lock XRP backing in escrow
- **Payment** — Release XRP to redeemer

---

## Tech Stack


| Frontend | React 19, Vite 6, TailwindCSS 4 |
| Backend | Node.js, Express |
| Blockchain | XRPL Testnet (xrpl.js v4) |
| Database | SQLite (better-sqlite3) |
| Icons | Lucide React |

---

## Project Structure

```
DigitalAssetTartan/
├── backend/
│   └── src/
│       ├── server.js          # Express server
│       ├── db/
│       │   ├── pool.js        # SQLite connection (pg-compat wrapper)
│       │   └── init.js        # Schema initialization
│       ├── routes/
│       │   ├── company.js     # Company registration & minting
│       │   ├── marketplace.js # Browse & purchase NFTs
│       │   ├── holder.js      # Portfolio & redemption
│       │   └── wallet.js      # Wallet management
│       └── services/
│           ├── xrpl.js        # XRPL blockchain operations
│           └── ipfs.js        # Metadata pinning (mock/Pinata)
├── frontend/
│   └── src/
│       ├── App.jsx            # Router & providers
│       ├── pages/
│       │   ├── Home.jsx       # Landing page
│       │   ├── CompanyDashboard.jsx
│       │   ├── Marketplace.jsx
│       │   ├── NFTDetail.jsx
│       │   ├── Portfolio.jsx
│       │   └── WalletPage.jsx
│       ├── components/
│       │   ├── Layout.jsx     # Nav, header, footer
│       │   ├── NFTCard.jsx
│       │   ├── StatusBadge.jsx
│       │   └── LoadingSpinner.jsx
│       ├── hooks/
│       │   └── useWallet.jsx  # Wallet context & state
│       └── services/
│           └── api.js         # API client
└── README.md
```

---

## TartanHacks notes

- **Testnet Only** — All XRP operations use the XRPL Testnet faucet
- **Wallet Seeds** — Stored in localStorage for demo convenience (not production-safe)
- **IPFS Mock** — Metadata is simulated unless Pinata keys are provided
- **Escrow Simplified** — Direct payments used as fallback when escrow timing constraints apply
- **No Order Book** — Simple list-and-buy model
