"use client";

import { useEffect } from "react";
import {
  getBackgroundPreset,
  useSettingsStore,
} from "@/store/settings-store";

export function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);
  const backgroundId = useSettingsStore((s) => s.backgroundId);
  const hasHydrated = useSettingsStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    const preset = getBackgroundPreset(backgroundId);
    const color = theme === "dark" ? preset.dark : preset.light;
    document.body.style.backgroundColor = color;
  }, [theme, backgroundId, hasHydrated]);

  return null;
}
