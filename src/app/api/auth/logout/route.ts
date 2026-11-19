import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  const response = NextResponse.json({ data: { signedOut: true } });
  response.cookies.delete("abira_auth");
  response.cookies.set("abira_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
