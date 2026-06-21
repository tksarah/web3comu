import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getAdminContext, getMemberContext } from "@/lib/auth";
import { getUploadDir } from "@/lib/env";
import { findImageRecord } from "@/lib/repository";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const [member, admin] = await Promise.all([getMemberContext(), getAdminContext()]);
  if (!member && !admin) {
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
        "Content-Type": String(record.profile_image_mime || "application/octet-stream")
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
