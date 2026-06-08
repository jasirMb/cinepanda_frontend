"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Eye,
  IndianRupee,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { projectsKeys, useProjects } from "@/hooks/useProjects";
import { useProjectsOverview } from "@/hooks/useDashboard";
import { useLedgerSummary } from "@/hooks/useLedger";
import {
  deleteProject,
  type ProjectPopulated,
  type ProjectStatus,
  type ProjectsListQuery,
} from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  PLANNING: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  ONGOING:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  ON_HOLD:
    "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_STRIPE: Record<ProjectStatus, string> = {
  PLANNING: "bg-blue-500",
  ONGOING: "bg-amber-500",
  ON_HOLD: "bg-orange-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-500",
};

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

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ProjectsListQuery>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const params = useMemo(() => {
    const p: ProjectsListQuery = {};
    if (filters.status) p.status = filters.status;
    if (filters.startDate) p.startDate = filters.startDate;
    if (filters.endDate) p.endDate = filters.endDate;
    return p;
  }, [filters]);

  const projectsQuery = useProjects(params);
  const projects = projectsQuery.data?.data ?? [];

  // Global status counts (independent of the current filter) for the summary bar.
  const overviewQuery = useProjectsOverview();
  const ov = overviewQuery.data?.data;
  const statusSummary: {
    key: ProjectStatus | "ALL";
    label: string;
    count: number;
    dot: string;
  }[] = [
    { key: "ALL", label: "All", count: ov?.totalProjects ?? projects.length, dot: "bg-slate-400" },
    { key: "PLANNING", label: "Planning", count: ov?.planningProjects ?? 0, dot: STATUS_STRIPE.PLANNING },
    { key: "ONGOING", label: "Ongoing", count: ov?.ongoingProjects ?? 0, dot: STATUS_STRIPE.ONGOING },
    { key: "ON_HOLD", label: "On Hold", count: ov?.onHoldProjects ?? 0, dot: STATUS_STRIPE.ON_HOLD },
    { key: "COMPLETED", label: "Completed", count: ov?.completedProjects ?? 0, dot: STATUS_STRIPE.COMPLETED },
    { key: "CANCELLED", label: "Cancelled", count: ov?.cancelledProjects ?? 0, dot: STATUS_STRIPE.CANCELLED },
  ];

  const ledgerSummaryQuery = useLedgerSummary();
  const financialsByProject = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; net: number }>();
    for (const row of ledgerSummaryQuery.data?.data?.byProject ?? []) {
      const id = row._id.projectId;
      const entry = map.get(id) ?? { income: 0, expense: 0, net: 0 };
      if (row._id.entryType === "INCOME") entry.income += row.total;
      else if (row._id.entryType === "EXPENSE") entry.expense += row.total;
      entry.net = entry.income - entry.expense;
      map.set(id, entry);
    }
    return map;
  }, [ledgerSummaryQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project moved to trash");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Failed to delete project"),
  });

  if (projectsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <p className="text-red-400">Failed to load projects. Please try again.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Projects
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track Cinepanda installation projects and their lifecycle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table
          </Button>
          <Button asChild>
            <Link href="/projects/new">New Project</Link>
          </Button>
        </div>
      </div>

      {/* Status summary — counts per status; click to filter */}
      <div className="flex flex-wrap gap-2">
        {statusSummary.map((s) => {
          const active = (filters.status ?? "ALL") === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  status: s.key === "ALL" ? undefined : (s.key as ProjectStatus),
                }))
              }
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-cine-primary bg-cine-primary/10 text-cine-primary"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="font-medium">{s.label}</span>
              <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {s.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <Select
            value={filters.status ?? "ALL"}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                status: v === "ALL" ? undefined : (v as ProjectStatus),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PLANNING">Planning</SelectItem>
              <SelectItem value="ONGOING">Ongoing</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Start From
          </label>
          <DatePicker
            value={filters.startDate ?? ""}
            onChange={(v) =>
              setFilters((f) => ({ ...f, startDate: v || undefined }))
            }
            placeholder="From date"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Start Until
          </label>
          <DatePicker
            value={filters.endDate ?? ""}
            onChange={(v) =>
              setFilters((f) => ({ ...f, endDate: v || undefined }))
            }
            placeholder="To date"
          />
        </div>
        {(filters.status || filters.startDate || filters.endDate) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No projects found. Create your first project to get started.
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p: ProjectPopulated) => (
            <ProjectCard
              key={p._id}
              project={p}
              financials={financialsByProject.get(p._id)}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <table className="w-full min-w-[1100px] table-fixed text-sm">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Service
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Value
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Net P/L
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Start
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Expected End
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p: ProjectPopulated) => (
                <tr
                  key={p._id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                >
                  <td
                    className="truncate px-4 py-3 font-medium text-slate-900 dark:text-slate-50"
                    title={p.clientName}
                  >
                    {p.clientName}
                  </td>
                  <td
                    className="truncate px-4 py-3 text-slate-700 dark:text-slate-300"
                    title={p.serviceType}
                  >
                    {p.serviceType}
                  </td>
                  <td className="truncate px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatINR(p.projectValue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(() => {
                      const fin = financialsByProject.get(p._id);
                      if (!fin || (fin.income === 0 && fin.expense === 0)) {
                        return <span className="text-slate-400">—</span>;
                      }
                      const positive = fin.net >= 0;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                            positive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {positive ? "+" : "−"}
                          {formatINR(Math.abs(fin.net))}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="truncate px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                    {formatDate(p.startDate)}
                  </td>
                  <td className="truncate px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                    {formatDate(p.expectedCompletionDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/projects/${p._id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link href={`/projects/${p._id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                        onClick={() => setDeleteTarget(p._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete project"
        description={(() => {
          const t = deleteTarget
            ? projects.find((p: ProjectPopulated) => p._id === deleteTarget)
            : null;
          const lc = t?.ledgerCount ?? 0;
          const cc = t?.labours?.length ?? 0;
          const parts = [
            `"${t?.clientName ?? "This project"}" will be moved to the Trash.`,
          ];
          if (lc > 0)
            parts.push(
              `Its ${lc} ledger entr${lc === 1 ? "y" : "ies"} will be kept — preserved as financial records, just unlinked from the project.`
            );
          if (cc > 0)
            parts.push(
              `${cc} crew member${cc === 1 ? "" : "s"} on the roster won't be affected.`
            );
          parts.push("You can restore it from Trash.");
          return parts.join(" ");
        })()}
        requireText="DELETE"
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function ProjectCard({
  project,
  financials,
  onDelete,
}: {
  project: ProjectPopulated;
  financials?: { income: number; expense: number; net: number };
  onDelete: (id: string) => void;
}) {
  const hasActivity =
    financials && (financials.income > 0 || financials.expense > 0);
  const isProfit = (financials?.net ?? 0) >= 0;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div
        aria-hidden
        className={`absolute left-0 top-0 h-full w-1 ${STATUS_STRIPE[project.status]}`}
      />
      <div className="flex flex-1 flex-col gap-3 p-4 pl-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(project.clientName)}`}
          >
            {getInitials(project.clientName)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {project.clientName}
            </h3>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {project.serviceType}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[project.status]}`}
          >
            {project.status.replace("_", " ")}
          </span>
        </div>

        {/* Value + Profit/Loss */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="inline-flex items-center gap-1 text-xl font-bold text-slate-900 dark:text-slate-50">
            <IndianRupee className="h-4 w-4" />
            {project.projectValue.toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}
          </p>
          {hasActivity ? (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                isProfit
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              }`}
              title={`Income ${formatINR(financials!.income)} − Expense ${formatINR(financials!.expense)}`}
            >
              {isProfit ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isProfit ? "Profit" : "Loss"} {isProfit ? "+" : "−"}
              {formatINR(Math.abs(financials!.net))}
            </span>
          ) : (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              No activity
            </span>
          )}
        </div>

        {/* Dates */}
        <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Start:
            </span>
            <span>{formatDate(project.startDate)}</span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Expected:
            </span>
            <span>{formatDate(project.expectedCompletionDate)}</span>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Link
            href={`/projects/${project._id}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Eye className="h-3 w-3" /> View
          </Link>
          <Link
            href={`/projects/${project._id}/edit`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Pencil className="h-3 w-3" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(project._id)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
