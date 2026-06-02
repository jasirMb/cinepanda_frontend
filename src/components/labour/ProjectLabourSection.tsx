"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Check,
  HardHat,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useLabours } from "@/hooks/useLabours";
import { projectsKeys } from "@/hooks/useProjects";
import {
  addProjectLabour,
  removeProjectLabour,
  type ProjectLabour,
} from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AVATAR_PALETTE = [
  "bg-cine-primary/15 text-cine-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
];
function initials(name: string) {
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
function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

export function ProjectLabourSection({
  projectId,
  labours,
}: {
  projectId: string;
  labours: ProjectLabour[];
}) {
  const queryClient = useQueryClient();
  const allLabours = useLabours().data?.data ?? [];

  const [adding, setAdding] = useState(false);
  const [selectId, setSelectId] = useState("");
  const [newCharge, setNewCharge] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCharge, setEditCharge] = useState("");
  const [pendingRemove, setPendingRemove] = useState<ProjectLabour | null>(null);

  const involvedIds = new Set(labours.map((l) => l.labourId._id));
  const available = allLabours.filter((l) => !involvedIds.has(l._id));
  const totalCharge = labours.reduce((s, l) => s + (l.charge ?? 0), 0);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
  }

  const setMutation = useMutation({
    mutationFn: ({ labourId, charge }: { labourId: string; charge: number }) =>
      addProjectLabour(projectId, labourId, charge),
    onSuccess: () => {
      invalidate();
      setSelectId("");
      setNewCharge("");
      setAdding(false);
      setEditingId(null);
      toast.success("Labour saved on project");
    },
    onError: () => toast.error("Failed to save labour"),
  });

  const removeMutation = useMutation({
    mutationFn: (labourId: string) => removeProjectLabour(projectId, labourId),
    onSuccess: () => {
      invalidate();
      setPendingRemove(null);
      toast.success("Labour removed");
    },
    onError: () => toast.error("Failed to remove labour"),
  });

  function onSelectLabour(labourId: string) {
    setSelectId(labourId);
    const labour = allLabours.find((l) => l._id === labourId);
    setNewCharge(labour?.dailyWage != null ? String(labour.dailyWage) : "");
  }

  function handleAdd() {
    if (!selectId) {
      toast.error("Please choose a labour");
      return;
    }
    const charge = Number(newCharge);
    if (newCharge !== "" && (Number.isNaN(charge) || charge < 0)) {
      toast.error("Enter a valid charge");
      return;
    }
    setMutation.mutate({ labourId: selectId, charge: newCharge ? charge : 0 });
  }

  function startEdit(entry: ProjectLabour) {
    setEditingId(entry.labourId._id);
    setEditCharge(String(entry.charge ?? 0));
  }

  function saveEdit(labourId: string) {
    const charge = Number(editCharge);
    if (Number.isNaN(charge) || charge < 0) {
      toast.error("Enter a valid charge");
      return;
    }
    setMutation.mutate({ labourId, charge });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardHat className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Involved Labours
          </h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {labours.length}
          </span>
          {totalCharge > 0 && (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              {inr(totalCharge)}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? (
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

      {/* Add control */}
      {adding && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          {available.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {allLabours.length === 0 ? (
                <>
                  No labours yet.{" "}
                  <Link
                    href="/labours"
                    className="font-medium text-cine-primary hover:underline"
                  >
                    Add a labour first
                  </Link>
                  .
                </>
              ) : (
                "All labours are already added to this project."
              )}
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectId}
                onChange={(e) => onSelectLabour(e.target.value)}
                className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Select a labour…</option>
                {available.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                    {l.role ? ` — ${l.role}` : ""}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                value={newCharge}
                onChange={(e) => setNewCharge(e.target.value)}
                placeholder="Charge for this project (₹)"
                className="sm:w-56"
              />
              <Button
                onClick={handleAdd}
                disabled={!selectId || setMutation.isPending}
              >
                {setMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Roster */}
      {labours.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No labours added to this project yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {labours.map((entry) => {
            const labour = entry.labourId;
            const isEditing = editingId === labour._id;
            return (
              <div
                key={labour._id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${avatarColor(
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
                    initials(labour.name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/labours/${labour._id}`}
                    className="block truncate text-sm font-semibold text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
                  >
                    {labour.name}
                  </Link>
                  {labour.role && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Briefcase className="h-3 w-3" />
                      {labour.role}
                    </span>
                  )}
                  {/* Charge: display or inline-edit */}
                  {isEditing ? (
                    <div className="mt-1 flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={editCharge}
                        onChange={(e) => setEditCharge(e.target.value)}
                        className="h-7 w-28 text-xs"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(labour._id)}
                        aria-label="Save charge"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                      title="Edit charge"
                    >
                      {inr(entry.charge)}
                      <Pencil className="h-3 w-3 text-slate-400" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingRemove(entry)}
                  aria-label="Remove labour"
                  className="flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Remove labour from project?"
        description={`"${pendingRemove?.labourId.name}" will be removed from this project's involved labours.`}
        confirmLabel="Remove"
        onConfirm={() =>
          pendingRemove && removeMutation.mutate(pendingRemove.labourId._id)
        }
      />
    </div>
  );
}
