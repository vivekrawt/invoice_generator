import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { AppError } from "../app-error";
import { createSupabaseServerClient } from "./server";

type AuthenticatedContext = {
  supabase: SupabaseClient<Database>;
  user: User;
};

type AuthResult =
  | { ok: true; context: AuthenticatedContext }
  | { ok: false; response: NextResponse };

export async function requireAppAuth(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && error.status !== 401) throw error;
  if (!data.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in with the shared password to continue." }, { status: 401 }),
    };
  }
  return { ok: true, context: { supabase, user: data.user } };
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Origin header is required." }, { status: 403 });
  }
  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null;
  } catch {
    return NextResponse.json({ error: "Request origin is invalid." }, { status: 403 });
  }
  return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  console.error("Application API error:", error);
  return NextResponse.json({ error: "The operation could not be completed." }, { status: 500 });
}
