import * as React from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { hasLocalPassword } from "@/lib/local/auth";
import { hasCurrentLocalSession } from "@/lib/local/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasLocalPassword() || !(await hasCurrentLocalSession())) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
