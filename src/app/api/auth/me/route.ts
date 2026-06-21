import { NextResponse } from "next/server";

import { getAdminContext, getCurrentSession, getMemberContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  if (session.role === "admin") {
    const admin = await getAdminContext();
    return NextResponse.json({
      authenticated: Boolean(admin),
      role: admin ? "admin" : null,
      walletAddress: admin?.session.walletAddress ?? null
    });
  }

  const member = await getMemberContext();
  return NextResponse.json({
    authenticated: Boolean(member),
    role: member ? "member" : null,
    walletAddress: member?.session.walletAddress ?? null,
    profile: member?.member ?? null
  });
}
