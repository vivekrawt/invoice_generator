import { NextResponse } from "next/server";
import { deleteLocalSession, LOCAL_SESSION_COOKIE } from "@/lib/local/auth";
import { getSessionToken, requireSameOrigin } from "@/lib/local/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  deleteLocalSession(getSessionToken(request));
  const response = NextResponse.json({ data: { signedOut: true } });
  response.cookies.set(LOCAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
