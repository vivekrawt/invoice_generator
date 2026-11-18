import { NextResponse } from "next/server";
import { LOCAL_SESSION_COOKIE, isLocalSessionValid } from "./auth.ts";
import { LocalStoreError } from "./store.ts";

export function getSessionToken(request: Request) {
  const cookies = request.headers.get("cookie");
  if (!cookies) return undefined;
  const entry = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCAL_SESSION_COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(LOCAL_SESSION_COOKIE.length + 1)) : undefined;
}

export function requireLocalAuth(request: Request) {
  if (isLocalSessionValid(getSessionToken(request))) return null;
  return NextResponse.json({ error: "Sign in with your local password to continue." }, { status: 401 });
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    if (new URL(origin).host === request.headers.get("host")) return null;
  } catch {
    return NextResponse.json({ error: "Request origin is invalid." }, { status: 403 });
  }
  return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
}

export function apiError(error: unknown) {
  if (error instanceof LocalStoreError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  console.error("Local application API error:", error);
  return NextResponse.json({ error: "The local operation could not be completed." }, { status: 500 });
}
