import { NextResponse } from "next/server";

import { getCurrentSession, getPortalContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const portal = await getPortalContext();
  return NextResponse.json({
    authenticated: Boolean(portal),
    role: portal ? (portal.isAdmin ? "admin" : "member") : null,
    walletAddress: portal?.session.walletAddress ?? null,
    profile: portal?.member ?? null
  });
}
