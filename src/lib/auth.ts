import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getAddress, verifyMessage, type Address } from "viem";

import { getAdminWalletAddress, getAppName, getConfiguredDomain, getSessionSecret } from "@/lib/env";
import { getDb } from "@/lib/db";
import { ensureMemberProfile, getMember, getNftConfig } from "@/lib/repository";
import type { Session, SessionRole } from "@/lib/types";

export const SESSION_COOKIE = "web3comu_session";
const NONCE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_SECONDS = 24 * 60 * 60;

type Row = Record<string, unknown>;

function hashToken(token: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

export function normalizeWalletAddress(address: string) {
  try {
    return getAddress(address);
  } catch {
    throw new Error("Wallet address is invalid.");
  }
}

export function isConfiguredAdminWallet(walletAddress: string) {
  const configured = getAdminWalletAddress();
  if (!configured) {
    return false;
  }

  try {
    return normalizeWalletAddress(configured).toLowerCase() === normalizeWalletAddress(walletAddress).toLowerCase();
  } catch {
    return false;
  }
}

function buildLoginMessage(walletAddress: string, nonce: string) {
  return [
    `${getAppName()} にログインします。`,
    "",
    `Wallet: ${walletAddress}`,
    `Domain: ${getConfiguredDomain()}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    "",
    "この署名でガス代は発生しません。"
  ].join("\n");
}

export function createLoginNonce(rawAddress: string) {
  const walletAddress = normalizeWalletAddress(rawAddress);
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = buildLoginMessage(walletAddress, nonce);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + NONCE_TTL_MS;

  getDb()
    .prepare(
      `INSERT INTO wallet_nonces (wallet_address, nonce, message, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(wallet_address) DO UPDATE SET
         nonce = excluded.nonce,
         message = excluded.message,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at`
    )
    .run(walletAddress, nonce, message, expiresAt, now);

  return { walletAddress, message, expiresAt };
}

export async function verifyWalletNonce(rawAddress: string, signature: string) {
  const walletAddress = normalizeWalletAddress(rawAddress);
  const row = getDb()
    .prepare("SELECT message, expires_at FROM wallet_nonces WHERE wallet_address = ?")
    .get(walletAddress) as Row | undefined;

  if (!row || Number(row.expires_at) < Date.now()) {
    throw new Error("Login request expired. Please connect your wallet again.");
  }

  const verified = await verifyMessage({
    address: walletAddress as Address,
    message: String(row.message),
    signature: signature as `0x${string}`
  });

  getDb().prepare("DELETE FROM wallet_nonces WHERE wallet_address = ?").run(walletAddress);

  if (!verified) {
    throw new Error("Wallet signature could not be verified.");
  }

  return walletAddress;
}

export function createSession(walletAddress: string, role: SessionRole, nftConfigVersion: number | null) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  getDb()
    .prepare(
      `INSERT INTO sessions (token_hash, wallet_address, role, nft_config_version, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(tokenHash, walletAddress, role, nftConfigVersion, expiresAt, new Date().toISOString());

  return { token, maxAge: SESSION_TTL_SECONDS };
}

function mapSession(row: Row): Session {
  return {
    tokenHash: String(row.token_hash),
    walletAddress: String(row.wallet_address),
    role: String(row.role) as SessionRole,
    nftConfigVersion: row.nft_config_version === null ? null : Number(row.nft_config_version),
    expiresAt: Number(row.expires_at)
  };
}

export function getSessionByToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const createdAfter = new Date(Date.now() - SESSION_TTL_SECONDS * 1000).toISOString();
  const row = getDb()
    .prepare(
      `SELECT * FROM sessions
       WHERE token_hash = ?
         AND revoked_at IS NULL
         AND expires_at > ?
         AND created_at > ?`
    )
    .get(hashToken(token), Date.now(), createdAfter) as Row | undefined;

  return row ? mapSession(row) : null;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return getSessionByToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export function revokeSessionToken(token: string | undefined) {
  if (!token) {
    return;
  }
  getDb()
    .prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(Date.now(), hashToken(token));
}

export async function getMemberContext() {
  const session = await getCurrentSession();
  if (!session || session.role !== "member") {
    return null;
  }

  const member = getMember(session.walletAddress);
  const config = getNftConfig();
  if (!member || member.suspended || session.nftConfigVersion !== config.version) {
    return null;
  }

  return { session, member };
}

export async function getAdminContext() {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return null;
  }

  if (!isConfiguredAdminWallet(session.walletAddress)) {
    return null;
  }

  return { session };
}

export async function getPortalContext() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  if (isConfiguredAdminWallet(session.walletAddress)) {
    const member = ensureMemberProfile(session.walletAddress);
    if (!member) {
      return null;
    }
    return { session, member, isAdmin: true };
  }

  if (session.role !== "member") {
    return null;
  }

  const member = getMember(session.walletAddress);
  const config = getNftConfig();
  if (!member || member.suspended || session.nftConfigVersion !== config.version) {
    return null;
  }

  return { session, member, isAdmin: false };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS
};
