"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { groupsKeys, useGroups } from "@/hooks/useGroups";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  type Group,
  type GroupPayload,
} from "@/lib/api/groups";
import { uploadFile, deleteFile } from "@/lib/api/files";
import { compressImageToLimit } from "@/lib/compress-image";
import { GroupAvatar } from "@/components/groups/GroupAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MAX_IMG_BYTES = 5 * 1024 * 1024;
const COLORS = [
  "#3076A1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
];

const EMPTY = {
  name: "",
  description: "",
  color: COLORS[0],
  avatarUrl: "",
  avatarKey: "",
};

export function GroupsManager({ showHeader = true }: { showHeader?: boolean }) {
  const queryClient = useQueryClient();
  const query = useGroups();
  const groups = query.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    let toUpload = file;
    if (file.size > MAX_IMG_BYTES) {
      try {
        toUpload = await compressImageToLimit(file, MAX_IMG_BYTES);
        toast.info("Image was over 5 MB — compressed it before uploading.");
      } catch {
        toast.error("Image is too large. Please pick one under 5 MB.");
        return;
      }
    }
    const previousKey = form.avatarKey;
    setUploading(true);
    try {
      const uploaded = await uploadFile(toUpload, "groups");
      setForm((f) => ({ ...f, avatarUrl: uploaded.fileUrl, avatarKey: uploaded.key }));
      if (previousKey && previousKey !== uploaded.key) {
        deleteFile(previousKey).catch(() => {});
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    const key = form.avatarKey;
    setForm((f) => ({ ...f, avatarUrl: "", avatarKey: "" }));
    if (key) deleteFile(key).catch(() => {});
  }

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.all });
      reset();
      toast.success("Group added");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Failed to add group"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GroupPayload> }) =>
      updateGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.all });
      reset();
      toast.success("Group updated");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Failed to update group"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.all });
      setPendingDelete(null);
      toast.success("Group deleted");
    },
    onError: () => toast.error("Failed to delete group"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function startEdit(g: Group) {
    setForm({
      name: g.name ?? "",
      description: g.description ?? "",
      color: g.color ?? COLORS[0],
      avatarUrl: g.avatarUrl ?? "",
      avatarKey: g.avatarKey ?? "",
    });
    setEditingId(g._id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    const payload: GroupPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color || undefined,
      avatarUrl: form.avatarUrl || undefined,
      avatarKey: form.avatarKey || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {showHeader ? (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Groups
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Crews / teams you assemble from your labours.
            </p>
          </div>
        ) : (
          <span />
        )}
        <Button onClick={() => (showForm ? reset() : setShowForm(true))}>
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Group
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          {/* Group image */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <GroupAvatar
                name={form.name}
                color={form.color}
                avatarUrl={form.avatarUrl}
                size={64}
                iconClassName="h-7 w-7"
              />
              {uploading && (
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
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-7 px-3 text-xs"
              >
                <ImagePlus className="mr-1.5 h-3 w-3" />
                {form.avatarUrl ? "Change image" : "Upload image"}
              </Button>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 disabled:opacity-50 dark:text-slate-400"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleImageFile}
            />
          </div>

          <Field label="Name *">
            <Input
              placeholder="e.g. Lighting crew"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Field>
          <Field label="Colour (used when there's no image)">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition dark:ring-offset-slate-900 ${
                    form.color === c
                      ? "ring-slate-900 dark:ring-slate-100"
                      : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Colour ${c}`}
                />
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add Group"}
            </Button>
          </div>
        </form>
      )}

      {groups.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups"
            className="pl-9"
          />
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No groups yet. Create a crew and add labours to it.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => {
            const count = g.labours?.length ?? 0;
            return (
              <div
                key={g._id}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                <div
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-1"
                  style={{ backgroundColor: g.color || "#3076A1" }}
                />
                <div className="flex flex-1 flex-col gap-3 p-4 pl-5">
                  <div className="flex items-start gap-3">
                    <GroupAvatar
                      name={g.name}
                      color={g.color}
                      avatarUrl={g.avatarUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                        {g.name}
                      </h3>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {g.description || "Crew / team"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {count} labour{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Link
                      href={`/groups/${g._id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Eye className="h-3 w-3" /> View
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(g)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(g)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete group?"
        description={`This removes "${pendingDelete?.name}". The labours themselves are not deleted.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete._id)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
