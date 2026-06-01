"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Briefcase,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { laboursKeys, useLabours, useLabourRoles } from "@/hooks/useLabours";
import {
  createLabour,
  updateLabour,
  deleteLabour,
  type Labour,
  type LabourPayload,
} from "@/lib/api/labours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AVATAR_PALETTE = [
  "bg-cine-primary/15 text-cine-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
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

const EMPTY_FORM = { name: "", role: "", phone: "", dailyWage: "", details: "" };

export default function LaboursPage() {
  const queryClient = useQueryClient();
  const laboursQuery = useLabours();
  const labours = laboursQuery.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Labour | null>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
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
      toast.success("Labour deleted");
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
      details: labour.details ?? "",
    });
    setEditingId(labour._id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Labour name is required");
      return;
    }
    const payload: LabourPayload = {
      name: form.name.trim(),
      role: form.role.trim() || undefined,
      phone: form.phone.trim() || undefined,
      dailyWage: form.dailyWage.trim() ? Number(form.dailyWage) : undefined,
      details: form.details.trim() || undefined,
    };
    if (payload.dailyWage != null && Number.isNaN(payload.dailyWage)) {
      toast.error("Daily wage must be a number");
      return;
    }
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
      </div>

      {/* Add / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((labour: Labour) => (
            <LabourCard
              key={labour._id}
              labour={labour}
              onEdit={() => startEdit(labour)}
              onDelete={() => setPendingDelete(labour)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete labour?"
        description={`This will permanently remove "${pendingDelete?.name}".`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete._id)}
      />
    </div>
  );
}

function LabourCard({
  labour,
  onEdit,
  onDelete,
}: {
  labour: Labour;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
            labour.name
          )}`}
        >
          {getInitials(labour.name)}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/labours/${labour._id}`}
            className="block truncate text-base font-semibold text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
          >
            {labour.name}
          </Link>
          {labour.role && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Briefcase className="h-3 w-3" />
              {labour.role}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit labour"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete labour"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
        {labour.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <a href={`tel:${labour.phone}`} className="hover:text-cine-primary">
              {labour.phone}
            </a>
          </p>
        )}
        {labour.dailyWage != null && (
          <p className="flex items-center gap-2">
            <Banknote className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>₹{labour.dailyWage.toLocaleString("en-IN")} / day</span>
          </p>
        )}
        {labour.details && (
          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
            {labour.details}
          </p>
        )}
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
