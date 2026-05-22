"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Film,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
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
      // Keep the loading state on until navigation actually swaps the page,
      // otherwise the spinner vanishes and the user sees a static login page
      // while the dashboard is still loading.
      setRedirecting(true);
      router.replace(redirectTo);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "Invalid credentials. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {redirecting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/60 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/95 px-8 py-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
            <Loader2 className="h-8 w-8 animate-spin text-cine-primary" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Signing you in…
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Loading your dashboard
            </div>
          </div>
        </div>
      )}
      {/* Left cinematic panel */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#1B3A57] to-[#0B1220] p-12 text-white">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -top-24 -left-20 h-80 w-80 rounded-full bg-cine-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-[-4rem] h-96 w-96 rounded-full bg-cine-secondary/30 blur-3xl" />
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Spotlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(48,118,161,0.18),_transparent_60%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/15">
            <Image
              src="/cinepanda-logo.png"
              alt="CinePanda"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </div>
          <span className="text-sm font-medium tracking-wide text-slate-200">
            CinePanda Entertainments
          </span>
        </div>

        <div className="relative z-10 max-w-lg animate-in fade-in slide-in-from-bottom-3 duration-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-cine-primary" />
            Admin Console
          </span>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Lights. Camera.{" "}
            <span className="bg-gradient-to-r from-cine-primary to-cine-secondary bg-clip-text text-transparent">
              Manage.
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            One workspace for your leads, productions, and team — built for the
            pace of live entertainment.
          </p>

          <ul className="mt-10 space-y-4">
            <FeatureRow
              icon={<Users className="h-4 w-4" />}
              title="Lead pipeline"
              desc="Capture, qualify, and convert in one view."
            />
            <FeatureRow
              icon={<Film className="h-4 w-4" />}
              title="Project tracking"
              desc="From pitch to wrap, keep every detail in sync."
            />
            <FeatureRow
              icon={<BarChart3 className="h-4 w-4" />}
              title="Insights"
              desc="Real-time dashboards across the business."
            />
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} CinePanda Entertainments. All rights
          reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-[45%] xl:w-[40%] items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Image
              src="/cinepanda-logo.png"
              alt="CinePanda"
              width={72}
              height={72}
              priority
              className="drop-shadow-sm"
            />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Sign in to manage leads, projects, and more.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={submitting || redirecting}>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <Input
                id="email"
                type="text"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cinepanda.com"
                className="h-11"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-cine-primary hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cine-primary focus:ring-cine-primary dark:border-slate-700 dark:bg-slate-800"
              />
              Remember me on this device
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || redirecting}
              className="h-11 w-full bg-cine-primary text-white shadow-sm transition-all hover:bg-cine-primary/90 hover:shadow-md focus-visible:ring-cine-primary disabled:opacity-70 dark:bg-cine-primary dark:text-white dark:hover:bg-cine-primary/90"
            >
              {submitting || redirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {redirecting ? "Redirecting…" : "Signing in..."}
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-500 lg:hidden">
            © {new Date().getFullYear()} CinePanda Entertainments
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-cine-primary ring-1 ring-white/10 backdrop-blur-sm">
        {icon}
      </span>
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-sm text-slate-400">{desc}</div>
      </div>
    </li>
  );
}
