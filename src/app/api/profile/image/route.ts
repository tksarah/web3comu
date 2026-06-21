import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getMemberContext } from "@/lib/auth";
import { getUploadDir } from "@/lib/env";
import { errorMessage, jsonError } from "@/lib/http";
import { updateProfileImage } from "@/lib/repository";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export async function POST(request: Request) {
  try {
    const context = await getMemberContext();
    if (!context) {
      return jsonError("Member authentication is required.", 401);
    }

    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return jsonError("Profile image is required.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return jsonError("Profile image must be 3MB or smaller.");
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return jsonError("Only jpg, png, and webp images are supported.");
    }

    const uploadDir = getUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${context.session.walletAddress.toLowerCase()}-${crypto.randomUUID()}.${ext}`;
    const destination = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destination, buffer, { flag: "wx" });

    const previous = context.member.profileImageFilename;
    if (previous) {
      await fs.unlink(path.join(uploadDir, previous)).catch(() => undefined);
    }

    const profile = updateProfileImage(context.session.walletAddress, filename, file.type);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(errorMessage(error));
  }
}
