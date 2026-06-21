import crypto from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  getAddress,
  http,
  parseEther,
  verifyMessage,
  type Address
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { normalizeWalletAddress } from "@/lib/auth";
import { getFaucetChain } from "@/lib/chains";
import { getDb } from "@/lib/db";
import { getAppName, getConfiguredDomain, getFaucetPrivateKey } from "@/lib/env";
import {
  getFaucetSetting,
  listFaucetSettings,
  markFaucetClaimConfirmed,
  markFaucetClaimSubmitted
} from "@/lib/repository";
import type { FaucetClaim } from "@/lib/types";

const FAUCET_NONCE_TTL_MS = 10 * 60 * 1000;

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildFaucetMessage(walletAddress: string, chainId: number, nonce: string) {
  const chain = getFaucetChain(chainId);
  if (!chain) {
    throw new Error("対応していないFaucetネットワークです。");
  }

  return [
    `${getAppName()} Faucet受け取りリクエスト`,
    "",
    `ウォレット: ${walletAddress}`,
    `ネットワーク: ${chain.name}`,
    `Chain ID: ${chain.id}`,
    `ドメイン: ${getConfiguredDomain()}`,
    `Nonce: ${nonce}`,
    `発行日時: ${new Date().toISOString()}`,
    "",
    "この署名はウォレット所有確認のためだけに使われます。署名だけでガス代は発生しません。"
  ].join("\n");
}

export function createFaucetNonce(rawAddress: string, chainId: number) {
  const walletAddress = normalizeWalletAddress(rawAddress);
  const chain = getFaucetChain(chainId);
  if (!chain) {
    throw new Error("対応していないFaucetネットワークです。");
  }

  const nonce = crypto.randomUUID();
  const message = buildFaucetMessage(walletAddress, chain.id, nonce);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + FAUCET_NONCE_TTL_MS;

  getDb()
    .prepare(
      `INSERT INTO faucet_nonces (wallet_address, chain_id, nonce, message, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(wallet_address, chain_id) DO UPDATE SET
         nonce = excluded.nonce,
         message = excluded.message,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at`
    )
    .run(walletAddress, chain.id, nonce, message, expiresAt, now);

  return { walletAddress, chainId: chain.id, message, expiresAt };
}

export async function verifyFaucetNonce(rawAddress: string, chainId: number, signature: string) {
  const walletAddress = normalizeWalletAddress(rawAddress);
  const chain = getFaucetChain(chainId);
  if (!chain) {
    throw new Error("対応していないFaucetネットワークです。");
  }

  const row = getDb()
    .prepare("SELECT message, expires_at FROM faucet_nonces WHERE wallet_address = ? AND chain_id = ?")
    .get(walletAddress, chain.id) as Row | undefined;

  if (!row || Number(row.expires_at) < Date.now()) {
    throw new Error("Faucetリクエストの有効期限が切れました。もう一度署名してください。");
  }

  const verified = await verifyMessage({
    address: walletAddress as Address,
    message: text(row.message),
    signature: signature as `0x${string}`
  });

  getDb()
    .prepare("DELETE FROM faucet_nonces WHERE wallet_address = ? AND chain_id = ?")
    .run(walletAddress, chain.id);

  if (!verified) {
    throw new Error("ウォレット署名を検証できませんでした。");
  }

  return walletAddress;
}

function normalizeFaucetPrivateKey() {
  const privateKey = getFaucetPrivateKey();
  if (!privateKey) {
    throw new Error("FAUCET_PRIVATE_KEYが設定されていません。");
  }

  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error("FAUCET_PRIVATE_KEYの形式が正しくありません。");
  }
  return normalized as `0x${string}`;
}

function getFaucetAccount() {
  return privateKeyToAccount(normalizeFaucetPrivateKey());
}

function createConfiguredChain(chainId: number, name: string, rpcUrl: string) {
  const chain = getFaucetChain(chainId);
  if (!chain) {
    throw new Error("対応していないFaucetネットワークです。");
  }

  return defineChain({
    id: chain.id,
    name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: {
      default: {
        http: [rpcUrl]
      }
    }
  });
}

function createFaucetPublicClient(chainId: number, name: string, rpcUrl: string) {
  return createPublicClient({
    chain: createConfiguredChain(chainId, name, rpcUrl),
    transport: http(rpcUrl)
  });
}

export async function getFaucetWalletStatus() {
  if (!getFaucetPrivateKey()) {
    return {
      configured: false,
      walletAddress: null,
      balances: []
    };
  }

  const account = getFaucetAccount();
  const settings = listFaucetSettings();
  const balances = await Promise.all(
    settings.map(async (setting) => {
      try {
        const client = createFaucetPublicClient(setting.chainId, setting.chainName, setting.rpcUrl);
        const balance = await client.getBalance({ address: account.address });
        return {
          chainId: setting.chainId,
          chainName: setting.chainName,
          balanceEth: formatEther(balance),
          error: null
        };
      } catch (error) {
        return {
          chainId: setting.chainId,
          chainName: setting.chainName,
          balanceEth: null,
          error: error instanceof Error ? error.message : "残高を取得できませんでした。"
        };
      }
    })
  );

  return {
    configured: true,
    walletAddress: account.address,
    balances
  };
}

export async function sendFaucetClaim(claim: FaucetClaim) {
  const setting = getFaucetSetting(claim.chainId);
  if (!setting?.enabled) {
    throw new Error("このネットワークのFaucetは無効です。");
  }

  const account = getFaucetAccount();
  const configuredChain = createConfiguredChain(setting.chainId, setting.chainName, setting.rpcUrl);
  const publicClient = createFaucetPublicClient(setting.chainId, setting.chainName, setting.rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: configuredChain,
    transport: http(setting.rpcUrl)
  });

  const to = getAddress(claim.walletAddress) as Address;
  const value = parseEther(claim.amountEth);
  if (value <= 0n) {
    throw new Error("Faucet支給額が設定されていません。");
  }

  const balance = await publicClient.getBalance({ address: account.address });
  let estimatedFee = 0n;
  try {
    const gas = await publicClient.estimateGas({ account: account.address, to, value });
    const gasPrice = await publicClient.getGasPrice();
    estimatedFee = gas * gasPrice;
  } catch {
    estimatedFee = 0n;
  }

  if (balance < value + estimatedFee) {
    throw new Error("Faucet送金元ウォレットの残高が不足しています。");
  }

  const txHash = await walletClient.sendTransaction({ to, value });
  let updated = markFaucetClaimSubmitted(claim.id, txHash, account.address);
  if (!updated) {
    throw new Error("Faucet送金履歴を更新できませんでした。");
  }

  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 10_000 });
    if (receipt.status === "success") {
      updated = markFaucetClaimConfirmed(claim.id) || updated;
    }
  } catch {
    // tx hash is already recorded; confirmation can be checked later from the explorer.
  }

  return updated;
}
