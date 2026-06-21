import path from "node:path";

import { SONEIUM_MAINNET } from "@/lib/chains";

export function getConfiguredDomain() {
  return process.env.DOMAIN?.trim() || "localhost";
}

export function getDatabasePath() {
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured) {
    return path.join(process.cwd(), "data", "portal.sqlite");
  }

  if (configured.startsWith("file:")) {
    return configured.slice("file:".length);
  }

  return configured;
}

export function getUploadDir() {
  return process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "data", "uploads");
}

export function getDefaultRpcUrl() {
  const configured = process.env.EVM_RPC_URL?.trim();
  if (!configured || configured.includes("YOUR_PROJECT_ID")) {
    return SONEIUM_MAINNET.rpcUrl;
  }

  return configured;
}

export function getWalletConnectProjectId() {
  return (
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
    process.env.WALLETCONNECT_PROJECT_ID?.trim() ||
    ""
  );
}

export function getAdminWalletAddress() {
  return process.env.ADMIN_WALLET_ADDRESS?.trim() || "";
}

export function getSessionSecret() {
  return process.env.SESSION_SECRET?.trim() || "development-only-session-secret";
}

export function getFaucetPrivateKey() {
  return process.env.FAUCET_PRIVATE_KEY?.trim() || "";
}

export function getAppName() {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Web3コミュニティポータル";
}
