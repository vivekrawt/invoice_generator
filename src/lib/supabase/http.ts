import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { AppError } from "../app-error";
import { createSupabaseServerClient, getCurrentAppUser } from "./server";

type AuthenticatedContext = {
  supabase: SupabaseClient<Database> | null;
  user: User;
};

type AuthResult =
  | { ok: true; context: AuthenticatedContext }
  | { ok: false; response: NextResponse };

export async function requireAppAuth(): Promise<AuthResult> {
  const user = await getCurrentAppUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in with the password to continue." },
        { status: 401 }
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  return { ok: true, context: { supabase, user } };
}

export function requireSameOrigin(_request: Request) {
  // Allow safe requests on Vercel deployment
  return null;
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  console.error("Application API error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
