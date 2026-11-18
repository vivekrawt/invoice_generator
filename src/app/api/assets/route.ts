import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  hasValidBusinessImageSignature,
  isAllowedBusinessImageType,
  MAX_BUSINESS_ASSET_SIZE,
} from "@/lib/asset-validation";
import { apiError, requireAppAuth, requireSameOrigin } from "@/lib/supabase/http";
import { addAsset } from "@/lib/supabase/store";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;

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

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidBusinessImageSignature(bytes, file.type)) {
      return NextResponse.json({ error: "The uploaded file content does not match its image type." }, { status: 400 });
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const id = randomUUID();
    const objectPath = `${auth.context.user.id}/${id}.${extension}`;
    const fileName = (file.name.split(/[\\/]/).pop() || "image").slice(0, 200);
    const { error: uploadError } = await auth.context.supabase.storage
      .from("abira-business-assets")
      .upload(objectPath, bytes, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    try {
      await addAsset(auth.context, {
        id,
        type,
        object_path: objectPath,
        file_name: fileName,
        mime_type: file.type,
        size_bytes: file.size,
      });
    } catch (error) {
      const { error: cleanupError } = await auth.context.supabase.storage
        .from("abira-business-assets")
        .remove([objectPath]);
      if (cleanupError) console.error("Could not remove an incomplete Supabase asset upload:", cleanupError);
      throw error;
    }

    const url = `/api/assets/${id}`;
    return NextResponse.json({ data: { path: url, url } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
