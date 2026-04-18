"use client";

import { Check, Moon, Sun, User } from "lucide-react";
import clsx from "clsx";
import {
  BACKGROUND_PRESETS,
  SIDEBAR_PRESETS,
  getBackgroundPreset,
  useSettingsStore,
} from "@/store/settings-store";
import { Input } from "@/components/ui/input";

export function SettingsPanel() {
  const theme = useSettingsStore((s) => s.theme);
  const backgroundId = useSettingsStore((s) => s.backgroundId);
  const sidebarId = useSettingsStore((s) => s.sidebarId);
  const profile = useSettingsStore((s) => s.profile);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setBackgroundId = useSettingsStore((s) => s.setBackgroundId);
  const setSidebarId = useSettingsStore((s) => s.setSidebarId);
  const setProfile = useSettingsStore((s) => s.setProfile);

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      <div>
        <h3 className="text-sm font-semibold">Settings</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalize your workspace appearance.
        </p>
      </div>

      <Section title="Profile" icon={<User className="h-3.5 w-3.5" />}>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Display name
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder="Your name"
              className="mt-1 h-8 text-xs"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Email
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ email: e.target.value })}
              placeholder="you@example.com"
              className="mt-1 h-8 text-xs"
            />
          </label>
        </div>
      </Section>

      <Section title="Theme">
        <div className="grid grid-cols-2 gap-2">
          <ThemeButton
            active={theme === "light"}
            onClick={() => setTheme("light")}
            icon={<Sun className="h-3.5 w-3.5" />}
            label="Light"
          />
          <ThemeButton
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            icon={<Moon className="h-3.5 w-3.5" />}
            label="Dark"
          />
        </div>
      </Section>

      <Section title="Background color">
        <div className="grid grid-cols-6 gap-2">
          {BACKGROUND_PRESETS.map((preset) => {
            const swatch = theme === "dark" ? preset.dark : preset.light;
            const active = backgroundId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setBackgroundId(preset.id)}
                title={preset.label}
                aria-label={`Background ${preset.label}`}
                className={clsx(
                  "relative h-8 w-8 rounded-md border transition",
                  active
                    ? "border-cine-primary ring-2 ring-cine-primary/40"
                    : "border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
                )}
                style={{ backgroundColor: swatch }}
              >
                {active && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-cine-primary mix-blend-difference" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Current: {getBackgroundPreset(backgroundId).label}
        </p>
      </Section>

      <Section title="Sidebar color">
        <div className="grid grid-cols-7 gap-2">
          {SIDEBAR_PRESETS.map((preset) => {
            const active = sidebarId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSidebarId(preset.id)}
                title={preset.label}
                aria-label={`Sidebar ${preset.label}`}
                className={clsx(
                  "relative h-8 w-8 rounded-md border transition",
                  active
                    ? "border-cine-primary ring-2 ring-cine-primary/40"
                    : "border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
                )}
                style={{ backgroundColor: preset.bg }}
              >
                {active && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                )}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ThemeButton({
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
        "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition",
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
