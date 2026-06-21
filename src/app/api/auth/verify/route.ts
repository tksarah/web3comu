import { NextResponse } from "next/server";

import {
  createSession,
  isConfiguredAdminWallet,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyWalletNonce
} from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { verifyNftOwnership } from "@/lib/nft";
import { getNftConfig, isMemberSuspended, upsertVerifiedMember } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      signature?: string;
      intent?: "member" | "admin";
    };

    if (!body.address || !body.signature) {
      return jsonError("Wallet address and signature are required.");
    }

    const walletAddress = await verifyWalletNonce(body.address, body.signature);
    const intent = body.intent === "admin" ? "admin" : "member";

    if (isConfiguredAdminWallet(walletAddress)) {
      const session = createSession(walletAddress, "admin", null);
      const response = NextResponse.json({ role: "admin", walletAddress });
      response.cookies.set(SESSION_COOKIE, session.token, {
        ...sessionCookieOptions,
        maxAge: session.maxAge
      });
      return response;
    }

    if (intent === "admin") {
      return jsonError("This wallet is not configured as the administrator.", 403);
    }

    if (isMemberSuspended(walletAddress)) {
      return jsonError("This member account is suspended.", 403);
    }

    const config = getNftConfig();
    const verification = await verifyNftOwnership(walletAddress, config);
    if (!verification.ok) {
      return jsonError(verification.reason || "Required token was not found.", 403);
    }

    upsertVerifiedMember(walletAddress);
    const session = createSession(walletAddress, "member", config.version);
    const response = NextResponse.json({ role: "member", walletAddress });
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...sessionCookieOptions,
      maxAge: session.maxAge
    });
    return response;
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
