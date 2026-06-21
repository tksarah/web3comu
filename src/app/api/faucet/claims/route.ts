import { NextResponse } from "next/server";

import { normalizeWalletAddress } from "@/lib/auth";
import { sendFaucetClaim, verifyFaucetNonce } from "@/lib/faucet";
import { errorMessage, jsonError } from "@/lib/http";
import {
  auditClientId,
  checkRateLimit,
  faucetRateLimitKey,
  getClientIp,
  logFaucetAudit
} from "@/lib/rate-limit";
import { createFaucetClaim, markFaucetClaimFailed } from "@/lib/repository";
import type { FaucetClaim } from "@/lib/types";

export const runtime = "nodejs";

const CLAIM_RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  let claim: FaucetClaim | null = null;
  let auditContext: Record<string, string | number | boolean | null> = {};

  try {
    const body = (await request.json()) as {
      walletAddress?: string;
      chainId?: number;
      signature?: string;
    };

    if (!body.walletAddress || !body.chainId || !body.signature) {
      return jsonError("Wallet address, chain id, and signature are required.");
    }

    const requestedWalletAddress = normalizeWalletAddress(body.walletAddress);
    const chainId = Number(body.chainId);
    const clientIp = getClientIp(request);
    const client = auditClientId(clientIp);
    auditContext = { walletAddress: requestedWalletAddress, chainId, client };

    const rateLimit = checkRateLimit(
      faucetRateLimitKey("claim", clientIp, requestedWalletAddress, chainId),
      CLAIM_RATE_LIMIT,
      RATE_LIMIT_WINDOW_MS
    );

    if (!rateLimit.allowed) {
      logFaucetAudit("warn", "claim_rate_limited", {
        ...auditContext,
        retryAfterSeconds: rateLimit.retryAfterSeconds
      });
      return NextResponse.json(
        { error: "Too many faucet requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const walletAddress = await verifyFaucetNonce(requestedWalletAddress, chainId, body.signature);
    claim = createFaucetClaim(walletAddress, chainId);
    if (!claim) {
      return jsonError("Faucet claim could not be created.");
    }

    const sentClaim = await sendFaucetClaim(claim);
    logFaucetAudit("info", "claim_sent", {
      ...auditContext,
      claimId: sentClaim.id,
      txHash: sentClaim.txHash
    });
    return NextResponse.json({ claim: sentClaim, txHash: sentClaim.txHash });
  } catch (error) {
    if (claim) {
      markFaucetClaimFailed(claim.id, errorMessage(error));
    }
    logFaucetAudit("warn", "claim_failed", { ...auditContext, reason: errorMessage(error) });
    return jsonError(errorMessage(error));
  }
}
