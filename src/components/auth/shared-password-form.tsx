"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, jsonBody } from "@/lib/api-client";

export function SharedPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    setLoading(true);
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: jsonBody({ password }),
      });
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b1f3a] text-2xl font-bold text-white shadow-md">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ABIRA ENTERPRISES</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">
            Invoice Manager
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-slate-900">
              Access your invoices
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter the shared password to access the hosted invoice manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 bg-[#0b1f3a] text-white hover:bg-[#132c50]"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-1 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
              <Building2 className="h-3 w-3" />
              <span>Single shared password</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
