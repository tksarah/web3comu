import { NextResponse } from "next/server";

import { getAdminContext, normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { verifyNftOwnership } from "@/lib/nft";
import { getNftConfig } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const body = (await request.json()) as { walletAddress?: string };
    if (!body.walletAddress) {
      return jsonError("ウォレットアドレスを入力してください。");
    }

    const walletAddress = normalizeWalletAddress(body.walletAddress);
    const verification = await verifyNftOwnership(walletAddress, getNftConfig());
    return NextResponse.json({
      walletAddress,
      ok: verification.ok,
      reason: verification.reason
    });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
