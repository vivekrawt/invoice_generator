import { redirect } from "next/navigation";
import { LocalPasswordForm } from "@/components/auth/local-password-form";
import { hasLocalPassword } from "@/lib/local/auth";
import { hasCurrentLocalSession } from "@/lib/local/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await hasCurrentLocalSession()) redirect("/");
  return <LocalPasswordForm mode={hasLocalPassword() ? "login" : "setup"} />;
}
