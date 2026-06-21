import { NextRequest, NextResponse } from "next/server";

import { normalizeWalletAddress } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import {
  getFaucetAllowlistEntry,
  getJstDate,
  listFaucetSettings,
  listTodaysActiveFaucetClaims
} from "@/lib/repository";

export const runtime = "nodejs";

function hasPositiveAmount(value: string) {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return false;
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole || "0") > 0n || /[1-9]/.test(fraction);
}

export async function GET(request: NextRequest) {
  try {
    const rawWallet = request.nextUrl.searchParams.get("wallet");
    if (!rawWallet) {
      return jsonError("ウォレットアドレスが必要です。");
    }

    const walletAddress = normalizeWalletAddress(rawWallet);
    const allowlistEntry = getFaucetAllowlistEntry(walletAddress);
    const approved = Boolean(allowlistEntry?.active);
    const claims = listTodaysActiveFaucetClaims(walletAddress);
    const settings = listFaucetSettings();

    return NextResponse.json({
      walletAddress,
      approved,
      allowlistEntry,
      claimDateJst: getJstDate(),
      networks: settings.map((setting) => {
        const claim = claims.find((item) => item.chainId === setting.chainId) || null;
        return {
          ...setting,
          claim,
          canRequest: approved && setting.enabled && hasPositiveAmount(setting.amountEth) && !claim
        };
      })
    });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
