# Database reset to escrow version

## One-command reset (from repo root)

```bash
npm run db:reset
```

This deletes `backend/data.db`, `data.db-wal`, `data.db-shm`, then runs the initial schema and migrations (including escrow columns).

**If you get "database is locked":** stop the backend (port 3001), then run again.

- **Windows:** `netstat -ano | findstr :3001` then `taskkill /PID <pid> /F`
- **macOS/Linux:** `lsof -i :3001` then `kill <pid>`

---

## Manual steps

From project root:

```bash
cd backend
node scripts/reset-db.js
npm run db:init
```

Or from repo root: `npm run db:init` only reinitializes schema (does **not** delete the DB). Use `npm run db:reset` to delete and reinit.

---

## Schema and migrations (escrow version)

The init script creates the schema below and then runs the migrations. Escrow-related pieces:

- **NFTs table:** `backing_xrp`, `escrow_sequence`, `escrow_owner`, `escrow_tx_hash`
- **Migrations** (for existing DBs that already had the base schema): add `properties`, `escrow_sequence`, `escrow_owner`, `escrow_tx_hash` if missing.

### Full schema (from `backend/src/db/init.js`)

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_address TEXT UNIQUE NOT NULL,
  wallet_seed TEXT,
  display_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Royalty pools table (before nfts so FK is valid)
CREATE TABLE IF NOT EXISTS royalty_pools (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  creator_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  total_nfts INTEGER DEFAULT 0,
  royalty_per_nft REAL DEFAULT 0,
  total_deposited_xrp REAL DEFAULT 0,
  total_distributed_xrp REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- NFTs table (includes escrow columns)
CREATE TABLE IF NOT EXISTS nfts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  token_id TEXT UNIQUE,
  creator_address TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'digital_asset',
  asset_name TEXT NOT NULL,
  asset_description TEXT,
  asset_image_url TEXT,
  metadata_uri TEXT,
  properties TEXT DEFAULT '{}',
  backing_xrp REAL NOT NULL DEFAULT 0,
  list_price_xrp REAL,
  last_sale_price_xrp REAL DEFAULT 0,
  sale_count INTEGER DEFAULT 0,
  royalty_pool_id TEXT REFERENCES royalty_pools(id),
  royalty_percentage REAL,
  escrow_sequence INTEGER,
  escrow_owner TEXT,
  escrow_tx_hash TEXT,
  status TEXT DEFAULT 'minted',
  owner_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nft_id TEXT REFERENCES nfts(id),
  tx_type TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  amount_xrp REAL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Royalty deposits
CREATE TABLE IF NOT EXISTS royalty_deposits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pool_id TEXT REFERENCES royalty_pools(id),
  depositor_address TEXT NOT NULL,
  amount_xrp REAL NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Royalty payouts
CREATE TABLE IF NOT EXISTS royalty_payouts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  deposit_id TEXT REFERENCES royalty_deposits(id),
  pool_id TEXT REFERENCES royalty_pools(id),
  nft_id TEXT REFERENCES nfts(id),
  holder_address TEXT NOT NULL,
  amount_xrp REAL NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nfts_status ON nfts(status);
CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts(creator_address);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_royalty_pool ON nfts(royalty_pool_id);
CREATE INDEX IF NOT EXISTS idx_transactions_nft ON transactions(nft_id);
CREATE INDEX IF NOT EXISTS idx_royalty_pools_creator ON royalty_pools(creator_address);
CREATE INDEX IF NOT EXISTS idx_royalty_deposits_pool ON royalty_deposits(pool_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_pool ON royalty_payouts(pool_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_holder ON royalty_payouts(holder_address);
```

### Migrations (run after schema if columns are missing)

```sql
ALTER TABLE nfts ADD COLUMN properties TEXT DEFAULT '{}';
ALTER TABLE nfts ADD COLUMN escrow_sequence INTEGER;
ALTER TABLE nfts ADD COLUMN escrow_owner TEXT;
ALTER TABLE nfts ADD COLUMN escrow_tx_hash TEXT;
```

(Init script runs these in a loop and ignores errors when the column already exists.)
