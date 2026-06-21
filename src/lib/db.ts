import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { FAUCET_CHAINS, SONEIUM_MAINNET } from "@/lib/chains";
import { getDatabasePath, getDefaultRpcUrl } from "@/lib/env";

type GlobalWithDb = typeof globalThis & {
  __web3comuDb?: DatabaseSync;
};

type NftConfigRow = Record<string, unknown>;

function createNftConfigTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS nft_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      chain_id INTEGER NOT NULL,
      rpc_url TEXT NOT NULL,
      contract_address TEXT NOT NULL,
      standard TEXT NOT NULL CHECK (standard IN ('erc20', 'erc721', 'erc1155')),
      check_mode TEXT NOT NULL CHECK (check_mode IN ('collection', 'tokenOwner', 'balance')),
      token_id TEXT,
      min_balance TEXT NOT NULL DEFAULT '1',
      token_decimals INTEGER NOT NULL DEFAULT 18,
      enabled INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);
}

function createFaucetTables(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS faucet_settings (
      chain_id INTEGER PRIMARY KEY,
      chain_name TEXT NOT NULL,
      rpc_url TEXT NOT NULL,
      explorer_url TEXT NOT NULL,
      amount_eth TEXT NOT NULL DEFAULT '0',
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faucet_allowlist (
      wallet_address TEXT PRIMARY KEY,
      note TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faucet_nonces (
      wallet_address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (wallet_address, chain_id)
    );

    CREATE TABLE IF NOT EXISTS faucet_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      chain_name TEXT NOT NULL,
      amount_eth TEXT NOT NULL,
      claim_date_jst TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('requested', 'submitted', 'confirmed', 'failed', 'cancelled')),
      tx_hash TEXT,
      admin_wallet_address TEXT,
      failure_reason TEXT,
      requested_at TEXT NOT NULL,
      submitted_at TEXT,
      confirmed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_faucet_allowlist_active ON faucet_allowlist(active);
    CREATE INDEX IF NOT EXISTS idx_faucet_claims_wallet ON faucet_claims(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_faucet_claims_status ON faucet_claims(status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_faucet_claims_daily_active
      ON faucet_claims(wallet_address, chain_id, claim_date_jst)
      WHERE status IN ('requested', 'submitted', 'confirmed');
  `);
}

function createPortalContentTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS portal_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('notice', 'resource')),
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
      title TEXT NOT NULL,
      body TEXT,
      url TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_portal_content_public
      ON portal_content(type, status, pinned, published_at);
    CREATE INDEX IF NOT EXISTS idx_portal_content_updated
      ON portal_content(type, updated_at);
  `);
}

function migrateFaucetClaimsTable(database: DatabaseSync) {
  const columns = database.prepare("PRAGMA table_info(faucet_claims)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "failure_reason")) {
    database.exec("ALTER TABLE faucet_claims ADD COLUMN failure_reason TEXT");
  }
}

function initializeFaucetSettings(database: DatabaseSync) {
  const now = new Date().toISOString();
  const statement = database.prepare(
    `INSERT INTO faucet_settings (chain_id, chain_name, rpc_url, explorer_url, amount_eth, enabled, updated_at)
     VALUES (?, ?, ?, ?, '0', 0, ?)
     ON CONFLICT(chain_id) DO UPDATE SET
       chain_name = excluded.chain_name,
       rpc_url = excluded.rpc_url,
       explorer_url = excluded.explorer_url`
  );

  for (const chain of FAUCET_CHAINS) {
    statement.run(chain.id, chain.name, chain.rpcUrl, chain.explorerUrl, now);
  }
}

function text(value: unknown, fallback = "") {
  const raw = value === null || value === undefined ? "" : String(value).trim();
  return raw || fallback;
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStandard(value: unknown) {
  const standard = text(value, "erc721");
  return standard === "erc20" || standard === "erc721" || standard === "erc1155" ? standard : "erc721";
}

function normalizeCheckMode(standard: string, value: unknown) {
  const checkMode = text(value, "collection");
  if (standard === "erc20" || standard === "erc1155") {
    return "balance";
  }
  return checkMode === "tokenOwner" ? "tokenOwner" : "collection";
}

function normalizeTokenDecimals(value: unknown) {
  const decimals = number(value, 18);
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18;
}

function nftConfigNeedsMigration(database: DatabaseSync) {
  const table = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'nft_config'")
    .get() as { sql?: string } | undefined;
  const columns = database.prepare("PRAGMA table_info(nft_config)").all() as Array<{ name: string; type: string }>;
  const minBalanceColumn = columns.find((column) => column.name === "min_balance");

  return (
    !table?.sql?.includes("'erc20'") ||
    !columns.some((column) => column.name === "token_decimals") ||
    minBalanceColumn?.type.toUpperCase() !== "TEXT"
  );
}

function migrateNftConfigTable(database: DatabaseSync) {
  if (!nftConfigNeedsMigration(database)) {
    return;
  }

  const existing = database.prepare("SELECT * FROM nft_config WHERE id = 1").get() as NftConfigRow | undefined;
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("DROP TABLE nft_config");
    createNftConfigTable(database);

    if (existing) {
      const standard = normalizeStandard(existing.standard);
      database
        .prepare(
          `INSERT INTO nft_config (
            id, chain_id, rpc_url, contract_address, standard, check_mode,
            token_id, min_balance, token_decimals, enabled, version, updated_at
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          number(existing.chain_id, SONEIUM_MAINNET.id),
          text(existing.rpc_url, getDefaultRpcUrl()),
          text(existing.contract_address),
          standard,
          normalizeCheckMode(standard, existing.check_mode),
          existing.token_id ? text(existing.token_id) : null,
          text(existing.min_balance, "1"),
          normalizeTokenDecimals(existing.token_decimals),
          number(existing.enabled, 0) ? 1 : 0,
          number(existing.version, 1),
          text(existing.updated_at, new Date().toISOString())
        );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function openDatabase() {
  const dbPath = getDatabasePath();
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const database = new DatabaseSync(dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS wallet_nonces (
      wallet_address TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
      nft_config_version INTEGER,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      wallet_address TEXT PRIMARY KEY,
      display_name TEXT,
      email TEXT,
      x_account TEXT,
      discord_account TEXT,
      telegram_account TEXT,
      bio TEXT,
      profile_image_filename TEXT,
      profile_image_mime TEXT,
      profile_public INTEGER NOT NULL DEFAULT 0,
      force_profile_private INTEGER NOT NULL DEFAULT 0,
      suspended INTEGER NOT NULL DEFAULT 0,
      last_verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON sessions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_members_public ON members(profile_public, force_profile_private, suspended);
  `);
  createNftConfigTable(database);
  createFaucetTables(database);
  createPortalContentTable(database);
  migrateFaucetClaimsTable(database);
  migrateNftConfigTable(database);
  initializeFaucetSettings(database);

  const config = database.prepare("SELECT * FROM nft_config WHERE id = 1").get() as
    | Record<string, unknown>
    | undefined;
  if (!config) {
    database
      .prepare(
        `INSERT INTO nft_config (
          id, chain_id, rpc_url, contract_address, standard, check_mode,
          token_id, min_balance, token_decimals, enabled, version, updated_at
        ) VALUES (1, ?, ?, '', 'erc721', 'collection', NULL, '1', 18, 0, 1, ?)`
      )
      .run(SONEIUM_MAINNET.id, getDefaultRpcUrl(), new Date().toISOString());
  } else {
    const isInitialUnsetConfig =
      Number(config.enabled) === 0 &&
      Number(config.chain_id) === 1 &&
      String(config.contract_address || "") === "" &&
      String(config.standard) === "erc721" &&
      String(config.check_mode) === "collection" &&
      config.token_id === null &&
      Number(config.min_balance) === 1;

    if (isInitialUnsetConfig) {
      database
        .prepare("UPDATE nft_config SET chain_id = ?, rpc_url = ?, updated_at = ? WHERE id = 1")
        .run(SONEIUM_MAINNET.id, getDefaultRpcUrl(), new Date().toISOString());
    }
  }

  return database;
}

export function getDb() {
  const globalForDb = globalThis as GlobalWithDb;
  if (!globalForDb.__web3comuDb) {
    globalForDb.__web3comuDb = openDatabase();
  }

  return globalForDb.__web3comuDb;
}

export function runTransaction<T>(callback: () => T) {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
