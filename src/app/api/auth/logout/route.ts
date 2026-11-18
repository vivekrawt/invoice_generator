import { NextResponse } from "next/server";
import { apiError, requireSameOrigin } from "@/lib/supabase/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && error.name !== "AuthSessionMissingError") throw error;
    return NextResponse.json({ data: { signedOut: true } });
  } catch (error) {
    return apiError(error);
  }
}
