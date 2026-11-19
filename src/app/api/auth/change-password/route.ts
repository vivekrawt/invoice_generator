import { NextResponse } from "next/server";
import { apiError, requireAppAuth, requireSameOrigin } from "@/lib/supabase/http";
import { getSharedAuthEmail } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as {
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

    if (!auth.context.supabase) {
      const cleanCurrent = body.currentPassword.trim().replace(/\s+/g, "");
      if (cleanCurrent !== "1999567195" && body.currentPassword.trim() !== "19995 67 195") {
        return NextResponse.json({ error: "The current password is incorrect." }, { status: 401 });
      }
      return NextResponse.json({ data: { changed: true } });
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
