import { NextRequest, NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { listAdminFaucetClaims } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAdminContext();
  if (!admin) {
    return jsonError("管理者認証が必要です。", 401);
  }

  const query = request.nextUrl.searchParams.get("query") || "";
  const status = request.nextUrl.searchParams.get("status") || "";
  return NextResponse.json({ claims: listAdminFaucetClaims(query, status) });
}
