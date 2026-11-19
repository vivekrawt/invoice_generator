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
    const allowedTypes = ["logo", "qr", "signature", "stamp"] as const;
    if (!(file instanceof File) || typeof type !== "string" || !allowedTypes.includes(type as any)) {
      return NextResponse.json(
        { error: "Choose an image and specify logo, qr, signature, or stamp." },
        { status: 400 }
      );
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

    const id = randomUUID();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // If Supabase is connected, attempt upload to storage
    if (auth.context.supabase) {
      try {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const objectPath = `${auth.context.user.id}/${id}.${extension}`;
        const fileName = (file.name.split(/[\\/]/).pop() || "image").slice(0, 200);

        const { error: uploadError } = await auth.context.supabase.storage
          .from("abira-business-assets")
          .upload(objectPath, bytes, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (!uploadError) {
          await addAsset(auth.context, {
            id,
            type: type as "logo" | "qr" | "signature" | "stamp",
            object_path: objectPath,
            file_name: fileName,
            mime_type: file.type,
            size_bytes: file.size,
          });
          return NextResponse.json({
            data: {
              id,
              type,
              url: dataUrl,
              path: dataUrl,
              objectPath: `/api/assets/${id}`,
            },
          });
        }
      } catch (storageErr) {
        console.warn("Notice: Supabase storage upload fell back to data URL:", storageErr);
      }
    }

    // Default fast & resilient fallback: Data URL
    return NextResponse.json({
      data: {
        id,
        type,
        url: dataUrl,
        path: dataUrl,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
