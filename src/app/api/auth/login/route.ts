import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== "string" || !body.password.trim()) {
      return NextResponse.json(
        { error: "Please enter the access password." },
        { status: 400 }
      );
    }

    const trimmed = body.password.trim();
    const normalized = trimmed.replace(/\s+/g, "");

    // Static password: "19995 67 195" or "1999567195"
    const isValid =
      normalized === "1999567195" ||
      trimmed === "19995 67 195" ||
      trimmed === "1999567195";

    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password. Enter the password to access the invoice generator." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ data: { signedIn: true } });
    response.cookies.set("abira_auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Could not process login request." },
      { status: 500 }
    );
  }
}
