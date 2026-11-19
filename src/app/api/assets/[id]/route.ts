import { NextResponse } from "next/server";
import { apiError, requireAppAuth } from "@/lib/supabase/http";
import { getAsset } from "@/lib/supabase/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Image was not found." }, { status: 404 });
    }

    if (!auth.context.supabase) {
      return NextResponse.json({ error: "Image storage is not active." }, { status: 404 });
    }

    const asset = await getAsset(auth.context, id);
    if (!asset) return NextResponse.json({ error: "Image was not found." }, { status: 404 });
    const { data, error } = await auth.context.supabase.storage
      .from("abira-business-assets")
      .download(asset.object_path);
    if (error?.statusCode === "404") {
      return NextResponse.json({ error: "Image file is missing from Supabase Storage." }, { status: 404 });
    }
    if (error) throw error;

    return new Response(new Uint8Array(await data.arrayBuffer()), {
      headers: {
        "Content-Type": asset.mime_type,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
