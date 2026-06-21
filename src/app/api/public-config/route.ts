import { NextResponse } from "next/server";

import { DEFAULT_CHAIN } from "@/lib/chains";
import { getWalletConnectProjectId } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    walletConnectProjectId: getWalletConnectProjectId(),
    chain: DEFAULT_CHAIN
  });
}
