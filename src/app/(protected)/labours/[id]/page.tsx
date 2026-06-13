"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

import { useLabour, useLabourMemberships } from "@/hooks/useLabours";
import { useProjects } from "@/hooks/useProjects";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
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
import { ProjectFilter } from "@/components/ui/project-filter";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function projectLabel(p: WorkLogProjectRef | string | null): string {
  if (!p) return "Deleted project";
  if (typeof p === "string") return "Project";
  return p.clientName || p.serviceType || "Project";
}

function projId(p: WorkLogProjectRef | string | null): string {
  if (!p) return "__deleted__";
  return typeof p === "string" ? p : p._id;
}

const EMPTY = {
  projectId: "",
  workDate: todayISO(),
  sessionLabel: "",
  days: "1",
  rate: "",
  paymentAccountId: "",
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
  const memberships = useLabourMemberships(id).data;

  // Only projects this labour is added to — a session can only be logged there.
  const projectsQuery = useProjects({ labourId: id });
  const projects = projectsQuery.data?.data ?? [];

  const logsQuery = useLabourWorkLogs({ labourId: id });
  const logs = logsQuery.data?.data ?? [];

  const [form, setForm] = useState(EMPTY);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LabourWorkLog | null>(null);

  const payAccounts = usePaymentAccounts().data?.data ?? [];

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

  // Earnings grouped by project, highest first — so we can show the top project.
  const byProject = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; total: number; sessions: number }
    >();
    for (const l of logs) {
      const pid = projId(l.projectId);
      const entry = map.get(pid) ?? {
        id: pid,
        name: projectLabel(l.projectId),
        total: 0,
        sessions: 0,
      };
      entry.total += l.amount ?? 0;
      entry.sessions += 1;
      map.set(pid, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [logs]);

  const topProject = byProject[0];

  // Search + pagination for the work-sessions list (client-side — all of this
  // labour's logs are already loaded).
  const LOGS_PER_PAGE = 8;
  const [logSearch, setLogSearch] = useState("");
  const [logProject, setLogProject] = useState(""); // "" = all projects
  const [logPage, setLogPage] = useState(1);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (logProject && projId(l.projectId) !== logProject) return false;
      if (!q) return true;
      const date = new Date(l.workDate).toLocaleDateString().toLowerCase();
      return (
        projectLabel(l.projectId).toLowerCase().includes(q) ||
        (l.sessionLabel ?? "").toLowerCase().includes(q) ||
        date.includes(q)
      );
    });
  }, [logs, logSearch, logProject]);

  const selectedProject = byProject.find((p) => p.id === logProject);

  const logPageCount = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const pagedLogs = useMemo(
    () =>
      filteredLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE),
    [filteredLogs, logPage]
  );

  useEffect(() => {
    setLogPage(1);
  }, [logSearch, logProject]);
  useEffect(() => {
    if (logPage > logPageCount) setLogPage(logPageCount);
  }, [logPage, logPageCount]);

  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setForm({ ...EMPTY, rate: labour?.dailyWage != null ? String(labour.dailyWage) : "" });
      setShowSessionForm(false);
      toast.success("Work session added & expense recorded");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.error ?? "Failed to add work session"
      ),
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
    if (!form.paymentAccountId) {
      toast.error("Select which account you paid the salary from");
      return;
    }
    createMutation.mutate({
      labourId: id,
      projectId: form.projectId,
      workDate: form.workDate,
      sessionLabel: form.sessionLabel.trim() || undefined,
      days,
      rate,
      paymentAccountId: form.paymentAccountId,
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
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cine-primary/10 text-lg font-semibold text-cine-primary">
          {labour.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={labour.avatarUrl}
              alt={labour.name}
              className="h-full w-full object-cover"
            />
          ) : (
            labour.name.trim().charAt(0).toUpperCase() || "?"
          )}
        </div>
        <div className="min-w-0 flex-1">
          {labour.role && (
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {labour.role}
            </p>
          )}
          <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-50">
            {labour.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {labour.dailyWage != null && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Banknote className="h-3 w-3" /> {inr(labour.dailyWage)}/day
              </Badge>
            )}
            {(labour.region || labour.state) && (
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                <MapPin className="h-3 w-3" />
                {Array.from(
                  new Set([labour.region, labour.state].filter(Boolean))
                ).join(" · ")}
              </Badge>
            )}
            {labour.phone && (
              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Phone className="h-3 w-3" /> {labour.phone}
              </Badge>
            )}
          </div>
          {labour.details && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {labour.details}
            </p>
          )}
        </div>
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Banknote className="h-4 w-4" />}
          label="Total earned"
          value={inr(totalPaid)}
          accent
        />
        <StatCard
          icon={<FolderKanban className="h-4 w-4" />}
          label="Projects worked"
          value={String(byProject.length)}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Top project"
          value={topProject ? inr(topProject.total) : "—"}
          sub={topProject?.name}
          highlight
        />
      </div>

      {/* Earnings by project */}
      {byProject.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
            Earnings by project
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {byProject.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    setLogProject((cur) => (cur === p.id ? "" : p.id))
                  }
                  title="Filter sessions by this project"
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    logProject === p.id ? "bg-cine-primary/5" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {p.name}
                    </span>
                    {i === 0 && (
                      <span className="shrink-0 rounded bg-cine-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-cine-primary">
                        Highest
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-slate-400">
                      {p.sessions} session(s)
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {inr(p.total)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Member of: vendors & groups */}
      {((memberships?.vendors.length ?? 0) > 0 ||
        (memberships?.groups.length ?? 0) > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
            Member of
          </h3>
          {(memberships?.vendors.length ?? 0) > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Vendors
              </p>
              <div className="flex flex-wrap gap-2">
                {memberships!.vendors.map((v) => (
                  <Link
                    key={v._id}
                    href={`/vendors/${v._id}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {v.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(memberships?.groups.length ?? 0) > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Groups
              </p>
              <div className="flex flex-wrap gap-2">
                {memberships!.groups.map((g) => (
                  <Link
                    key={g._id}
                    href={`/groups/${g._id}`}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: g.color || "#3076A1" }}
                    />
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Work sessions */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Work sessions
            </h3>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              {inr(totalPaid)}
            </span>
          </div>
          <Button size="sm" onClick={() => setShowSessionForm((v) => !v)}>
            {showSessionForm ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Log session
              </>
            )}
          </Button>
        </div>

        {showSessionForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/30"
          >
            {projects.length === 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                This labour isn&apos;t added to any project yet. Add them to a
                project&apos;s &ldquo;Involved Labours&rdquo; list first, then you
                can log sessions here.
              </p>
            )}
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
            <Field label="Paid from (account) *">
              <select
                value={form.paymentAccountId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentAccountId: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                required
              >
                <option value="">Select account…</option>
                {payAccounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <Input
                placeholder="Optional"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </Field>
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Expense:{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {inr(amountPreview)}
                </span>
              </p>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Add session"}
              </Button>
            </div>
          </form>
        )}

        {logs.length > 0 && (
          <div className="space-y-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search by project, session or date"
                  className="pl-9"
                />
              </div>
              <ProjectFilter
                value={logProject}
                onChange={setLogProject}
                options={byProject.map((p) => ({ _id: p.id, name: p.name }))}
                includeNone={false}
              />
            </div>
            {selectedProject && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Earned from <span className="font-medium">{selectedProject.name}</span>:{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {inr(selectedProject.total)}
                </span>{" "}
                · {selectedProject.sessions} session(s)
              </p>
            )}
          </div>
        )}

        {logsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : logs.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No work sessions logged yet.
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No sessions match your search.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagedLogs.map((log) => (
              <li
                key={log._id}
                className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {projectLabel(log.projectId)}
                    </p>
                    {log.sessionLabel && (
                      <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                        {log.sessionLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(log.workDate).toLocaleDateString()}
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    {log.days} day(s) × {inr(log.rate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {inr(log.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(log)}
                    aria-label="Remove session"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {filteredLogs.length > LOGS_PER_PAGE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              Page {logPage} of {logPageCount} · {filteredLogs.length} sessions
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                disabled={logPage <= 1}
                aria-label="Previous page"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLogPage((p) => Math.min(logPageCount, p + 1))}
                disabled={logPage >= logPageCount}
                aria-label="Next page"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
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

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span
          className={
            highlight || accent ? "text-cine-primary" : "text-slate-400"
          }
        >
          {icon}
        </span>
        {label}
      </div>
      <p
        className={`mt-1 truncate text-xl font-bold ${
          accent
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-900 dark:text-slate-50"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/labours">
        <ArrowLeft className="h-4 w-4" /> Back to labours
      </Link>
    </Button>
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
