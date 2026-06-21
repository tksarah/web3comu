import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getPortalContext } from "@/lib/auth";
import { getUploadDir } from "@/lib/env";
import { findImageRecord } from "@/lib/repository";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ filename: string }>;
};

function contentDispositionFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(_request: Request, { params }: Params) {
  const portal = await getPortalContext();
  if (!portal) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { filename } = await params;
  if (filename !== path.basename(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const record = findImageRecord(filename);
  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(path.join(getUploadDir(), filename));
    return new NextResponse(file, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${contentDispositionFilename(filename)}"`,
        "Content-Type": String(record.profile_image_mime || "application/octet-stream"),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
