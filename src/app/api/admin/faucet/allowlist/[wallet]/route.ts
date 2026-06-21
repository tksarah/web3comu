import { NextResponse } from "next/server";

import { getAdminContext, normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { setFaucetAllowlistActive } from "@/lib/repository";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ wallet: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("管理者認証が必要です。", 401);
    }

    const { wallet } = await params;
    const body = (await request.json()) as { active?: boolean };
    const entry = setFaucetAllowlistActive(normalizeWalletAddress(wallet), Boolean(body.active));
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
