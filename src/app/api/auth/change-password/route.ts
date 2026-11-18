import { NextResponse } from "next/server";
import { apiError, requireAppAuth, requireSameOrigin } from "@/lib/supabase/http";
import { getSharedAuthEmail } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;

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

    const email = getSharedAuthEmail();
    const { error: verifyError } = await auth.context.supabase.auth.signInWithPassword({
      email,
      password: body.currentPassword,
    });
    if (verifyError) {
      return NextResponse.json({ error: "The current password is incorrect." }, { status: 401 });
    }

    const { error: updateError } = await auth.context.supabase.auth.updateUser({ password: body.newPassword });
    if (updateError) throw updateError;
    return NextResponse.json({ data: { changed: true } });
  } catch (error) {
    return apiError(error);
  }
}
