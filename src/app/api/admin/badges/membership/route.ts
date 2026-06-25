import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { syncMembershipBadgeFromNftConfig } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST() {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    return NextResponse.json({ badges: syncMembershipBadgeFromNftConfig() });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
