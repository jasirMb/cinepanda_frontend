"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Moon, Sun, Trash2, User } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

import {
  BACKGROUND_PRESETS,
  CUSTOM_PATTERN_ID,
  PATTERN_PRESETS,
  SIDEBAR_PRESETS,
  getBackgroundPreset,
  useSettingsStore,
} from "@/store/settings-store";
import { deleteFile, uploadFile } from "@/lib/api/files";
import { compressImageToLimit } from "@/lib/compress-image";

const MAX_PATTERN_BYTES = 5 * 1024 * 1024; // 5 MB
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

export function SettingsPanel() {
  const theme = useSettingsStore((s) => s.theme);
  const backgroundId = useSettingsStore((s) => s.backgroundId);
  const sidebarId = useSettingsStore((s) => s.sidebarId);
  const patternId = useSettingsStore((s) => s.patternId);
  const customPatternUrl = useSettingsStore((s) => s.customPatternUrl);
  const customPatternKey = useSettingsStore((s) => s.customPatternKey);
  const profile = useSettingsStore((s) => s.profile);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setBackgroundId = useSettingsStore((s) => s.setBackgroundId);
  const setSidebarId = useSettingsStore((s) => s.setSidebarId);
  const setPatternId = useSettingsStore((s) => s.setPatternId);
  const setCustomPattern = useSettingsStore((s) => s.setCustomPattern);

  const patternFileRef = useRef<HTMLInputElement>(null);
  const [uploadingPattern, setUploadingPattern] = useState(false);

  async function handlePatternFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    // Keep uploads under 5 MB: shrink larger images, refuse if we can't.
    let toUpload = file;
    if (file.size > MAX_PATTERN_BYTES) {
      try {
        toUpload = await compressImageToLimit(file, MAX_PATTERN_BYTES);
        toast.info("Image was over 5 MB — compressed it before uploading.");
      } catch {
        toast.error("Image is too large. Please pick one under 5 MB.");
        return;
      }
    }

    const previousKey = customPatternKey;
    setUploadingPattern(true);
    try {
      const uploaded = await uploadFile(toUpload, "patterns");
      setCustomPattern(uploaded.fileUrl, uploaded.key);
      setPatternId(CUSTOM_PATTERN_ID);
      toast.success("Background image applied");
      // Clean up the image we just replaced so it doesn't orphan in R2.
      if (previousKey && previousKey !== uploaded.key) {
        deleteFile(previousKey).catch(() => {});
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingPattern(false);
    }
  }

  async function handleRemoveCustomPattern() {
    const key = customPatternKey;
    // Clear locally first so the UI feels instant; the bucket cleanup follows.
    setCustomPattern(null, null);
    if (patternId === CUSTOM_PATTERN_ID) setPatternId("none");
    if (key) {
      try {
        await deleteFile(key);
      } catch {
        toast.error("Image removed, but cleanup from storage failed.");
      }
    }
  }

  // Ensure the profile query is running while this panel is mounted
  // (hydrator in the protected layout handles the broader case, but this
  // guarantees a fresh fetch if the settings panel is the first place
  // touched after auth).
  useProfile();
  const updateProfile = useUpdateProfile();

  // Local form state — initialized from the store and kept in sync when the
  // server-backed profile arrives. Separate from the store so the Save button
  // has something to diff against.
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [emailDraft, setEmailDraft] = useState(profile.email);

  useEffect(() => {
    setNameDraft(profile.name);
    setEmailDraft(profile.email);
  }, [profile.name, profile.email]);

  const profileDirty =
    nameDraft.trim() !== profile.name.trim() ||
    emailDraft.trim() !== profile.email.trim();

  function handleSaveProfile() {
    const payload = {
      name: nameDraft.trim(),
      email: emailDraft.trim(),
    };
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Profile updated"),
      onError: () => toast.error("Failed to update profile"),
    });
  }

  const currentBg = getBackgroundPreset(backgroundId);
  const currentBgColor = theme === "dark" ? currentBg.dark : currentBg.light;

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
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              className="mt-1 h-8 text-xs"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Email
            <Input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 h-8 text-xs"
            />
          </label>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveProfile}
              disabled={!profileDirty || updateProfile.isPending}
              className="h-7 px-3 text-xs"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </div>
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

      <Section title="Background pattern">
        <div className="grid grid-cols-3 gap-2">
          {PATTERN_PRESETS.map((preset) => {
            const active = patternId === preset.id;
            const image = theme === "dark" ? preset.dark : preset.light;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPatternId(preset.id)}
                title={preset.label}
                aria-label={`Pattern ${preset.label}`}
                className={clsx(
                  "relative h-16 overflow-hidden rounded-md border text-[10px] font-medium transition",
                  active
                    ? "border-cine-primary ring-2 ring-cine-primary/40"
                    : "border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
                )}
                style={{
                  backgroundColor: currentBgColor,
                  backgroundImage: image ? `url("${image}")` : undefined,
                  backgroundRepeat: "repeat",
                  backgroundSize: image ? "120px 120px" : undefined,
                }}
              >
                <span
                  className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-0.5 text-center text-white"
                >
                  {preset.label}
                </span>
                {active && (
                  <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-cine-primary" />
                )}
              </button>
            );
          })}

          {/* Custom image from the user's system */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                customPatternUrl
                  ? setPatternId(CUSTOM_PATTERN_ID)
                  : patternFileRef.current?.click()
              }
              disabled={uploadingPattern}
              title={customPatternUrl ? "Your image" : "Upload an image"}
              aria-label={
                customPatternUrl ? "Custom pattern image" : "Upload pattern image"
              }
              className={clsx(
                "relative flex h-16 w-full items-center justify-center overflow-hidden rounded-md border text-[10px] font-medium transition",
                patternId === CUSTOM_PATTERN_ID && customPatternUrl
                  ? "border-cine-primary ring-2 ring-cine-primary/40"
                  : "border-dashed border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500"
              )}
              style={
                customPatternUrl
                  ? {
                      backgroundColor: currentBgColor,
                      backgroundImage: `url("${customPatternUrl}")`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {uploadingPattern ? (
                <Loader2 className="h-4 w-4 animate-spin text-cine-primary" />
              ) : customPatternUrl ? (
                <>
                  <span className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-0.5 text-center text-white">
                    Custom
                  </span>
                  {patternId === CUSTOM_PATTERN_ID && (
                    <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-cine-primary" />
                  )}
                </>
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <ImagePlus className="h-4 w-4" />
                  Upload
                </span>
              )}
            </button>

            {customPatternUrl && !uploadingPattern && (
              <button
                type="button"
                onClick={handleRemoveCustomPattern}
                title="Remove image"
                aria-label="Remove custom pattern image"
                className="absolute left-1 top-1 rounded bg-black/45 p-0.5 text-white transition hover:bg-black/70"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {customPatternUrl && (
          <button
            type="button"
            onClick={() => patternFileRef.current?.click()}
            disabled={uploadingPattern}
            className="mt-2 text-[11px] font-medium text-cine-primary hover:underline disabled:opacity-50"
          >
            Replace image…
          </button>
        )}

        <input
          ref={patternFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handlePatternFile}
        />
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
