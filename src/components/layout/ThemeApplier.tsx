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
    const color = theme === "dark" ? bg.dark : bg.light;
    const image = resolvePatternImage(patternId, customPatternUrl, theme);
    // A custom photo should fit/cover the screen; presets tile seamlessly.
    const isCustom = patternId === CUSTOM_PATTERN_ID && !!image;
    document.body.style.backgroundColor = color;
    document.body.style.backgroundImage = image ? `url("${image}")` : "";
    document.body.style.backgroundRepeat = isCustom ? "no-repeat" : "repeat";
    document.body.style.backgroundSize = isCustom ? "cover" : "auto";
    document.body.style.backgroundPosition = isCustom ? "center center" : "";
    document.body.style.backgroundAttachment = "fixed";
  }, [theme, backgroundId, patternId, customPatternUrl, hasHydrated]);

  return null;
}
