"use client";

import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jsonBody, localApi } from "@/lib/local/client";

export function ChangeLocalPasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; error: boolean } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", error: true });
      return;
    }

    try {
      setBusy(true);
      await localApi("/api/auth/change-password", {
        method: "POST",
        body: jsonBody({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ text: "Local password changed successfully.", error: false });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "The local password could not be changed.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#0b1f3a]" />
          <CardTitle className="text-sm font-semibold text-slate-900">Local password</CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Change the password used to unlock this PC&apos;s invoice data.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Use 12 to 128 characters.</p>
          {message && (
            <p className={`text-sm ${message.error ? "text-red-600" : "text-emerald-700"}`} role="status">
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={busy} className="bg-[#0b1f3a] text-white hover:bg-[#132c50]">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
