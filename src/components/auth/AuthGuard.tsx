"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hasHydrated, isAuthenticated, router, pathname]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="relative flex items-center justify-center">
          <span className="absolute h-20 w-20 animate-ping rounded-full bg-cine-primary/10" />
          <Image
            src="/cinepanda-logo.png"
            alt="Cinepanda"
            width={56}
            height={56}
            priority
            className="relative h-14 w-14 object-contain drop-shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-cine-primary" />
          Checking authentication…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

