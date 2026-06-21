import { NextResponse } from "next/server";

import { normalizeWalletAddress } from "@/lib/auth";
import { createFaucetNonce } from "@/lib/faucet";
import { errorMessage, jsonError } from "@/lib/http";
import {
  auditClientId,
  checkRateLimit,
  faucetRateLimitKey,
  getClientIp,
  logFaucetAudit
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const NONCE_RATE_LIMIT = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletAddress?: string; chainId?: number };
    if (!body.walletAddress || !body.chainId) {
      return jsonError("Wallet address and chain id are required.");
    }

    const walletAddress = normalizeWalletAddress(body.walletAddress);
    const chainId = Number(body.chainId);
    const clientIp = getClientIp(request);
    const client = auditClientId(clientIp);
    const rateLimit = checkRateLimit(
      faucetRateLimitKey("nonce", clientIp, walletAddress, chainId),
      NONCE_RATE_LIMIT,
      RATE_LIMIT_WINDOW_MS
    );

    if (!rateLimit.allowed) {
      logFaucetAudit("warn", "nonce_rate_limited", {
        walletAddress,
        chainId,
        client,
        retryAfterSeconds: rateLimit.retryAfterSeconds
      });
      return NextResponse.json(
        { error: "Too many faucet requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const nonce = createFaucetNonce(walletAddress, chainId);
    logFaucetAudit("info", "nonce_created", { walletAddress, chainId, client });
    return NextResponse.json(nonce);
  } catch (error) {
    logFaucetAudit("warn", "nonce_failed", { reason: errorMessage(error) });
    return jsonError(errorMessage(error));
  }
}
