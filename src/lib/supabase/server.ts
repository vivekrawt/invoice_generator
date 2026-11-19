import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes("placeholder")) {
    return null;
  }
  return { url, anonKey };
}

export function getSharedAuthEmail() {
  return process.env.SUPABASE_AUTH_EMAIL || "staff@abiraenterprises.com";
}

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies
        }
      },
    },
  });
}

export async function getCurrentAppUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("abira_auth")?.value;

    // Static password authentication cookie check
    if (sessionCookie === "authenticated") {
      return {
        id: "abira-staff-admin",
        email: "staff@abiraenterprises.com",
        app_metadata: { role: "admin" },
        user_metadata: { role: "admin" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User;
    }

    const config = getSupabaseConfig();
    if (!config) return null;

    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (error.name === "AuthSessionMissingError" || error.status === 401) return null;
      return null;
    }
    return data.user;
  } catch (err) {
    console.warn("Auth check notice:", err);
    return null;
  }
}
