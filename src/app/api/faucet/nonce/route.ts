import { NextResponse } from "next/server";

import { createFaucetNonce } from "@/lib/faucet";
import { errorMessage, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletAddress?: string; chainId?: number };
    if (!body.walletAddress || !body.chainId) {
      return jsonError("ウォレットアドレスとネットワークが必要です。");
    }

    return NextResponse.json(createFaucetNonce(body.walletAddress, Number(body.chainId)));
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
