import { NextResponse } from "next/server";
import {
  changeLocalPassword,
  createLocalSession,
  LOCAL_SESSION_COOKIE,
} from "@/lib/local/auth";
import { apiError, requireLocalAuth, requireSameOrigin } from "@/lib/local/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json() as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };
    if (
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string" ||
      typeof body.confirmPassword !== "string"
    ) {
      return NextResponse.json({ error: "Enter the current password and the new password twice." }, { status: 400 });
    }
    if (body.newPassword !== body.confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    }
    if (body.newPassword.length < 12 || body.newPassword.length > 128) {
      return NextResponse.json({ error: "Choose a password between 12 and 128 characters." }, { status: 400 });
    }
    if (!changeLocalPassword(body.currentPassword, body.newPassword)) {
      return NextResponse.json({ error: "The current password is incorrect." }, { status: 401 });
    }

    const { token } = createLocalSession();
    const response = NextResponse.json({ data: { changed: true } });
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
