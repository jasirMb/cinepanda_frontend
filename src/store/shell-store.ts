"use client";

import { create } from "zustand";

interface ShellState {
  mobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
  settingsOpen: boolean;
  // Which tab to open Settings to (consumed once by the panel on open).
  settingsTab: "profile" | "appearance" | "app" | null;
  openSettings: (tab?: "profile" | "appearance" | "app") => void;
  closeSettings: () => void;
}

export const useShellStore = create<ShellState>((set) => ({
  mobileSidebarOpen: false,
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  settingsOpen: false,
  settingsTab: null,
  openSettings: (tab) => set({ settingsOpen: true, settingsTab: tab ?? null }),
  closeSettings: () => set({ settingsOpen: false }),
}));
