"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-2.5">
        <Image
          src="/cinepanda-logo.png"
          alt="CinePanda logo"
          width={28}
          height={28}
          priority
          className="shrink-0 drop-shadow-sm"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            CinePanda
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Admin Console
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </header>
  );
}

