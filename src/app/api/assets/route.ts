import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  hasValidBusinessImageSignature,
  isAllowedBusinessImageType,
  MAX_BUSINESS_ASSET_SIZE,
} from "@/lib/asset-validation";
import { getDataDirectory } from "@/lib/local/db";
import { apiError, requireLocalAuth, requireSameOrigin } from "@/lib/local/http";
import { addLocalAsset } from "@/lib/local/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart image upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const type = formData.get("type");
  if (!(file instanceof File) || (type !== "logo" && type !== "qr")) {
    return NextResponse.json({ error: "Choose an image and specify logo or qr." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BUSINESS_ASSET_SIZE) {
    return NextResponse.json({ error: "Image files must be between 1 byte and 2 MiB." }, { status: 400 });
  }
  if (!isAllowedBusinessImageType(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are accepted." }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidBusinessImageSignature(bytes, file.type)) {
      return NextResponse.json({ error: "The uploaded file content does not match its image type." }, { status: 400 });
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const id = randomUUID();
    const fileName = `${id}.${extension}`;
    const directory = path.join(getDataDirectory(), "assets");
    const filePath = path.join(directory, fileName);
    await mkdir(directory, { recursive: true });

    try {
      await writeFile(filePath, bytes, { flag: "wx" });
      addLocalAsset({ id, type, file_name: fileName, mime_type: file.type });
    } catch (error) {
      try {
        await unlink(filePath);
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Failed to remove an incomplete local asset upload:", cleanupError);
        }
      }
      throw error;
    }

    const url = `/api/assets/${id}`;
    return NextResponse.json({ data: { path: url, url } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
