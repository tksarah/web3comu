import { NextResponse } from "next/server";

import { getAdminContext, normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { setForceProfilePrivate } from "@/lib/repository";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ wallet: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const { wallet } = await params;
    const body = (await request.json()) as { forceProfilePrivate?: boolean };
    const member = setForceProfilePrivate(normalizeWalletAddress(wallet), Boolean(body.forceProfilePrivate));
    return NextResponse.json({ member });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
