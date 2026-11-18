import { redirect } from "next/navigation";
import { SharedPasswordForm } from "@/components/auth/shared-password-form";
import { getCurrentAppUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAppUser()) redirect("/");
  return <SharedPasswordForm />;
}
