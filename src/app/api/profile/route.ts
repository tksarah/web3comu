import { NextResponse } from "next/server";

import { getPortalContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { updateProfile } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getPortalContext();
  if (!context) {
    return jsonError("Member authentication is required.", 401);
  }

  return NextResponse.json({ profile: context.member });
}

export async function PUT(request: Request) {
  try {
    const context = await getPortalContext();
    if (!context) {
      return jsonError("Member authentication is required.", 401);
    }

    const body = await request.json();
    const profile = updateProfile(context.session.walletAddress, body);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
