import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDataDirectory } from "@/lib/local/db";
import { requireLocalAuth } from "@/lib/local/http";
import { getLocalAsset } from "@/lib/local/store";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Image was not found." }, { status: 404 });
  }

  const asset = getLocalAsset(id);
  if (!asset || path.basename(asset.file_name) !== asset.file_name) {
    return NextResponse.json({ error: "Image was not found." }, { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(getDataDirectory(), "assets", asset.file_name));
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.mime_type,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Image file is missing from local storage." }, { status: 404 });
    }
    console.error("Could not read local business asset:", error);
    return NextResponse.json({ error: "Image could not be loaded." }, { status: 500 });
  }
}
