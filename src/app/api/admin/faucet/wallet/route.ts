import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { getFaucetWalletStatus } from "@/lib/faucet";
import { errorMessage, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("管理者認証が必要です。", 401);
    }

    return NextResponse.json(await getFaucetWalletStatus());
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
