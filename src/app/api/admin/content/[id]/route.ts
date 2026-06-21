import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/auth";
import { errorMessage, jsonError } from "@/lib/http";
import { deletePortalContent, updatePortalContent } from "@/lib/repository";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function parseContentId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("コンテンツIDが不正です。");
  }
  return id;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const { id } = await params;
    const body = await request.json();
    return NextResponse.json({ content: updatePortalContent(parseContentId(id), body) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return jsonError("Admin authentication is required.", 401);
    }

    const { id } = await params;
    return NextResponse.json({ content: deletePortalContent(parseContentId(id)) });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
