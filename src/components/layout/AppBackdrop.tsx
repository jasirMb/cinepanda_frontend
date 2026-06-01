"use client";

import { CUSTOM_PATTERN_ID, useSettingsStore } from "@/store/settings-store";

/**
 * Full-screen wallpaper layer shown when the user has set a custom background
 * image. Sits behind all app content (the chrome + cards become translucent via
 * the `[data-wallpaper]` rules in globals.css). A theme-aware scrim keeps text
 * readable over any image in both light and dark mode.
 */
export function AppBackdrop() {
  const patternId = useSettingsStore((s) => s.patternId);
  const customPatternUrl = useSettingsStore((s) => s.customPatternUrl);
  const hasHydrated = useSettingsStore((s) => s.hasHydrated);

  if (!hasHydrated) return null;
  const active = patternId === CUSTOM_PATTERN_ID && !!customPatternUrl;
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      {/* Lightly scaled to avoid edge gaps; minimal blur so the photo stays clear. */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat blur-[2px]"
        style={{ backgroundImage: `url("${customPatternUrl}")` }}
      />
      {/* Light readability scrim — cards stay opaque so text remains legible. */}
      <div className="absolute inset-0 bg-slate-50/15 dark:bg-slate-950/25" />
    </div>
  );
}
