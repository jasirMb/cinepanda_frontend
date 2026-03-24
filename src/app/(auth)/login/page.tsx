"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await loginAdmin({ username: email, password });
      login(token);
      router.replace(redirectTo);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "Invalid credentials. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/cinepanda-logo.png"
            alt="CinePanda Entertainment logo"
            width={96}
            height={96}
            priority
            className="mb-3 drop-shadow-sm"
          />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            CinePanda Admin
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sign in to manage leads, projects, and more.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
              Email
            </label>
            <Input
              type="text"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cinepanda.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

