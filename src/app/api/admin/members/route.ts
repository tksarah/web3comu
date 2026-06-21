import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { listAdminMembers } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAdminContext();
  if (!admin) {
    return jsonError("Admin authentication is required.", 401);
  }

  const query = request.nextUrl.searchParams.get("query") || "";
  return NextResponse.json({ members: listAdminMembers(query) });
}
