import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { getNftConfig, saveNftConfig } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminContext();
  if (!admin) {
    return jsonError("Admin authentication is required.", 401);
  }

  return NextResponse.json({ config: getNftConfig() });
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const body = await request.json();
    return NextResponse.json({ config: saveNftConfig(body) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
