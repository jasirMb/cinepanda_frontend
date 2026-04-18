"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

export interface BackgroundPreset {
  id: string;
  label: string;
  light: string;
  dark: string;
}

export interface SidebarPreset {
  id: string;
  label: string;
  bg: string;
  fg: string;
  border: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "default", label: "Default", light: "#f8fafc", dark: "#020617" },
  { id: "warm", label: "Warm", light: "#fef3c7", dark: "#1c1917" },
  { id: "cool", label: "Cool", light: "#dbeafe", dark: "#0b1437" },
  { id: "mint", label: "Mint", light: "#d1fae5", dark: "#022c22" },
  { id: "rose", label: "Rose", light: "#ffe4e6", dark: "#3f1217" },
  { id: "lavender", label: "Lavender", light: "#ede9fe", dark: "#1e1b4b" },
];

export interface PatternPreset {
  id: string;
  label: string;
  light: string | null;
  dark: string | null;
}

export const PATTERN_PRESETS: PatternPreset[] = [
  { id: "none", label: "None", light: null, dark: null },
  {
    id: "cinema",
    label: "Cinema",
    light: "/backgrounds/cinema-light.svg",
    dark: "/backgrounds/cinema-dark.svg",
  },
];

export const SIDEBAR_PRESETS: SidebarPreset[] = [
  { id: "slate", label: "Slate", bg: "#0f172a", fg: "#e2e8f0", border: "rgba(255,255,255,0.08)" },
  { id: "navy", label: "Navy", bg: "#1e293b", fg: "#e2e8f0", border: "rgba(255,255,255,0.08)" },
  { id: "indigo", label: "Indigo", bg: "#312e81", fg: "#e0e7ff", border: "rgba(255,255,255,0.1)" },
  { id: "emerald", label: "Emerald", bg: "#064e3b", fg: "#d1fae5", border: "rgba(255,255,255,0.1)" },
  { id: "purple", label: "Purple", bg: "#4c1d95", fg: "#ede9fe", border: "rgba(255,255,255,0.1)" },
  { id: "rose", label: "Rose", bg: "#881337", fg: "#ffe4e6", border: "rgba(255,255,255,0.1)" },
  { id: "graphite", label: "Graphite", bg: "#1f2937", fg: "#f1f5f9", border: "rgba(255,255,255,0.08)" },
];

export interface ProfileSettings {
  name: string;
  email: string;
}

interface SettingsState {
  theme: Theme;
  backgroundId: string;
  sidebarId: string;
  patternId: string;
  profile: ProfileSettings;
  hasHydrated: boolean;
  setTheme: (t: Theme) => void;
  setBackgroundId: (id: string) => void;
  setSidebarId: (id: string) => void;
  setPatternId: (id: string) => void;
  setProfile: (p: Partial<ProfileSettings>) => void;
}

type SetSettingsState = (partial: Partial<SettingsState>) => void;
let setSettingsState: SetSettingsState | undefined;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => {
      setSettingsState = set;
      return {
        theme: "light",
        backgroundId: "default",
        sidebarId: "slate",
        patternId: "none",
        profile: { name: "", email: "" },
        hasHydrated: false,
        setTheme: (theme) => set({ theme }),
        setBackgroundId: (backgroundId) => set({ backgroundId }),
        setSidebarId: (sidebarId) => set({ sidebarId }),
        setPatternId: (patternId) => set({ patternId }),
        setProfile: (p) =>
          set((s) => ({ profile: { ...s.profile, ...p } })),
      };
    },
    {
      name: "cinepanda-settings",
      partialize: (state) => ({
        theme: state.theme,
        backgroundId: state.backgroundId,
        sidebarId: state.sidebarId,
        patternId: state.patternId,
        profile: state.profile,
      }),
      onRehydrateStorage: () => () => {
        setSettingsState?.({ hasHydrated: true });
      },
    }
  )
);

export function getBackgroundPreset(id: string): BackgroundPreset {
  return BACKGROUND_PRESETS.find((b) => b.id === id) ?? BACKGROUND_PRESETS[0];
}

export function getSidebarPreset(id: string): SidebarPreset {
  return SIDEBAR_PRESETS.find((s) => s.id === id) ?? SIDEBAR_PRESETS[0];
}

export function getPatternPreset(id: string): PatternPreset {
  return PATTERN_PRESETS.find((p) => p.id === id) ?? PATTERN_PRESETS[0];
}
