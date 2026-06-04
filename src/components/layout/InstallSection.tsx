"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { Check, Download, Monitor, RefreshCw, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settings-store";
import {
  registerPwaInstall,
  canInstall,
  subscribeInstall,
  promptInstall,
} from "@/lib/pwa-install";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallSection() {
  const viewMode = useSettingsStore((s) => s.viewMode);
  const setViewMode = useSettingsStore((s) => s.setViewMode);

  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [detected, setDetected] = useState<"desktop" | "mobile">("desktop");
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(ios);
    setDetected(ios || /Android|Mobi/i.test(ua) ? "mobile" : "desktop");
    setInstalled(isStandalone());

    // Read the globally-captured install prompt (and stay in sync with it).
    registerPwaInstall();
    setInstallable(canInstall());
    const unsub = subscribeInstall(() => setInstallable(canInstall()));
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      unsub();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // The mode that drives the install steps shown (auto follows the device).
  const effective = viewMode === "auto" ? detected : viewMode;

  async function install() {
    const outcome = await promptInstall();
    if (outcome === "accepted") setInstalled(true);
  }

  return (
    <div className="space-y-4">
      {/* Install screen */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 text-center shadow-sm dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950/40">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <Image
            src="/cinepanda-logo.png"
            alt="Cinepanda"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
          />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Install Cinepanda
          </h3>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Add the app to your {effective} for a faster, full-screen experience
            that opens like a native app.
          </p>
        </div>

        {installed ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Check className="h-4 w-4" /> Installed on this device
          </span>
        ) : installable ? (
          <Button onClick={install}>
            <Download className="h-4 w-4" /> Install app
          </Button>
        ) : (
          <div className="flex max-w-xs items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <Download className="h-4 w-4 shrink-0 text-cine-primary" />
            <span>
              {isIOS && effective === "mobile" ? (
                <>
                  Tap{" "}
                  <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share
                  → <strong>Add to Home Screen</strong>
                </>
              ) : effective === "mobile" ? (
                <>
                  Browser menu → <strong>Add to Home screen</strong>
                </>
              ) : (
                <>
                  Use the <strong>install icon</strong> in your browser&apos;s
                  address bar
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Desktop / Mobile view toggle */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          View mode
        </p>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Force the desktop layout on a phone, or keep it automatic.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <ModeButton
            active={viewMode === "auto"}
            onClick={() => setViewMode("auto")}
            icon={<RefreshCw className="h-4 w-4" />}
            label="Auto"
          />
          <ModeButton
            active={viewMode === "desktop"}
            onClick={() => setViewMode("desktop")}
            icon={<Monitor className="h-4 w-4" />}
            label="Desktop"
          />
          <ModeButton
            active={viewMode === "mobile"}
            onClick={() => setViewMode("mobile")}
            icon={<Smartphone className="h-4 w-4" />}
            label="Mobile"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {viewMode === "auto"
            ? `Auto — following this device (${detected}).`
            : viewMode === "desktop"
              ? "Desktop — wide layout, even on phones."
              : "Mobile — responsive layout."}
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition",
        active
          ? "border-cine-primary bg-cine-primary/10 text-cine-primary"
          : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
