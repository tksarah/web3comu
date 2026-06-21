import { getDb, runTransaction } from "@/lib/db";
import { getFaucetChain } from "@/lib/chains";
import type {
  FaucetAllowlistEntry,
  FaucetClaim,
  FaucetClaimStatus,
  FaucetSetting,
  MemberProfile,
  NftCheckMode,
  NftConfig,
  NftStandard,
  PortalContent,
  PortalContentStatus,
  PortalContentType,
  PublicMemberProfile
} from "@/lib/types";

type Row = Record<string, unknown>;

type NftConfigInput = {
  chainId: unknown;
  rpcUrl: unknown;
  contractAddress: unknown;
  standard: unknown;
  checkMode: unknown;
  tokenId: unknown;
  minBalance: unknown;
  tokenDecimals: unknown;
  enabled: unknown;
};

type FaucetSettingInput = {
  chainId: unknown;
  amountEth: unknown;
  enabled: unknown;
};

type FaucetAllowlistInput = {
  walletAddress: string;
  note: unknown;
};

type PortalContentInput = {
  type: unknown;
  status: unknown;
  title: unknown;
  body: unknown;
  url: unknown;
  pinned: unknown;
};

type ProfileInput = {
  displayName: unknown;
  email: unknown;
  xAccount: unknown;
  discordAccount: unknown;
  telegramAccount: unknown;
  bio: unknown;
  profilePublic: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numericText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return text(value).trim();
}

function nullableText(value: unknown, maxLength: number) {
  const trimmed = text(value).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function fromDbBool(value: unknown) {
  return Number(value) === 1;
}

function isPositiveIntegerText(value: string) {
  return /^[1-9]\d*$/.test(value);
}

function isPositiveDecimalText(value: string, decimals: number) {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return false;
  }
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    return false;
  }
  return BigInt(whole || "0") > 0n || /[1-9]/.test(fraction);
}

function isNonNegativeDecimalText(value: string, decimals: number) {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return false;
  }
  const [, fraction = ""] = value.split(".");
  return fraction.length <= decimals;
}

function hasPositiveDecimalValue(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole || "0") > 0n || /[1-9]/.test(fraction);
}

function getSqliteMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export function getJstDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mapNftConfig(row: Row): NftConfig {
  return {
    id: Number(row.id),
    chainId: Number(row.chain_id),
    rpcUrl: text(row.rpc_url),
    contractAddress: text(row.contract_address),
    standard: text(row.standard) as NftStandard,
    checkMode: text(row.check_mode) as NftCheckMode,
    tokenId: row.token_id ? text(row.token_id) : null,
    minBalance: String(row.min_balance || "1"),
    tokenDecimals: Number(row.token_decimals ?? 18),
    enabled: fromDbBool(row.enabled),
    version: Number(row.version),
    updatedAt: text(row.updated_at)
  };
}

function mapMember(row: Row): MemberProfile {
  return {
    walletAddress: text(row.wallet_address),
    displayName: row.display_name ? text(row.display_name) : null,
    email: row.email ? text(row.email) : null,
    xAccount: row.x_account ? text(row.x_account) : null,
    discordAccount: row.discord_account ? text(row.discord_account) : null,
    telegramAccount: row.telegram_account ? text(row.telegram_account) : null,
    bio: row.bio ? text(row.bio) : null,
    profileImageFilename: row.profile_image_filename ? text(row.profile_image_filename) : null,
    profileImageMime: row.profile_image_mime ? text(row.profile_image_mime) : null,
    profilePublic: fromDbBool(row.profile_public),
    forceProfilePrivate: fromDbBool(row.force_profile_private),
    suspended: fromDbBool(row.suspended),
    lastVerifiedAt: row.last_verified_at ? text(row.last_verified_at) : null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

function mapFaucetSetting(row: Row): FaucetSetting {
  return {
    chainId: Number(row.chain_id),
    chainName: text(row.chain_name),
    rpcUrl: text(row.rpc_url),
    explorerUrl: text(row.explorer_url),
    amountEth: String(row.amount_eth || "0"),
    enabled: fromDbBool(row.enabled),
    updatedAt: text(row.updated_at)
  };
}

function mapFaucetAllowlistEntry(row: Row): FaucetAllowlistEntry {
  return {
    walletAddress: text(row.wallet_address),
    note: row.note ? text(row.note) : null,
    active: fromDbBool(row.active),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

function mapFaucetClaim(row: Row): FaucetClaim {
  return {
    id: Number(row.id),
    walletAddress: text(row.wallet_address),
    chainId: Number(row.chain_id),
    chainName: text(row.chain_name),
    amountEth: String(row.amount_eth || "0"),
    claimDateJst: text(row.claim_date_jst),
    status: text(row.status) as FaucetClaimStatus,
    txHash: row.tx_hash ? text(row.tx_hash) : null,
    adminWalletAddress: row.admin_wallet_address ? text(row.admin_wallet_address) : null,
    failureReason: row.failure_reason ? text(row.failure_reason) : null,
    requestedAt: text(row.requested_at),
    submittedAt: row.submitted_at ? text(row.submitted_at) : null,
    confirmedAt: row.confirmed_at ? text(row.confirmed_at) : null,
    updatedAt: text(row.updated_at)
  };
}

function mapPortalContent(row: Row): PortalContent {
  return {
    id: Number(row.id),
    type: text(row.type) as PortalContentType,
    status: text(row.status) as PortalContentStatus,
    title: text(row.title),
    body: row.body ? text(row.body) : null,
    url: row.url ? text(row.url) : null,
    pinned: fromDbBool(row.pinned),
    publishedAt: row.published_at ? text(row.published_at) : null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at)
  };
}

function failStaleFaucetRequests(walletAddress: string, chainId: number) {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  getDb()
    .prepare(
      `UPDATE faucet_claims
       SET status = 'failed',
           failure_reason = '送金処理が完了しなかったため、再申請できるようにしました。',
           updated_at = ?
       WHERE wallet_address = ?
         AND chain_id = ?
         AND status = 'requested'
         AND requested_at < ?`
    )
    .run(new Date().toISOString(), walletAddress, chainId, cutoff);
}

function toPublicMember(member: MemberProfile): PublicMemberProfile {
  return {
    walletAddress: member.walletAddress,
    displayName: member.displayName,
    xAccount: member.xAccount,
    discordAccount: member.discordAccount,
    telegramAccount: member.telegramAccount,
    bio: member.bio,
    profileImageFilename: member.profileImageFilename,
    lastVerifiedAt: member.lastVerifiedAt,
    updatedAt: member.updatedAt
  };
}

function normalizePortalContentType(value: unknown): PortalContentType {
  const type = text(value);
  if (type !== "notice" && type !== "resource") {
    throw new Error("コンテンツ種別が不正です。");
  }
  return type;
}

function normalizePortalContentStatus(value: unknown): PortalContentStatus {
  const status = text(value) || "draft";
  if (status !== "draft" && status !== "published") {
    throw new Error("公開状態が不正です。");
  }
  return status;
}

function nullableHttpUrl(value: unknown) {
  const raw = text(value).trim();
  if (!raw) {
    return null;
  }
  if (raw.length > 1200) {
    throw new Error("URLは1200文字以内で入力してください。");
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("URLはhttpまたはhttpsで始まる必要があります。");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("http")) {
      throw error;
    }
    throw new Error("URLの形式が正しくありません。");
  }

  return raw;
}

function normalizePortalContentInput(input: PortalContentInput) {
  const type = normalizePortalContentType(input.type);
  const status = normalizePortalContentStatus(input.status);
  const title = text(input.title).trim().slice(0, 160);
  const body = nullableText(input.body, 6000);
  const url = nullableHttpUrl(input.url);

  if (!title) {
    throw new Error("タイトルは必須です。");
  }
  if (type === "notice" && !body && !url) {
    throw new Error("お知らせには本文またはURLが必要です。");
  }
  if (type === "resource" && !url) {
    throw new Error("ライブラリにはURLが必要です。");
  }

  return {
    type,
    status,
    title,
    body,
    url,
    pinned: bool(input.pinned)
  };
}

export function getNftConfig() {
  const row = getDb().prepare("SELECT * FROM nft_config WHERE id = 1").get() as Row | undefined;
  if (!row) {
    throw new Error("Token config was not initialized.");
  }
  return mapNftConfig(row);
}

export function saveNftConfig(input: NftConfigInput) {
  const chainId = Number(input.chainId);
  const minBalance = numericText(input.minBalance);
  const tokenDecimals = Number(input.tokenDecimals ?? 18);
  const rpcUrl = text(input.rpcUrl).trim();
  const contractAddress = text(input.contractAddress).trim();
  const standard = text(input.standard) as NftStandard;
  let checkMode = (text(input.checkMode) || "collection") as NftCheckMode;
  let tokenId = nullableText(input.tokenId, 120);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("chainId must be a positive integer.");
  }
  if (!rpcUrl) {
    throw new Error("RPC URL is required.");
  }
  if (!contractAddress) {
    throw new Error("Contract address is required.");
  }
  if (standard !== "erc20" && standard !== "erc721" && standard !== "erc1155") {
    throw new Error("トークン規格が不正です。");
  }
  if (!Number.isInteger(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 36) {
    throw new Error("tokenDecimals must be an integer from 0 to 36.");
  }
  if (standard === "erc20") {
    checkMode = "balance";
    tokenId = null;
    if (!isPositiveDecimalText(minBalance, tokenDecimals)) {
      throw new Error("ERC-20のminBalanceは正の数で、tokenDecimals以下の小数桁にしてください。");
    }
  } else {
    if (!["collection", "tokenOwner", "balance"].includes(checkMode)) {
      throw new Error("判定モードが不正です。");
    }
    if (!isPositiveIntegerText(minBalance)) {
      throw new Error("ERC-721/1155のminBalanceは正の整数にしてください。");
    }
    if (standard === "erc1155") {
      checkMode = "balance";
      if (!tokenId) {
        throw new Error("ERC-1155判定にはtokenIdが必要です。");
      }
    } else if (checkMode === "tokenOwner") {
      if (!tokenId) {
        throw new Error("ERC-721 token owner判定にはtokenIdが必要です。");
      }
    } else if (checkMode === "collection") {
      tokenId = null;
    } else {
      throw new Error("ERC-721ではcollectionまたはtokenOwnerを選択してください。");
    }
  }

  return runTransaction(() => {
    getDb()
      .prepare(
        `UPDATE nft_config
         SET chain_id = ?, rpc_url = ?, contract_address = ?, standard = ?,
             check_mode = ?, token_id = ?, min_balance = ?, token_decimals = ?, enabled = ?,
             version = version + 1, updated_at = ?
         WHERE id = 1`
      )
      .run(
        chainId,
        rpcUrl,
        contractAddress,
        standard,
        checkMode,
        tokenId,
        minBalance,
        tokenDecimals,
        bool(input.enabled) ? 1 : 0,
        new Date().toISOString()
      );

    getDb()
      .prepare("UPDATE sessions SET revoked_at = ? WHERE role = 'member' AND revoked_at IS NULL")
      .run(Date.now());

    return getNftConfig();
  });
}

export function listFaucetSettings() {
  const rows = getDb().prepare("SELECT * FROM faucet_settings ORDER BY chain_id ASC").all() as Row[];
  return rows.map(mapFaucetSetting);
}

export function getFaucetSetting(chainId: number) {
  const row = getDb()
    .prepare("SELECT * FROM faucet_settings WHERE chain_id = ?")
    .get(chainId) as Row | undefined;
  return row ? mapFaucetSetting(row) : null;
}

export function saveFaucetSettings(inputs: FaucetSettingInput[]) {
  if (!Array.isArray(inputs)) {
    throw new Error("Faucet設定が正しくありません。");
  }

  return runTransaction(() => {
    const now = new Date().toISOString();
    const update = getDb().prepare(
      `UPDATE faucet_settings
       SET amount_eth = ?, enabled = ?, updated_at = ?
       WHERE chain_id = ?`
    );

    for (const input of inputs) {
      const chainId = Number(input.chainId);
      const chain = getFaucetChain(chainId);
      const amountEth = numericText(input.amountEth) || "0";

      if (!chain) {
        throw new Error("対応していないFaucetネットワークです。");
      }
      if (!isNonNegativeDecimalText(amountEth, chain.nativeCurrency.decimals)) {
        throw new Error("Faucet支給額は0以上、18桁以内の小数で入力してください。");
      }

      update.run(amountEth, bool(input.enabled) ? 1 : 0, now, chain.id);
    }

    return listFaucetSettings();
  });
}

export function getFaucetAllowlistEntry(walletAddress: string) {
  const row = getDb()
    .prepare("SELECT * FROM faucet_allowlist WHERE wallet_address = ?")
    .get(walletAddress) as Row | undefined;
  return row ? mapFaucetAllowlistEntry(row) : null;
}

export function listFaucetAllowlist(query = "") {
  const normalized = `%${query.trim()}%`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM faucet_allowlist
       WHERE wallet_address LIKE ? OR note LIKE ?
       ORDER BY updated_at DESC
       LIMIT 200`
    )
    .all(normalized, normalized) as Row[];
  return rows.map(mapFaucetAllowlistEntry);
}

export function upsertFaucetAllowlistEntry(input: FaucetAllowlistInput) {
  const now = new Date().toISOString();
  const note = nullableText(input.note, 240);

  getDb()
    .prepare(
      `INSERT INTO faucet_allowlist (wallet_address, note, active, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(wallet_address) DO UPDATE SET
         note = excluded.note,
         active = 1,
         updated_at = excluded.updated_at`
    )
    .run(input.walletAddress, note, now, now);

  return getFaucetAllowlistEntry(input.walletAddress);
}

export function setFaucetAllowlistActive(walletAddress: string, active: boolean) {
  getDb()
    .prepare("UPDATE faucet_allowlist SET active = ?, updated_at = ? WHERE wallet_address = ?")
    .run(active ? 1 : 0, new Date().toISOString(), walletAddress);
  return getFaucetAllowlistEntry(walletAddress);
}

export function listTodaysActiveFaucetClaims(walletAddress: string, claimDateJst = getJstDate()) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM faucet_claims
       WHERE wallet_address = ?
         AND claim_date_jst = ?
         AND status IN ('requested', 'submitted', 'confirmed')
       ORDER BY requested_at DESC`
    )
    .all(walletAddress, claimDateJst) as Row[];
  return rows.map(mapFaucetClaim);
}

export function getFaucetClaim(id: number) {
  const row = getDb().prepare("SELECT * FROM faucet_claims WHERE id = ?").get(id) as Row | undefined;
  return row ? mapFaucetClaim(row) : null;
}

export function createFaucetClaim(walletAddress: string, chainId: number) {
  const chain = getFaucetChain(chainId);
  if (!chain) {
    throw new Error("対応していないFaucetネットワークです。");
  }

  return runTransaction(() => {
    failStaleFaucetRequests(walletAddress, chain.id);

    const allowlistEntry = getFaucetAllowlistEntry(walletAddress);
    if (!allowlistEntry?.active) {
      throw new Error("このウォレットアドレスはFaucet受け取りアドレスとして承認されていません。");
    }

    const setting = getFaucetSetting(chainId);
    if (!setting?.enabled) {
      throw new Error("このネットワークのFaucetは無効です。");
    }
    if (
      !isNonNegativeDecimalText(setting.amountEth, chain.nativeCurrency.decimals) ||
      !hasPositiveDecimalValue(setting.amountEth)
    ) {
      throw new Error("このネットワークのFaucet支給額が設定されていません。");
    }

    const now = new Date().toISOString();
    const claimDateJst = getJstDate();

    try {
      const result = getDb()
        .prepare(
          `INSERT INTO faucet_claims (
             wallet_address, chain_id, chain_name, amount_eth, claim_date_jst,
             status, requested_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, 'requested', ?, ?)`
        )
        .run(walletAddress, chain.id, chain.name, setting.amountEth, claimDateJst, now, now);

      return getFaucetClaim(Number(result.lastInsertRowid));
    } catch (error) {
      if (getSqliteMessage(error).includes("idx_faucet_claims_daily_active")) {
        throw new Error("このウォレットは本日すでにこのネットワークのFaucetを受け取っています。");
      }
      throw error;
    }
  });
}

export function markFaucetClaimSubmitted(id: number, txHash: string, senderWalletAddress: string) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE faucet_claims
       SET tx_hash = ?,
           admin_wallet_address = ?,
           status = 'submitted',
           failure_reason = NULL,
           submitted_at = COALESCE(submitted_at, ?),
           updated_at = ?
       WHERE id = ? AND status = 'requested'`
    )
    .run(txHash, senderWalletAddress, now, now, id);

  return getFaucetClaim(id);
}

export function markFaucetClaimConfirmed(id: number) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE faucet_claims
       SET status = 'confirmed',
           confirmed_at = COALESCE(confirmed_at, ?),
           updated_at = ?
       WHERE id = ? AND status IN ('requested', 'submitted')`
    )
    .run(now, now, id);

  return getFaucetClaim(id);
}

export function markFaucetClaimFailed(id: number, reason: string) {
  getDb()
    .prepare(
      `UPDATE faucet_claims
       SET status = 'failed',
           failure_reason = ?,
           updated_at = ?
       WHERE id = ? AND status IN ('requested', 'submitted')`
    )
    .run(reason.slice(0, 500), new Date().toISOString(), id);

  return getFaucetClaim(id);
}

export function listAdminFaucetClaims(query = "", status = "") {
  const clauses: string[] = [];
  const params: string[] = [];
  const normalizedQuery = query.trim();

  if (normalizedQuery) {
    const like = `%${normalizedQuery}%`;
    clauses.push("(wallet_address LIKE ? OR tx_hash LIKE ? OR admin_wallet_address LIKE ?)");
    params.push(like, like, like);
  }

  if (["requested", "submitted", "confirmed", "failed", "cancelled"].includes(status)) {
    clauses.push("status = ?");
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT * FROM faucet_claims
       ${where}
       ORDER BY requested_at DESC
       LIMIT 200`
    )
    .all(...params) as Row[];
  return rows.map(mapFaucetClaim);
}

export function getPortalContent(id: number) {
  const row = getDb()
    .prepare("SELECT * FROM portal_content WHERE id = ?")
    .get(id) as Row | undefined;
  return row ? mapPortalContent(row) : null;
}

export function listAdminPortalContent(type?: PortalContentType) {
  const rows = type
    ? (getDb()
        .prepare(
          `SELECT * FROM portal_content
           WHERE type = ?
           ORDER BY pinned DESC, COALESCE(published_at, updated_at) DESC, id DESC
           LIMIT 200`
        )
        .all(type) as Row[])
    : (getDb()
        .prepare(
          `SELECT * FROM portal_content
           ORDER BY type ASC, pinned DESC, COALESCE(published_at, updated_at) DESC, id DESC
           LIMIT 200`
        )
        .all() as Row[]);
  return rows.map(mapPortalContent);
}

export function listPublishedPortalContent(type: PortalContentType, limit = 50) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM portal_content
       WHERE type = ? AND status = 'published'
       ORDER BY pinned DESC, published_at DESC, id DESC
       LIMIT ?`
    )
    .all(type, limit) as Row[];
  return rows.map(mapPortalContent);
}

export function countPublishedPortalContent(type: PortalContentType) {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM portal_content WHERE type = ? AND status = 'published'")
    .get(type) as Row | undefined;
  return Number(row?.count ?? 0);
}

export function createPortalContent(input: PortalContentInput) {
  const normalized = normalizePortalContentInput(input);
  const now = new Date().toISOString();
  const publishedAt = normalized.status === "published" ? now : null;

  const result = getDb()
    .prepare(
      `INSERT INTO portal_content (
         type, status, title, body, url, pinned, published_at, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      normalized.type,
      normalized.status,
      normalized.title,
      normalized.body,
      normalized.url,
      normalized.pinned ? 1 : 0,
      publishedAt,
      now,
      now
    );

  const content = getPortalContent(Number(result.lastInsertRowid));
  if (!content) {
    throw new Error("コンテンツを作成できませんでした。");
  }
  return content;
}

export function updatePortalContent(id: number, input: PortalContentInput) {
  const existing = getPortalContent(id);
  if (!existing) {
    throw new Error("コンテンツが見つかりません。");
  }

  const normalized = normalizePortalContentInput(input);
  const now = new Date().toISOString();
  const publishedAt =
    normalized.status === "published" ? existing.publishedAt ?? now : null;

  getDb()
    .prepare(
      `UPDATE portal_content
       SET type = ?,
           status = ?,
           title = ?,
           body = ?,
           url = ?,
           pinned = ?,
           published_at = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      normalized.type,
      normalized.status,
      normalized.title,
      normalized.body,
      normalized.url,
      normalized.pinned ? 1 : 0,
      publishedAt,
      now,
      id
    );

  const content = getPortalContent(id);
  if (!content) {
    throw new Error("コンテンツを更新できませんでした。");
  }
  return content;
}

export function deletePortalContent(id: number) {
  const existing = getPortalContent(id);
  if (!existing) {
    throw new Error("コンテンツが見つかりません。");
  }

  getDb().prepare("DELETE FROM portal_content WHERE id = ?").run(id);
  return existing;
}

export function upsertVerifiedMember(walletAddress: string) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO members (wallet_address, last_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(wallet_address) DO UPDATE SET
         last_verified_at = excluded.last_verified_at,
         updated_at = excluded.updated_at`
    )
    .run(walletAddress, now, now, now);

  return getMember(walletAddress);
}

export function ensureMemberProfile(walletAddress: string) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO members (wallet_address, created_at, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(wallet_address) DO NOTHING`
    )
    .run(walletAddress, now, now);

  return getMember(walletAddress);
}

export function getMember(walletAddress: string) {
  const row = getDb()
    .prepare("SELECT * FROM members WHERE wallet_address = ?")
    .get(walletAddress) as Row | undefined;
  return row ? mapMember(row) : null;
}

export function isMemberSuspended(walletAddress: string) {
  const row = getDb()
    .prepare("SELECT suspended FROM members WHERE wallet_address = ?")
    .get(walletAddress) as Row | undefined;
  return row ? fromDbBool(row.suspended) : false;
}

export function updateProfile(walletAddress: string, input: ProfileInput) {
  const email = nullableText(input.email, 180);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email address is invalid.");
  }

  getDb()
    .prepare(
      `UPDATE members
       SET display_name = ?, email = ?, x_account = ?, discord_account = ?,
           telegram_account = ?, bio = ?, profile_public = ?, updated_at = ?
       WHERE wallet_address = ?`
    )
    .run(
      nullableText(input.displayName, 80),
      email,
      nullableText(input.xAccount, 80),
      nullableText(input.discordAccount, 80),
      nullableText(input.telegramAccount, 80),
      nullableText(input.bio, 500),
      bool(input.profilePublic) ? 1 : 0,
      new Date().toISOString(),
      walletAddress
    );

  return getMember(walletAddress);
}

export function updateProfileImage(walletAddress: string, filename: string, mime: string) {
  getDb()
    .prepare(
      `UPDATE members
       SET profile_image_filename = ?, profile_image_mime = ?, updated_at = ?
       WHERE wallet_address = ?`
    )
    .run(filename, mime, new Date().toISOString(), walletAddress);
  return getMember(walletAddress);
}

export function findImageRecord(filename: string) {
  return getDb()
    .prepare("SELECT wallet_address, profile_image_mime FROM members WHERE profile_image_filename = ?")
    .get(filename) as Row | undefined;
}

export function listPublicMembers() {
  const rows = getDb()
    .prepare(
      `SELECT * FROM members
       WHERE profile_public = 1 AND force_profile_private = 0 AND suspended = 0
       ORDER BY updated_at DESC
       LIMIT 100`
    )
    .all() as Row[];
  return rows.map(mapMember).map(toPublicMember);
}

export function listAdminMembers(query = "") {
  const normalized = `%${query.trim()}%`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM members
       WHERE wallet_address LIKE ? OR display_name LIKE ? OR email LIKE ?
       ORDER BY COALESCE(last_verified_at, created_at) DESC
       LIMIT 200`
    )
    .all(normalized, normalized, normalized) as Row[];
  return rows.map(mapMember);
}

export function setForceProfilePrivate(walletAddress: string, forceProfilePrivate: boolean) {
  getDb()
    .prepare("UPDATE members SET force_profile_private = ?, updated_at = ? WHERE wallet_address = ?")
    .run(forceProfilePrivate ? 1 : 0, new Date().toISOString(), walletAddress);
  return getMember(walletAddress);
}

export function setMemberSuspended(walletAddress: string, suspended: boolean) {
  return runTransaction(() => {
    getDb()
      .prepare("UPDATE members SET suspended = ?, updated_at = ? WHERE wallet_address = ?")
      .run(suspended ? 1 : 0, new Date().toISOString(), walletAddress);
    if (suspended) {
      revokeMemberSessions(walletAddress);
    }
    return getMember(walletAddress);
  });
}

export function revokeMemberSessions(walletAddress: string) {
  getDb()
    .prepare("UPDATE sessions SET revoked_at = ? WHERE wallet_address = ? AND revoked_at IS NULL")
    .run(Date.now(), walletAddress);
}
