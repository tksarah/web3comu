import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getPortalContext } from "@/lib/auth";
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

function detectImageMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const context = await getPortalContext();
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

    const buffer = Buffer.from(await file.arrayBuffer());
    if (detectImageMime(buffer) !== file.type) {
      return jsonError("Uploaded file content does not match the selected image type.");
    }

    const uploadDir = getUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${context.session.walletAddress.toLowerCase()}-${crypto.randomUUID()}.${ext}`;
    const destination = path.join(uploadDir, filename);
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
