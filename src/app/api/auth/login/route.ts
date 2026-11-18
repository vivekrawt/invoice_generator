import { NextResponse } from "next/server";
import { requireSameOrigin, apiError } from "@/lib/supabase/http";
import { createSupabaseServerClient, getSharedAuthEmail } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) {
      return NextResponse.json({ error: "Enter the shared password (12 to 128 characters)." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: getSharedAuthEmail(),
      password: body.password,
    });
    if (error) {
      return NextResponse.json({ error: "The shared password is incorrect." }, { status: 401 });
    }
    return NextResponse.json({ data: { signedIn: true } });
  } catch (error) {
    return apiError(error);
  }
}
