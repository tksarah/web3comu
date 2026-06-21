import { NextResponse } from "next/server";

import { sendFaucetClaim, verifyFaucetNonce } from "@/lib/faucet";
import { errorMessage, jsonError } from "@/lib/http";
import { createFaucetClaim, markFaucetClaimFailed } from "@/lib/repository";
import type { FaucetClaim } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let claim: FaucetClaim | null = null;

  try {
    const body = (await request.json()) as {
      walletAddress?: string;
      chainId?: number;
      signature?: string;
    };

    if (!body.walletAddress || !body.chainId || !body.signature) {
      return jsonError("ウォレットアドレス、ネットワーク、署名が必要です。");
    }

    const walletAddress = await verifyFaucetNonce(body.walletAddress, Number(body.chainId), body.signature);
    claim = createFaucetClaim(walletAddress, Number(body.chainId));
    if (!claim) {
      return jsonError("Faucet送金履歴を作成できませんでした。");
    }
    const sentClaim = await sendFaucetClaim(claim);
    return NextResponse.json({ claim: sentClaim, txHash: sentClaim.txHash });
  } catch (error) {
    if (claim) {
      markFaucetClaimFailed(claim.id, errorMessage(error));
    }
    return jsonError(errorMessage(error));
  }
}
