"use client";

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

// The browser fires `beforeinstallprompt` once, very early — often before the
// Settings modal ever mounts. We capture it globally here so the install button
// always has it ready, no matter when the user opens Settings → App.
let deferred: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();
let registered = false;

function emit() {
  subscribers.forEach((cb) => cb());
}

export function registerPwaInstall() {
  if (registered || typeof window === "undefined") return;
  registered = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function canInstall(): boolean {
  return deferred !== null;
}

export function subscribeInstall(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Fire the native install prompt. Returns the outcome (or "unavailable"). */
export async function promptInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  if (!deferred) return "unavailable";
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  if (outcome === "accepted") {
    deferred = null;
    emit();
  }
  return outcome;
}
