import { NextResponse } from "next/server";

import { createLoginNonce, normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { authRateLimitKey, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const NONCE_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    if (!body.address) {
      return jsonError("Wallet address is required.");
    }

    const walletAddress = normalizeWalletAddress(body.address);
    const rateLimit = checkRateLimit(
      authRateLimitKey("nonce", getClientIp(request), walletAddress),
      NONCE_RATE_LIMIT,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    return NextResponse.json(createLoginNonce(walletAddress));
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
