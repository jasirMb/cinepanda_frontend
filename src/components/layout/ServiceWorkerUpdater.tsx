"use client";

import { useEffect } from "react";

/**
 * Keeps the PWA fresh. The app ships a Serwist service worker that precaches the
 * build, so a phone with the app cached can serve a STALE version after a deploy
 * (you'd see the old layout "sometimes" until it updates). This:
 *
 *   1. Proactively asks the browser to check for a new service worker on load and
 *      whenever the tab regains focus.
 *   2. Reloads the page once when a newly-installed worker takes control, so the
 *      latest UI is shown instead of the cached one.
 *
 * The `hadController` guard avoids reloading on the very first visit (when a SW
 * first takes control of a page that had none), so there's no reload loop.
 */
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    const onControllerChange = () => {
      if (!hadController || refreshing) return; // skip first-ever control
      refreshing = true;
      window.location.reload();
    };

    const checkForUpdate = () => {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );
    document.addEventListener("visibilitychange", onVisible);
    checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
