"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { laboursKeys, useLabours, useLabourRoles } from "@/hooks/useLabours";
import { useGroups } from "@/hooks/useGroups";
import { GroupsManager } from "@/components/groups/GroupsManager";
import { GroupAvatar } from "@/components/groups/GroupAvatar";
import { uploadFile, deleteFile } from "@/lib/api/files";
import { compressImageToLimit } from "@/lib/compress-image";
import {
  createLabour,
  updateLabour,
  deleteLabour,
  LABOUR_REGIONS,
  type Labour,
  type LabourPayload,
  type LabourRegion,
} from "@/lib/api/labours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AVATAR_PALETTE = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

const EMPTY_FORM = {
  name: "",
  role: "",
  phone: "",
  dailyWage: "",
  region: "",
  state: "",
  details: "",
  avatarUrl: "",
  avatarKey: "",
};

export default function LaboursPage() {
  const queryClient = useQueryClient();
  const laboursQuery = useLabours();
  const labours = laboursQuery.data?.data ?? [];

  const [tab, setTab] = useState<"labours" | "groups">("labours");
  const allGroups = useGroups().data?.data ?? [];
  // labourId -> the groups it belongs to (built from each group's labour list).
  const groupsByLabour = useMemo(() => {
    const map = new Map<
      string,
      { _id: string; name: string; color?: string; avatarUrl?: string }[]
    >();
    for (const g of allGroups) {
      for (const l of (g.labours ?? []) as any[]) {
        const lid = typeof l === "string" ? l : l?._id;
        if (!lid) continue;
        const arr = map.get(lid) ?? [];
        arr.push({ _id: g._id, name: g.name, color: g.color, avatarUrl: g.avatarUrl });
        map.set(lid, arr);
      }
    }
    return map;
  }, [allGroups]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Labour | null>(null);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    let toUpload = file;
    if (file.size > MAX_AVATAR_BYTES) {
      try {
        toUpload = await compressImageToLimit(file, MAX_AVATAR_BYTES);
        toast.info("Image was over 5 MB — compressed it before uploading.");
      } catch {
        toast.error("Image is too large. Please pick one under 5 MB.");
        return;
      }
    }
    const previousKey = form.avatarKey;
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadFile(toUpload, "avatars");
      setForm((f) => ({ ...f, avatarUrl: uploaded.fileUrl, avatarKey: uploaded.key }));
      if (previousKey && previousKey !== uploaded.key) {
        deleteFile(previousKey).catch(() => {});
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    const key = form.avatarKey;
    setForm((f) => ({ ...f, avatarUrl: "", avatarKey: "" }));
    if (key) deleteFile(key).catch(() => {});
  }

  const createMutation = useMutation({
    mutationFn: createLabour,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: laboursKeys.all });
      resetForm();
      toast.success("Labour added successfully");
    },
    onError: () => toast.error("Failed to add labour"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LabourPayload> }) =>
      updateLabour(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: laboursKeys.all });
      resetForm();
      toast.success("Labour updated");
    },
    onError: () => toast.error("Failed to update labour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLabour,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: laboursKeys.all });
      setPendingDelete(null);
      toast.success("Labour moved to trash");
    },
    onError: () => toast.error("Failed to delete labour"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(labour: Labour) {
    setForm({
      name: labour.name ?? "",
      role: labour.role ?? "",
      phone: labour.phone ?? "",
      dailyWage: labour.dailyWage != null ? String(labour.dailyWage) : "",
      region: labour.region ?? "",
      state: labour.state ?? "",
      details: labour.details ?? "",
      avatarUrl: labour.avatarUrl ?? "",
      avatarKey: labour.avatarKey ?? "",
    });
    setEditingId(labour._id);
    setShowForm(true);
  }

  // Region drives the second field: Kerala auto-fills state="Kerala";
  // Non-Kerala asks for a state; Non-Indian asks for a country.
  function handleRegionChange(region: string) {
    setForm((f) => {
      if (region === "Kerala") return { ...f, region, state: "Kerala" };
      // Leaving the auto-filled Kerala → clear so they can type the new place.
      if (f.region === "Kerala") return { ...f, region, state: "" };
      return { ...f, region };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Labour name is required");
      return;
    }
    const phone = form.phone.trim();
    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error("Phone must be exactly 10 digits");
      return;
    }
    const wage = form.dailyWage.trim() ? Number(form.dailyWage) : undefined;
    if (wage != null && (Number.isNaN(wage) || wage < 0)) {
      toast.error("Daily wage must be a positive number");
      return;
    }
    const payload: LabourPayload = {
      name: form.name.trim(),
      role: form.role.trim() || undefined,
      phone: phone || undefined,
      dailyWage: wage,
      region: (form.region as LabourRegion) || undefined,
      state: form.state.trim() || undefined,
      details: form.details.trim() || undefined,
      avatarUrl: form.avatarUrl || undefined,
      avatarKey: form.avatarKey || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Distinct roles come from the backend (across all labours, not just this page).
  const roleOptions = useLabourRoles().data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labours;
    return labours.filter(
      (l: Labour) =>
        l.name.toLowerCase().includes(q) ||
        (l.role ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)
    );
  }, [labours, search]);

  // Pagination for the labour grid (9 keeps the 3-column grid full).
  const PER_PAGE = 9;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const pagedLabours = useMemo(
    () => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [filtered, safePage]
  );
  // Jump back to page 1 whenever the search changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  if (laboursQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (laboursQuery.isError) {
    return (
      <p className="text-red-400">Failed to load labours. Please try again.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Labours
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your labour / crew directory.
          </p>
        </div>
        {tab === "labours" && (
          <Button onClick={() => (showForm ? resetForm() : startCreate())}>
            {showForm ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Labour
              </>
            )}
          </Button>
        )}
      </div>

      {/* Tabs: Labours | Groups */}
      <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {(["labours", "groups"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-cine-primary text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            {t}
            {t === "groups" && allGroups.length > 0 ? ` (${allGroups.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "groups" ? (
        <GroupsManager showHeader={false} />
      ) : (
        <>

      {/* Add / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          {/* Profile photo */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <div
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-lg font-semibold text-white ${avatarColor(
                  form.name || "?"
                )}`}
              >
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatarUrl}
                    alt="Labour photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(form.name || "?")
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => avatarFileRef.current?.click()}
                disabled={uploadingAvatar}
                className="h-7 px-3 text-xs"
              >
                <ImagePlus className="mr-1.5 h-3 w-3" />
                {form.avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 disabled:opacity-50 dark:text-slate-400"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <Input
                placeholder="Labour name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Role">
              <RoleCombobox
                value={form.role}
                onChange={(role) => setForm((f) => ({ ...f, role }))}
                options={roleOptions}
              />
            </Field>
            <Field label="Phone">
              <Input
                placeholder="10-digit number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="Daily wage (₹)">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 1500"
                value={form.dailyWage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dailyWage: e.target.value }))
                }
              />
            </Field>
            <Field label="Place / region">
              <select
                value={form.region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Not set</option>
                {LABOUR_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            {form.region && (
              <Field label={form.region === "Non-Indian" ? "Country" : "State"}>
                <Input
                  placeholder={
                    form.region === "Non-Indian"
                      ? "e.g. Nepal, Bangladesh"
                      : "e.g. Tamil Nadu, Karnataka"
                  }
                  value={form.state}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, state: e.target.value }))
                  }
                  disabled={form.region === "Kerala"}
                  className="disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800"
                />
              </Field>
            )}
          </div>
          <Field label="Details">
            <textarea
              placeholder="Skills, notes, availability…"
              value={form.details}
              onChange={(e) =>
                setForm((f) => ({ ...f, details: e.target.value }))
              }
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Save changes"
                : "Add Labour"}
            </Button>
          </div>
        </form>
      )}

      {/* Search bar */}
      {labours.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, phone"
            className="pl-9"
          />
        </div>
      )}

      {/* Cards */}
      {labours.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No labours yet. Add your first labour above.
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No labours match your search.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {pagedLabours.map((labour: Labour) => (
              <LabourCard
                key={labour._id}
                labour={labour}
                groups={groupsByLabour.get(labour._id) ?? []}
                onEdit={() => startEdit(labour)}
                onDelete={() => setPendingDelete(labour)}
              />
            ))}
          </div>

          {filtered.length > PER_PAGE && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
              <p className="text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {(safePage - 1) * PER_PAGE + 1}–
                  {Math.min(safePage * PER_PAGE, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {filtered.length}
                </span>{" "}
                labours
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="px-1 text-slate-600 dark:text-slate-300">
                  Page {safePage} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage >= pageCount}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete labour?"
        description={`This moves "${pendingDelete?.name}" to the Trash. You can restore it later.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete._id)}
      />
        </>
      )}
    </div>
  );
}

function LabourCard({
  labour,
  groups = [],
  onEdit,
  onDelete,
}: {
  labour: Labour;
  groups?: { _id: string; name: string; color?: string; avatarUrl?: string }[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = [
    labour.dailyWage != null ? `₹${labour.dailyWage.toLocaleString("en-IN")}/day` : null,
    ...Array.from(new Set([labour.region, labour.state].filter(Boolean))),
  ].filter(Boolean) as string[];

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cine-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${avatarColor(
              labour.name
            )}`}
          >
            {labour.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={labour.avatarUrl}
                alt={labour.name}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(labour.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/labours/${labour._id}`}
              className="block truncate text-base font-semibold text-slate-900 group-hover:text-cine-primary dark:text-slate-50"
            >
              {labour.name}
            </Link>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {[labour.role, ...meta].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>

        {groups.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {groups.map((g) => (
              <Link
                key={g._id}
                href={`/groups/${g._id}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-1 pr-2 text-[11px] font-medium text-slate-600 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <GroupAvatar
                  name={g.name}
                  color={g.color}
                  avatarUrl={g.avatarUrl}
                  size={16}
                  iconClassName="h-2.5 w-2.5"
                />
                {g.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
        {labour.phone && (
          <a
            href={`tel:${labour.phone}`}
            aria-label="Call"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        <Link
          href={`/labours/${labour._id}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Eye className="h-3 w-3" /> View
        </Link>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function RoleCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = options.filter((o) => o.toLowerCase().includes(q));
  // Hide the list when there's nothing useful left to suggest.
  const showList =
    open &&
    matches.length > 0 &&
    !(matches.length === 1 && matches[0].toLowerCase() === q);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="e.g. Camera Assistant, Lighting"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {showList && (
        <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {matches.map((role) => (
            <li key={role}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // mousedown (before input blur) so the pick registers reliably
                  e.preventDefault();
                  onChange(role);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {role}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
