import { NextResponse } from "next/server";
import {
  createLocalSession,
  hasLocalPassword,
  LOCAL_SESSION_COOKIE,
  verifyLocalPassword,
} from "@/lib/local/auth";
import { apiError, requireSameOrigin } from "@/lib/local/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    if (!hasLocalPassword()) {
      return NextResponse.json({ error: "Create a local password before signing in." }, { status: 409 });
    }
    const body = await request.json() as { password?: unknown };
    if (typeof body.password !== "string" || !verifyLocalPassword(body.password)) {
      return NextResponse.json({ error: "The password is incorrect." }, { status: 401 });
    }

    const { token } = createLocalSession();
    const response = NextResponse.json({ data: { signedIn: true } });
    response.cookies.set(LOCAL_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
