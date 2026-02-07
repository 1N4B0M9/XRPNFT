import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data.db');

const db = Database(dbPath);
db.pragma('journal_mode = WAL');

const schema = `
-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  wallet_address TEXT UNIQUE NOT NULL,
  wallet_seed TEXT,
  xrp_balance REAL DEFAULT 0,
  escrow_balance REAL DEFAULT 0,
  verification_tier TEXT DEFAULT 'unverified',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Royalty pools table (before nfts so FK is valid)
CREATE TABLE IF NOT EXISTS royalty_pools (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  total_nfts INTEGER DEFAULT 0,
  royalty_per_nft REAL DEFAULT 0,
  total_deposited_xrp REAL DEFAULT 0,
  total_distributed_xrp REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- NFTs table (no escrow columns for fresh DBs)
CREATE TABLE IF NOT EXISTS nfts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  token_id TEXT UNIQUE,
  company_id TEXT REFERENCES companies(id),
  asset_type TEXT NOT NULL DEFAULT 'digital_asset',
  asset_name TEXT NOT NULL,
  asset_description TEXT,
  asset_image_url TEXT,
  metadata_uri TEXT,
  backing_xrp REAL NOT NULL DEFAULT 0,
  list_price_xrp REAL,
  last_sale_price_xrp REAL DEFAULT 0,
  sale_count INTEGER DEFAULT 0,
  escrow_id TEXT,
  escrow_sequence INTEGER,
  royalty_pool_id TEXT REFERENCES royalty_pools(id),
  royalty_percentage REAL,
  status TEXT DEFAULT 'minted',
  owner_address TEXT,
  verification_tier TEXT DEFAULT 'unverified',
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

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_address TEXT UNIQUE NOT NULL,
  wallet_seed TEXT,
  display_name TEXT,
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
CREATE INDEX IF NOT EXISTS idx_nfts_company ON nfts(company_id);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_royalty_pool ON nfts(royalty_pool_id);
CREATE INDEX IF NOT EXISTS idx_transactions_nft ON transactions(nft_id);
CREATE INDEX IF NOT EXISTS idx_royalty_pools_company ON royalty_pools(company_id);
CREATE INDEX IF NOT EXISTS idx_royalty_deposits_pool ON royalty_deposits(pool_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_pool ON royalty_payouts(pool_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payouts_holder ON royalty_payouts(holder_address);
`;

// Migration: add new columns to existing tables (safe to re-run)
const migrations = [
  'ALTER TABLE nfts ADD COLUMN last_sale_price_xrp REAL DEFAULT 0',
  'ALTER TABLE nfts ADD COLUMN sale_count INTEGER DEFAULT 0',
  'ALTER TABLE nfts ADD COLUMN royalty_pool_id TEXT REFERENCES royalty_pools(id)',
  'ALTER TABLE nfts ADD COLUMN royalty_percentage REAL',
];

try {
  console.log('Initializing SQLite database...');
  db.exec(schema);

  // Run migrations (ignore errors from already-existing columns)
  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch {
      // Column likely already exists — safe to ignore
    }
  }

  console.log('Database initialized successfully at:', dbPath);
} catch (err) {
  console.error('Error initializing database:', err);
  process.exit(1);
} finally {
  db.close();
}
