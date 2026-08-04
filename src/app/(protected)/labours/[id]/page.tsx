"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
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
import { fetchLabourPayments } from "@/lib/api/labour-attendance";
import { labourAttendanceKeys } from "@/hooks/useLabourAttendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectFilter } from "@/components/ui/project-filter";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDate } from "@/lib/format-date";
import { formatPhone } from "@/lib/country-codes";

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

/** A row in the unified "work sessions" list — a logged session OR an
 * attendance settlement payment (the user treats both as work entries). */
interface LabourListEntry {
  key: string;
  kind: "session" | "attendance";
  pid: string;
  projectName: string;
  date: string;
  amount: number;
  /** session only */
  days?: number;
  rate?: number;
  sessionLabel?: string;
  log?: LabourWorkLog;
  /** attendance only */
  account?: string;
}

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

// Method ↔ account-type mapping, so picking a method filters the accounts
// (and picking an account sets the method) like the ledger. null = no filter.
function methodForType(type: string): string {
  switch (type) {
    case "BANK":
      return "BANK_TRANSFER";
    case "CASH":
      return "CASH";
    case "UPI":
      return "UPI";
    case "CARD":
      return "CARD";
    default:
      return "OTHER";
  }
}
function accountTypeForMethod(method: string): string | null {
  switch (method) {
    case "BANK_TRANSFER":
    case "CHEQUE":
      return "BANK";
    case "CASH":
      return "CASH";
    case "UPI":
      return "UPI";
    case "CARD":
      return "CARD";
    default:
      return null;
  }
}

const EMPTY = {
  projectId: "",
  workDate: todayISO(),
  sessionLabel: "",
  days: "1",
  rate: "",
  paymentAccountId: "",
  paymentMethod: "",
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
  const [pendingDelete, setPendingDelete] = useState<LabourWorkLog | null>(null);

  const payAccounts = usePaymentAccounts().data?.data ?? [];
  // "Paid from" options filtered to match the selected method.
  const accountType = accountTypeForMethod(form.paymentMethod);
  const visibleAccounts = accountType
    ? payAccounts.filter((a) => a.type === accountType)
    : payAccounts;

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

  // Attendance settlement payments for this labour (across projects).
  const attPaymentsQuery = useQuery({
    queryKey: [...labourAttendanceKeys.all, "labour-payments", id],
    queryFn: () => fetchLabourPayments(id),
    enabled: !!id,
  });
  const attPayments = attPaymentsQuery.data ?? [];
  const attendancePaid = useMemo(
    () => attPayments.reduce((s, p) => s + (p.amount ?? 0), 0),
    [attPayments]
  );

  // Work-session earnings (the per-day "Log session" flow).
  const workLogPaid = useMemo(
    () => logs.reduce((s, l) => s + (l.amount ?? 0), 0),
    [logs]
  );
  // Total earned = work-session expenses + attendance settlements.
  const totalEarned = workLogPaid + attendancePaid;

  // Unified list = work-log sessions + attendance settlement payments. Both are
  // shown as "work" entries (the attendance pay is its own ledger expense, so
  // no double-count — this just displays them together).
  const entries = useMemo<LabourListEntry[]>(() => {
    const out: LabourListEntry[] = [];
    for (const l of logs) {
      out.push({
        key: `s-${l._id}`,
        kind: "session",
        pid: projId(l.projectId),
        projectName: projectLabel(l.projectId),
        date: l.workDate,
        amount: l.amount ?? 0,
        days: l.days,
        rate: l.rate,
        sessionLabel: l.sessionLabel,
        log: l,
      });
    }
    for (const p of attPayments) {
      const proj =
        typeof p.projectId === "object" && p.projectId ? p.projectId : null;
      out.push({
        key: `a-${p._id}`,
        kind: "attendance",
        pid: proj?._id ?? (typeof p.projectId === "string" ? p.projectId : "__deleted__"),
        projectName: proj
          ? [proj.clientName, proj.serviceType].filter(Boolean).join(" — ") ||
            "Project"
          : "Project",
        date: p.paidDate,
        amount: p.amount ?? 0,
        account:
          typeof p.paymentAccountId === "object" && p.paymentAccountId
            ? p.paymentAccountId.name
            : undefined,
      });
    }
    return out.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [logs, attPayments]);

  // One card per project the labour relates to (its assignment and/or its
  // sessions/attendance) — groups everything that used to be 3 separate lists.
  const projectCards = useMemo(() => {
    const byPid = new Map<
      string,
      { entries: LabourListEntry[]; earned: number; name: string }
    >();
    for (const e of entries) {
      const g = byPid.get(e.pid) ?? { entries: [], earned: 0, name: e.projectName };
      g.entries.push(e);
      g.earned += e.amount;
      byPid.set(e.pid, g);
    }
    const assign = new Map<
      string,
      { name: string; plannedDays?: number; totalAmount?: number; rate?: number }
    >();
    for (const p of projects) {
      const entry = (p.labours ?? []).find((l) => l.labourId?._id === id);
      const plannedDays = entry?.plannedDays;
      const totalAmount = entry?.totalAmount;
      const rate =
        totalAmount && plannedDays
          ? Math.round(totalAmount / plannedDays)
          : entry?.charge;
      assign.set(p._id, {
        name: [p.clientName, p.serviceType].filter(Boolean).join(" — ") || "Project",
        plannedDays,
        totalAmount,
        rate,
      });
    }
    const ids = new Set<string>([...assign.keys(), ...byPid.keys()]);
    return Array.from(ids)
      .map((pid) => {
        const g = byPid.get(pid);
        const a = assign.get(pid);
        return {
          id: pid,
          name: a?.name || g?.name || "Project",
          assigned: !!a,
          earned: g?.earned ?? 0,
          sessionCount: g?.entries.length ?? 0,
          plannedDays: a?.plannedDays,
          rate: a?.rate,
          entries: g?.entries ?? [],
        };
      })
      .sort((x, y) => y.earned - x.earned);
  }, [entries, projects, id]);

  const topProject = projectCards.find((c) => c.earned > 0);
  const projectsWorked = projectCards.filter((c) => c.sessionCount > 0).length;

  // Which project's inline "Log session" form is open.
  const [logForProject, setLogForProject] = useState<string | null>(null);
  function openLog(card: { id: string; rate?: number }) {
    if (logForProject === card.id) {
      setLogForProject(null);
      return;
    }
    setLogForProject(card.id);
    setForm({
      ...EMPTY,
      projectId: card.id,
      rate: String(card.rate ?? labour?.dailyWage ?? ""),
    });
  }

  // ── Projects list pagination ──────────────────────────────────────────────
  const PROJ_PER_PAGE = 6;
  const [projPage, setProjPage] = useState(1);
  const projPageCount = Math.max(1, Math.ceil(projectCards.length / PROJ_PER_PAGE));
  const pagedCards = useMemo(
    () =>
      projectCards.slice((projPage - 1) * PROJ_PER_PAGE, projPage * PROJ_PER_PAGE),
    [projectCards, projPage]
  );
  useEffect(() => {
    if (projPage > projPageCount) setProjPage(projPageCount);
  }, [projPage, projPageCount]);

  // ── Work-sessions list: a flat list of all entries (work-session + project
  // session), with search, project filter and pagination — separate from the
  // projects list above. ─────────────────────────────────────────────────────
  const SESS_PER_PAGE = 8;
  const [logSearch, setLogSearch] = useState("");
  const [logProject, setLogProject] = useState(""); // "" = all projects
  const [logPage, setLogPage] = useState(1);
  const filteredEntries = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return entries.filter((e) => {
      if (logProject && e.pid !== logProject) return false;
      if (!q) return true;
      const date = formatDate(e.date).toLowerCase();
      return (
        e.projectName.toLowerCase().includes(q) ||
        (e.sessionLabel ?? "").toLowerCase().includes(q) ||
        date.includes(q)
      );
    });
  }, [entries, logSearch, logProject]);
  const sessPageCount = Math.max(1, Math.ceil(filteredEntries.length / SESS_PER_PAGE));
  const pagedEntries = useMemo(
    () => filteredEntries.slice((logPage - 1) * SESS_PER_PAGE, logPage * SESS_PER_PAGE),
    [filteredEntries, logPage]
  );
  const selectedProjEarned =
    logProject != null
      ? projectCards.find((c) => c.id === logProject)?.earned
      : undefined;
  useEffect(() => {
    setLogPage(1);
  }, [logSearch, logProject]);
  useEffect(() => {
    if (logPage > sessPageCount) setLogPage(sessPageCount);
  }, [logPage, sessPageCount]);

  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setForm({ ...EMPTY, rate: labour?.dailyWage != null ? String(labour.dailyWage) : "" });
      setLogForProject(null);
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
      paymentMethod: form.paymentMethod || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  if (labourQuery.isLoading) {
    return (
      <div className="max-w-5xl space-y-4">
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
    <div className="max-w-5xl space-y-4">
      <BackLink />

      {/* Labour header */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cine-primary to-indigo-600 text-lg font-semibold text-white shadow-sm">
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
          <h2 className="truncate text-xl font-bold text-slate-900 dark:text-slate-50">
            {labour.name}
          </h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {[
              Array.from(
                new Set([labour.region, labour.state].filter(Boolean))
              ).join(" · ") || null,
              formatPhone(labour.countryCode, labour.phone) || null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          {labour.details && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">
              {labour.details}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {labour.dailyWage != null ? "Daily wage" : "Total earned"}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {labour.dailyWage != null ? inr(labour.dailyWage) : inr(totalEarned)}
          </p>
          <p className="text-[11px] text-slate-400">
            {labour.dailyWage != null ? "per day" : "all projects"}
          </p>
        </div>
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Banknote className="h-4 w-4" />}
          label="Total earned"
          value={inr(totalEarned)}
          accent
        />
        <StatCard
          icon={<FolderKanban className="h-4 w-4" />}
          label="Projects worked"
          value={String(projectsWorked)}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Top project"
          value={topProject ? inr(topProject.earned) : "—"}
          sub={topProject?.name}
          highlight
        />
      </div>

      {/* Projects — tap a project to open its attendance; log a session from the left */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <FolderKanban className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Projects
          </h3>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {projectCards.length}
          </span>
        </div>

        {projectCards.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Not on any project yet. Add this labour to a project first.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagedCards.map((c, idx) => {
              const i = (projPage - 1) * PROJ_PER_PAGE + idx;
              const logging = logForProject === c.id;
              const meta = (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {c.name}
                    </span>
                    {i === 0 && c.earned > 0 && (
                      <span className="shrink-0 rounded bg-cine-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-cine-primary">
                        Highest
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {c.plannedDays != null
                      ? `${c.plannedDays} planned days`
                      : c.assigned
                        ? "No plan set"
                        : "Removed from project"}
                    {c.rate ? ` · ${inr(c.rate)}/day` : ""}
                    {` · ${c.sessionCount} session${c.sessionCount === 1 ? "" : "s"}`}
                  </p>
                </>
              );
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-2 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {c.assigned ? (
                      <button
                        type="button"
                        onClick={() => openLog(c)}
                        title="Log session"
                        aria-label="Log session"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                          logging
                            ? "border-cine-primary bg-cine-primary text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {logging ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                    ) : (
                      <span className="h-8 w-8 shrink-0" />
                    )}

                    {c.assigned ? (
                      <Link
                        href={`/labours/${id}/attendance/${c.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">{meta}</div>
                        <span className="shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {inr(c.earned)}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3 opacity-70">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">{meta}</div>
                        <span className="shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {inr(c.earned)}
                        </span>
                      </div>
                    )}
                  </div>

                  {logging && (
                    <form
                      onSubmit={handleSubmit}
                      className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30"
                    >
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Field label="Date *">
                          <DatePicker value={form.workDate} onChange={(v) => setForm((f) => ({ ...f, workDate: v }))} placeholder="Pick a date" />
                        </Field>
                        <Field label="Days *">
                          <Input type="number" min={0} step="0.5" value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} />
                        </Field>
                        <Field label="Rate / day *">
                          <Input type="number" min={0} value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
                        </Field>
                        <Field label="Type">
                          <select
                            value={form.paymentMethod}
                            onChange={(e) => {
                              const method = e.target.value;
                              const t = accountTypeForMethod(method);
                              setForm((f) => {
                                const acc = payAccounts.find((a) => a._id === f.paymentAccountId);
                                const keep = !t || !f.paymentAccountId || acc?.type === t;
                                return { ...f, paymentMethod: method, paymentAccountId: keep ? f.paymentAccountId : "" };
                              });
                            }}
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          >
                            <option value="">Method…</option>
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Paid from *">
                          <select
                            value={form.paymentAccountId}
                            onChange={(e) => {
                              const accId = e.target.value;
                              const acc = payAccounts.find((a) => a._id === accId);
                              setForm((f) => ({ ...f, paymentAccountId: accId, paymentMethod: acc ? methodForType(acc.type) : f.paymentMethod }));
                            }}
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          >
                            <option value="">Select account…</option>
                            {visibleAccounts.map((acc) => (
                              <option key={acc._id} value={acc._id}>{acc.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Session label">
                          <Input placeholder="e.g. Day 1" value={form.sessionLabel} onChange={(e) => setForm((f) => ({ ...f, sessionLabel: e.target.value }))} />
                        </Field>
                        <Field label="Notes">
                          <Input placeholder="Optional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                        </Field>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Expense:{" "}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{inr(amountPreview)}</span>
                        </p>
                        <Button type="submit" size="sm" disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Saving..." : "Add session"}
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {projectCards.length > PROJ_PER_PAGE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Page {projPage} of {projPageCount} · {projectCards.length} projects</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setProjPage((p) => Math.max(1, p - 1))} disabled={projPage <= 1} aria-label="Previous page" className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setProjPage((p) => Math.min(projPageCount, p + 1))} disabled={projPage >= projPageCount} aria-label="Next page" className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Work sessions — flat list of all entries (work session + project session) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Work sessions
          </h3>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {inr(totalEarned)}
          </span>
        </div>

        {entries.length > 0 && (
          <div className="space-y-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Search by project, session or date" className="pl-9" />
              </div>
              <ProjectFilter
                value={logProject}
                onChange={setLogProject}
                options={projectCards.map((c) => ({ _id: c.id, name: c.name }))}
                includeNone={false}
              />
            </div>
            {logProject && selectedProjEarned != null && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium">
                  {projectCards.find((c) => c.id === logProject)?.name}
                </span>
                :{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {inr(selectedProjEarned)}
                </span>
              </p>
            )}
          </div>
        )}

        {logsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No work sessions yet.
          </p>
        ) : filteredEntries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No entries match your search.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagedEntries.map((e) => {
              const isAtt = e.kind === "attendance";
              return (
                <li key={e.key} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isAtt ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-cine-primary/10 text-cine-primary"}`}>
                    {isAtt ? <Banknote className="h-4 w-4" /> : <FolderKanban className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{e.projectName}</p>
                      {isAtt ? (
                        <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">Project session</span>
                      ) : (
                        e.sessionLabel && (
                          <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{e.sessionLabel}</span>
                        )
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(e.date)}
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      {isAtt ? `Settled${e.account ? ` · ${e.account}` : ""}` : `${e.days} day(s) × ${inr(e.rate ?? 0)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{inr(e.amount)}</span>
                    {e.kind === "session" && e.log ? (
                      <button type="button" onClick={() => setPendingDelete(e.log!)} aria-label="Remove session" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <Link href={`/labours/${id}/attendance/${e.pid}`} aria-label="Open to edit / undo" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-cine-primary/10 hover:text-cine-primary group-hover:opacity-100">
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filteredEntries.length > SESS_PER_PAGE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Page {logPage} of {sessPageCount} · {filteredEntries.length} entries</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage <= 1} aria-label="Previous page" className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setLogPage((p) => Math.min(sessPageCount, p + 1))} disabled={logPage >= sessPageCount} aria-label="Next page" className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
