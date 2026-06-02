"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Check,
  HardHat,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import { useLabours } from "@/hooks/useLabours";
import { useGroups } from "@/hooks/useGroups";
import { useLabourWorkLogs } from "@/hooks/useLabourWorkLogs";
import { projectsKeys } from "@/hooks/useProjects";
import {
  addProjectLabour,
  addProjectGroup,
  removeProjectGroup,
  removeProjectLabour,
  type ProjectLabour,
  type ProjectGroupInfo,
} from "@/lib/api/projects";
import { GroupAvatar } from "@/components/groups/GroupAvatar";
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
  groups = [],
}: {
  projectId: string;
  labours: ProjectLabour[];
  groups?: ProjectGroupInfo[];
}) {
  const queryClient = useQueryClient();
  const allLabours = useLabours().data?.data ?? [];
  const allGroups = useGroups().data?.data ?? [];

  // How much each labour has actually earned on THIS project (sum of their
  // work-log amounts → the labour expenses recorded against the project).
  const workLogs = useLabourWorkLogs({ projectId }).data?.data ?? [];
  const earnedByLabour = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workLogs) {
      const lid = typeof w.labourId === "string" ? w.labourId : w.labourId._id;
      map.set(lid, (map.get(lid) ?? 0) + (w.amount ?? 0));
    }
    return map;
  }, [workLogs]);

  const [adding, setAdding] = useState(false);
  const [selectId, setSelectId] = useState("");
  const [labourSearch, setLabourSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [newCharge, setNewCharge] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCharge, setEditCharge] = useState("");
  const [pendingRemove, setPendingRemove] = useState<ProjectLabour | null>(null);
  const [search, setSearch] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const groupPickerRef = useRef<HTMLDivElement>(null);

  const involvedIds = new Set(labours.map((l) => l.labourId._id));
  const available = allLabours.filter((l) => !involvedIds.has(l._id));
  const totalCharge = labours.reduce((s, l) => s + (l.charge ?? 0), 0);

  const filteredAvailable = useMemo(() => {
    const q = labourSearch.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.role ?? "").toLowerCase().includes(q)
    );
  }, [available, labourSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickLabour(labourId: string, name: string) {
    onSelectLabour(labourId);
    setLabourSearch(name);
    setPickerOpen(false);
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labours;
    return labours.filter(
      (e) =>
        e.labourId.name.toLowerCase().includes(q) ||
        (e.labourId.role ?? "").toLowerCase().includes(q)
    );
  }, [labours, search]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
  }

  const setMutation = useMutation({
    mutationFn: ({ labourId, charge }: { labourId: string; charge: number }) =>
      addProjectLabour(projectId, labourId, charge),
    onSuccess: () => {
      invalidate();
      setSelectId("");
      setLabourSearch("");
      setPickerOpen(false);
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

  const groupMutation = useMutation({
    mutationFn: (groupId: string) => addProjectGroup(projectId, groupId),
    onSuccess: (updated, groupId) => {
      invalidate();
      setAddingGroup(false);
      setGroupSearch("");
      setGroupPickerOpen(false);
      const g = allGroups.find((x) => x._id === groupId);
      const count = updated.labours?.length ?? 0;
      toast.success(
        `Added ${g?.name ?? "group"}'s labours${
          count ? ` · ${count} on project` : ""
        }`
      );
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Failed to add group"),
  });

  const removeGroupMutation = useMutation({
    mutationFn: (groupId: string) => removeProjectGroup(projectId, groupId),
    onSuccess: () => {
      invalidate();
      toast.success("Group unlinked (labours kept)");
    },
    onError: () => toast.error("Failed to remove group"),
  });

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
    );
  }, [allGroups, groupSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        groupPickerRef.current &&
        !groupPickerRef.current.contains(e.target as Node)
      ) {
        setGroupPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);


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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAddingGroup((v) => !v);
              setGroupSearch("");
              setGroupPickerOpen(false);
            }}
          >
            {addingGroup ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <UsersRound className="h-4 w-4" /> Add Group
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setAdding((v) => !v);
              setLabourSearch("");
              setSelectId("");
              setNewCharge("");
              setPickerOpen(false);
            }}
          >
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
      </div>

      {/* Add from group */}
      {addingGroup && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Pick a group to add all its labours to this project. Labours already
            here are skipped — no duplicates.
          </p>
          {allGroups.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No groups yet.{" "}
              <Link
                href="/groups"
                className="font-medium text-cine-primary hover:underline"
              >
                Create a group first
              </Link>
              .
            </p>
          ) : (
            <div ref={groupPickerRef} className="relative max-w-md">
              <UsersRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={groupSearch}
                onChange={(e) => {
                  setGroupSearch(e.target.value);
                  setGroupPickerOpen(true);
                }}
                onFocus={() => setGroupPickerOpen(true)}
                placeholder="Search groups…"
                className="pl-9"
                autoComplete="off"
                disabled={groupMutation.isPending}
              />
              {groupPickerOpen && filteredGroups.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {filteredGroups.map((g) => (
                    <li key={g._id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => groupMutation.mutate(g._id)}
                        disabled={groupMutation.isPending}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: g.color || "#3076A1" }}
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                          {g.name}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {(g.labours?.length ?? 0)} labour
                          {(g.labours?.length ?? 0) === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {groupPickerOpen &&
                groupSearch.trim() &&
                filteredGroups.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    No matching group.
                  </div>
                )}
            </div>
          )}
        </div>
      )}

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
              <div ref={pickerRef} className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={labourSearch}
                  onChange={(e) => {
                    setLabourSearch(e.target.value);
                    setSelectId("");
                    setPickerOpen(true);
                  }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder="Search & select a labour…"
                  className="pl-9"
                  autoComplete="off"
                />
                {pickerOpen && filteredAvailable.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {filteredAvailable.map((l) => (
                      <li key={l._id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickLabour(l._id, l.name);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {l.name}
                          {l.role ? (
                            <span className="text-slate-400"> — {l.role}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {pickerOpen &&
                  labourSearch.trim() &&
                  filteredAvailable.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      No matching labour.
                    </div>
                  )}
              </div>
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

      {/* Added groups */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Groups:</span>
          {groups.map((g) => (
            <span
              key={g._id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-1 pr-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Link
                href={`/groups/${g._id}`}
                className="inline-flex items-center gap-1.5 hover:text-cine-primary"
              >
                <GroupAvatar
                  name={g.name}
                  color={g.color}
                  avatarUrl={g.avatarUrl}
                  size={18}
                  iconClassName="h-2.5 w-2.5"
                />
                {g.name}
              </Link>
              <button
                type="button"
                onClick={() => removeGroupMutation.mutate(g._id)}
                disabled={removeGroupMutation.isPending}
                aria-label={`Unlink ${g.name}`}
                className="rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      {labours.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search involved labours by name or role"
            className="pl-9"
          />
        </div>
      )}

      {/* Roster */}
      {labours.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No labours added to this project yet.
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No involved labours match your search.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {visible.map((entry) => {
            const labour = entry.labourId;
            const isEditing = editingId === labour._id;
            const earned = earnedByLabour.get(labour._id) ?? 0;
            return (
              <div
                key={labour._id}
                className="flex items-center gap-3 bg-white px-3 py-2 dark:bg-slate-900/60"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold ${avatarColor(
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
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Link
                    href={`/labours/${labour._id}`}
                    className="truncate text-sm font-medium text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
                  >
                    {labour.name}
                  </Link>
                  {labour.role && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-slate-400 sm:flex">
                      <Briefcase className="h-3 w-3" />
                      {labour.role}
                    </span>
                  )}
                </div>

                {/* Price (editable) */}
                {isEditing ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={editCharge}
                      onChange={(e) => setEditCharge(e.target.value)}
                      className="h-7 w-24 text-xs"
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
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                    title="Edit price"
                  >
                    {inr(entry.charge)}
                    <Pencil className="h-3 w-3 text-slate-400" />
                  </button>
                )}

                {/* Earned */}
                <span className="hidden w-24 shrink-0 text-right text-xs text-slate-500 dark:text-slate-400 sm:block">
                  Earned{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {inr(earned)}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setPendingRemove(entry)}
                  aria-label="Remove labour"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
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
