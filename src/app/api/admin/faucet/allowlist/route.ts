import { NextRequest, NextResponse } from "next/server";

import { getAdminContext, normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { listFaucetAllowlist, upsertFaucetAllowlistEntry } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAdminContext();
  if (!admin) {
    return jsonError("管理者認証が必要です。", 401);
  }

  const query = request.nextUrl.searchParams.get("query") || "";
  return NextResponse.json({ allowlist: listFaucetAllowlist(query) });
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("管理者認証が必要です。", 401);
    }

    const body = (await request.json()) as { walletAddress?: string; note?: unknown };
    if (!body.walletAddress) {
      return jsonError("ウォレットアドレスが必要です。");
    }

    const entry = upsertFaucetAllowlistEntry({
      walletAddress: normalizeWalletAddress(body.walletAddress),
      note: body.note
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
