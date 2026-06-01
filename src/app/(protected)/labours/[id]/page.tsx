"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarDays,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";

import { useLabour } from "@/hooks/useLabours";
import { useProjects } from "@/hooks/useProjects";
import { useLabourWorkLogs, workLogKeys } from "@/hooks/useLabourWorkLogs";
import {
  createWorkLog,
  deleteWorkLog,
  type LabourWorkLog,
  type WorkLogProjectRef,
} from "@/lib/api/labour-worklogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function projectLabel(p: WorkLogProjectRef | string): string {
  if (typeof p === "string") return "Project";
  return p.clientName || p.serviceType || "Project";
}

const EMPTY = {
  projectId: "",
  workDate: todayISO(),
  sessionLabel: "",
  days: "1",
  rate: "",
  notes: "",
};

export default function LabourDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const queryClient = useQueryClient();

  const labourQuery = useLabour(id);
  const labour = labourQuery.data;

  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.data ?? [];

  const logsQuery = useLabourWorkLogs({ labourId: id });
  const logs = logsQuery.data?.data ?? [];

  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<LabourWorkLog | null>(null);

  // Default the rate to the labour's daily wage once it loads.
  useEffect(() => {
    if (labour?.dailyWage != null) {
      setForm((f) => (f.rate === "" ? { ...f, rate: String(labour.dailyWage) } : f));
    }
  }, [labour?.dailyWage]);

  const amountPreview = useMemo(() => {
    const d = Number(form.days);
    const r = Number(form.rate);
    if (Number.isNaN(d) || Number.isNaN(r)) return 0;
    return Math.round(d * r * 100) / 100;
  }, [form.days, form.rate]);

  const totalPaid = useMemo(
    () => logs.reduce((s, l) => s + (l.amount ?? 0), 0),
    [logs]
  );

  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setForm({ ...EMPTY, rate: labour?.dailyWage != null ? String(labour.dailyWage) : "" });
      toast.success("Work session added & expense recorded");
    },
    onError: () => toast.error("Failed to add work session"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setPendingDelete(null);
      toast.success("Work session removed");
    },
    onError: () => toast.error("Failed to remove work session"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId) {
      toast.error("Please choose a project");
      return;
    }
    const days = Number(form.days);
    const rate = Number(form.rate);
    if (Number.isNaN(days) || days <= 0) {
      toast.error("Days must be greater than 0");
      return;
    }
    if (Number.isNaN(rate) || rate < 0) {
      toast.error("Enter a valid rate");
      return;
    }
    createMutation.mutate({
      labourId: id,
      projectId: form.projectId,
      workDate: form.workDate,
      sessionLabel: form.sessionLabel.trim() || undefined,
      days,
      rate,
      notes: form.notes.trim() || undefined,
    });
  }

  if (labourQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (labourQuery.isError || !labour) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-red-400">Failed to load this labour.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />

      {/* Labour header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {labour.name}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          {labour.role && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              {labour.role}
            </span>
          )}
          {labour.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {labour.phone}
            </span>
          )}
          {labour.dailyWage != null && (
            <span className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-slate-400" />
              {inr(labour.dailyWage)} / day
            </span>
          )}
        </div>
        {labour.details && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {labour.details}
          </p>
        )}
      </div>

      {/* Add work session */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
          <Plus className="h-4 w-4" /> Log a work session
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project *">
            <select
              value={form.projectId}
              onChange={(e) =>
                setForm((f) => ({ ...f, projectId: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              required
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.clientName} — {p.serviceType}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date (session) *">
            <Input
              type="date"
              value={form.workDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, workDate: e.target.value }))
              }
              required
            />
          </Field>
          <Field label="Session label">
            <Input
              placeholder="e.g. Day 1, Morning shoot"
              value={form.sessionLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, sessionLabel: e.target.value }))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Days *">
              <Input
                type="number"
                min={0}
                step="0.5"
                value={form.days}
                onChange={(e) =>
                  setForm((f) => ({ ...f, days: e.target.value }))
                }
                required
              />
            </Field>
            <Field label="Rate / day (₹) *">
              <Input
                type="number"
                min={0}
                value={form.rate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rate: e.target.value }))
                }
                required
              />
            </Field>
          </div>
        </div>
        <Field label="Notes">
          <Input
            placeholder="Optional"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Expense:{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {inr(amountPreview)}
            </span>
          </p>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Add session"}
          </Button>
        </div>
      </form>

      {/* Work session list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Work sessions
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold">{inr(totalPaid)}</span>
          </span>
        </div>

        {logsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : logs.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No work sessions logged yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <li
                key={log._id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                    {projectLabel(log.projectId)}
                    {log.sessionLabel && (
                      <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                        · {log.sessionLabel}
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(log.workDate).toLocaleDateString()} · {log.days} day(s) ×{" "}
                    {inr(log.rate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {inr(log.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(log)}
                    aria-label="Remove session"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove work session?"
        description="This also deletes the linked labour expense from the ledger."
        confirmLabel="Remove"
        onConfirm={() =>
          pendingDelete && deleteMutation.mutate(pendingDelete._id)
        }
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/labours"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-cine-primary dark:text-slate-300"
    >
      <ArrowLeft className="h-4 w-4" /> Back to labours
    </Link>
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
