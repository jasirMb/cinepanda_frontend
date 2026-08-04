import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Offline | Cinepanda"
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-slate-950">
      <Image
        src="/cinepanda-logo.png"
        alt="Cinepanda"
        width={72}
        height={72}
        priority
        className="drop-shadow-sm"
      />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
          Cinepanda needs an internet connection to load this page. Reconnect
          and try again.
        </p>
      </div>
    </main>
  );
}
