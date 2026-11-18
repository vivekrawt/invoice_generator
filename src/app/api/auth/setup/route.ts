import { NextResponse } from "next/server";
import {
  createLocalSession,
  hasLocalPassword,
  LOCAL_SESSION_COOKIE,
  setInitialLocalPassword,
} from "@/lib/local/auth";
import { apiError, requireSameOrigin } from "@/lib/local/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    if (hasLocalPassword()) {
      return NextResponse.json({ error: "A local password is already configured." }, { status: 409 });
    }

    const body = await request.json() as { password?: unknown; confirmPassword?: unknown };
    if (typeof body.password !== "string" || body.password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    setInitialLocalPassword(body.password);
    const { token } = createLocalSession();
    const response = NextResponse.json({ data: { configured: true } });
    response.cookies.set(LOCAL_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Choose a password")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
