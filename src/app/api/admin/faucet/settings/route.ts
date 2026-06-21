import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { listFaucetSettings, saveFaucetSettings } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminContext();
  if (!admin) {
    return jsonError("管理者認証が必要です。", 401);
  }

  return NextResponse.json({ settings: listFaucetSettings() });
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("管理者認証が必要です。", 401);
    }

    const body = (await request.json()) as { settings?: unknown };
    return NextResponse.json({ settings: saveFaucetSettings(body.settings as never) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
