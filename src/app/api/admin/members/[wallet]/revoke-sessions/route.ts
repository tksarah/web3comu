import { NextResponse } from "next/server";

import { getAdminContext, normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { revokeMemberSessions } from "@/lib/repository";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ wallet: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const { wallet } = await params;
    revokeMemberSessions(normalizeWalletAddress(wallet));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
