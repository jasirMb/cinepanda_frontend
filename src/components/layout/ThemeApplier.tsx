"use client";

import { useEffect } from "react";
import {
  getBackgroundPreset,
  getPatternPreset,
  useSettingsStore,
} from "@/store/settings-store";

export function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);
  const backgroundId = useSettingsStore((s) => s.backgroundId);
  const patternId = useSettingsStore((s) => s.patternId);
  const hasHydrated = useSettingsStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    const bg = getBackgroundPreset(backgroundId);
    const pattern = getPatternPreset(patternId);
    const color = theme === "dark" ? bg.dark : bg.light;
    const image = theme === "dark" ? pattern.dark : pattern.light;
    document.body.style.backgroundColor = color;
    document.body.style.backgroundImage = image ? `url("${image}")` : "";
    document.body.style.backgroundRepeat = "repeat";
    document.body.style.backgroundAttachment = "fixed";
  }, [theme, backgroundId, patternId, hasHydrated]);

  return null;
}
