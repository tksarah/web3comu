import { NextRequest, NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { createPortalContent, listAdminPortalContent } from "@/lib/repository";
import type { PortalContentType } from "@/lib/types";

export const runtime = "nodejs";

function contentTypeFromQuery(value: string | null): PortalContentType | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "notice" || value === "resource") {
    return value;
  }
  throw new Error("コンテンツ種別が不正です。");
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const type = contentTypeFromQuery(request.nextUrl.searchParams.get("type"));
    return NextResponse.json({ contents: listAdminPortalContent(type) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const body = await request.json();
    return NextResponse.json({ content: createPortalContent(body) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
