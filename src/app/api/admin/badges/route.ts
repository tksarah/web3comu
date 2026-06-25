import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { listBadgeConfigs, saveBadgeConfigs } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminContext();
  if (!admin) {
    return jsonError("Admin authentication is required.", 401);
  }

  return NextResponse.json({ badges: listBadgeConfigs() });
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const body = (await request.json()) as { badges?: unknown };
    if (!Array.isArray(body.badges)) {
      return jsonError("バッヂ設定が正しくありません。");
    }

    return NextResponse.json({ badges: saveBadgeConfigs(body.badges as Parameters<typeof saveBadgeConfigs>[0]) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
