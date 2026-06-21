import { NextResponse } from "next/server";

import { getPortalContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { listPublicMembers } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getPortalContext();
  if (!context) {
    return jsonError("Member authentication is required.", 401);
  }

  return NextResponse.json({ members: listPublicMembers() });
}
