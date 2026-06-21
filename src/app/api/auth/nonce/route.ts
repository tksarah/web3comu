import { NextResponse } from "next/server";

import { createLoginNonce } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    if (!body.address) {
      return jsonError("Wallet address is required.");
    }

    return NextResponse.json(createLoginNonce(body.address));
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
