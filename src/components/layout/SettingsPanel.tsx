"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  Moon,
  Palette,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Trash2,
  User,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InstallSection } from "@/components/layout/InstallSection";
import { useShellStore } from "@/store/shell-store";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Initials fallback for the avatar (e.g. "Jane Doe" → "JD"). */
function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "A";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || source[0].toUpperCase();
}

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
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      try {
        toUpload = await compressImageToLimit(file, MAX_IMAGE_UPLOAD_BYTES);
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

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Open to the tab requested via openSettings(tab) (e.g. the install icon → "app").
  const requestedTab = useShellStore.getState().settingsTab;
  const [tab, setTab] = useState<"profile" | "appearance" | "app">(
    requestedTab ?? "profile"
  );

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    let toUpload = file;
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      try {
        toUpload = await compressImageToLimit(file, MAX_IMAGE_UPLOAD_BYTES);
        toast.info("Image was over 5 MB — compressed it before uploading.");
      } catch {
        toast.error("Image is too large. Please pick one under 5 MB.");
        return;
      }
    }

    const previousKey = profile.avatarKey;
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadFile(toUpload, "avatars");
      updateProfile.mutate(
        { avatarUrl: uploaded.fileUrl, avatarKey: uploaded.key },
        {
          onSuccess: () => {
            toast.success("Profile photo updated");
            if (previousKey && previousKey !== uploaded.key) {
              deleteFile(previousKey).catch(() => {});
            }
          },
          onError: () => {
            // Saving the profile failed — don't leave the just-uploaded file orphaned.
            deleteFile(uploaded.key).catch(() => {});
            toast.error("Failed to save profile photo");
          },
        }
      );
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    const key = profile.avatarKey;
    updateProfile.mutate(
      { avatarUrl: "", avatarKey: "" },
      {
        onSuccess: () => {
          toast.success("Profile photo removed");
          if (key) deleteFile(key).catch(() => {});
        },
        onError: () => toast.error("Failed to remove photo"),
      }
    );
  }

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
    <div className="flex h-[min(85vh,620px)] flex-col text-slate-900 dark:text-slate-100 sm:flex-row">
      {/* Left tab rail */}
      <div className="flex shrink-0 flex-col border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:w-56 sm:border-b-0 sm:border-r">
        <div className="mb-3 flex items-center gap-2.5 px-2 pt-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary ring-1 ring-cine-primary/20">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">Settings</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Account &amp; appearance
            </p>
          </div>
        </div>
        <nav className="flex gap-1.5 sm:flex-col">
          <RailTab
            active={tab === "profile"}
            onClick={() => setTab("profile")}
            icon={<User className="h-4 w-4" />}
            label="Profile"
          />
          <RailTab
            active={tab === "appearance"}
            onClick={() => setTab("appearance")}
            icon={<Palette className="h-4 w-4" />}
            label="Appearance"
          />
          <RailTab
            active={tab === "app"}
            onClick={() => setTab("app")}
            icon={<Smartphone className="h-4 w-4" />}
            label="App"
          />
        </nav>
      </div>

      {/* Right content pane */}
      <div className="flex-1 scroll-smooth overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950/40">
      {tab === "profile" && (
        <div className="space-y-4">
          <TabHeader
            title="Profile"
            subtitle="Your name, email and photo."
          />

          {/* Avatar header card */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="relative h-16 w-16 shrink-0">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-base font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt="Profile photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsFrom(nameDraft, emailDraft)
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {nameDraft.trim() || "Admin"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {emailDraft.trim() || "No email set"}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={uploadingAvatar || updateProfile.isPending}
                  className="h-7 px-3 text-xs"
                >
                  <ImagePlus className="mr-1.5 h-3 w-3" />
                  {profile.avatarUrl ? "Change" : "Upload"}
                </Button>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar || updateProfile.isPending}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 disabled:opacity-50 dark:text-slate-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarFile}
          />

          <Section title="Account details">
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Display name
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 h-9 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Email
                <Input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 h-9 text-sm"
                />
              </label>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={!profileDirty || updateProfile.isPending}
                  className="h-8 px-4 text-xs"
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
        </div>
      )}

      {tab === "appearance" && (
      <div className="space-y-4">
      <TabHeader
        title="Appearance"
        subtitle="Theme, colors and background."
      />
      <Section title="Theme">
        <div className="grid grid-cols-2 gap-2">
          <ThemeButton
            active={theme === "light"}
            onClick={() => setTheme("light")}
            icon={<Sun className="h-4 w-4" />}
            label="Light"
          />
          <ThemeButton
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            icon={<Moon className="h-4 w-4" />}
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
                  "relative h-9 w-9 rounded-lg border transition",
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
                  "relative h-9 w-9 rounded-lg border transition",
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
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Current: {SIDEBAR_PRESETS.find((p) => p.id === sidebarId)?.label}
        </p>
      </Section>
      </div>
      )}

      {tab === "app" && (
        <div className="space-y-4">
          <TabHeader
            title="App"
            subtitle="Install CinePanda on this device."
          />
          <InstallSection />
        </div>
      )}
      </div>
    </div>
  );
}

function TabHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function RailTab({
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
        "flex flex-1 items-center justify-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:justify-start",
        active
          ? "bg-cine-primary/10 text-cine-primary ring-1 ring-inset ring-cine-primary/20"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
      )}
    >
      <span
        className={clsx(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          active
            ? "bg-cine-primary/15 text-cine-primary"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        )}
      >
        {icon}
      </span>
      {label}
    </button>
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
        {icon}
        {title}
      </div>
      <div className="p-4">{children}</div>
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
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
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

/**
 * App-wide Settings modal. Renders once (e.g. in the protected layout) and is
 * opened via the shell store's `openSettings()` from the sidebar / topbar.
 */
export function SettingsModal() {
  const open = useShellStore((s) => s.settingsOpen);
  const close = useShellStore((s) => s.closeSettings);
  return (
    <Dialog open={open} onClose={close} className="max-w-3xl p-0">
      <SettingsPanel />
    </Dialog>
  );
}
