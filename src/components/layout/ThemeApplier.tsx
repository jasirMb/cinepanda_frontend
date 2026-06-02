"use client";

import { useEffect } from "react";
import {
  CUSTOM_PATTERN_ID,
  getBackgroundPreset,
  resolvePatternImage,
  useSettingsStore,
} from "@/store/settings-store";

export function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);
  const backgroundId = useSettingsStore((s) => s.backgroundId);
  const patternId = useSettingsStore((s) => s.patternId);
  const customPatternUrl = useSettingsStore((s) => s.customPatternUrl);
  const viewMode = useSettingsStore((s) => s.viewMode);
  const hasHydrated = useSettingsStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme, hasHydrated]);

  // "Desktop" forces the wide layout even on phones (request-desktop-site);
  // "auto"/"mobile" use the normal responsive viewport.
  useEffect(() => {
    if (!hasHydrated) return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    meta.setAttribute(
      "content",
      viewMode === "desktop"
        ? "width=1280"
        : "width=device-width, initial-scale=1, viewport-fit=cover"
    );
  }, [viewMode, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    const bg = getBackgroundPreset(backgroundId);
    const color = theme === "dark" ? bg.dark : bg.light;
    const image = resolvePatternImage(patternId, customPatternUrl, theme);
    // A custom photo becomes a full-screen wallpaper rendered by <AppBackdrop>,
    // which also flips on glass styling for the chrome + cards via this flag.
    const isWallpaper = patternId === CUSTOM_PATTERN_ID && !!image;

    if (isWallpaper) {
      document.documentElement.dataset.wallpaper = "true";
    } else {
      delete document.documentElement.dataset.wallpaper;
    }

    document.body.style.backgroundColor = color;
    // Tiled presets paint on the body; the wallpaper is handled by the backdrop.
    document.body.style.backgroundImage =
      image && !isWallpaper ? `url("${image}")` : "";
    document.body.style.backgroundRepeat = "repeat";
    document.body.style.backgroundSize = "auto";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundAttachment = "fixed";

    // Don't let the wallpaper flag linger after this layout unmounts (e.g. logout
    // → login page), which would otherwise frost the login surfaces.
    return () => {
      delete document.documentElement.dataset.wallpaper;
    };
  }, [theme, backgroundId, patternId, customPatternUrl, hasHydrated]);

  return null;
}
