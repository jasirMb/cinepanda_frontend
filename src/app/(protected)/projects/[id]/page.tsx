"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileText,
  IndianRupee,
  MapPin,
  Pencil,
  Phone,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";

import { projectsKeys, useProject } from "@/hooks/useProjects";
import { useLedger } from "@/hooks/useLedger";
import {
  updateProject,
  deleteProject,
  VALID_STATUS_TRANSITIONS,
  type ProjectStatus,
} from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { LedgerEntryPopulated } from "@/lib/api/ledger";

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

const STATUS_ACTION_LABELS: Partial<Record<ProjectStatus, string>> = {
  ONGOING: "Start Project",
  ON_HOLD: "Put On Hold",
  COMPLETED: "Mark Complete",
  CANCELLED: "Cancel",
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

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectQuery = useProject(id);
  const project = projectQuery.data;

  const ledgerQuery = useLedger({ projectId: id });
  const ledgerEntries = ledgerQuery.data?.data ?? [];

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: ProjectStatus) => updateProject(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project status updated");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response?.data
              ?.error
          : "Failed to update status";
      toast.error(msg || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => {
      toast.success("Project deleted");
      router.push("/projects");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const totalIncome = ledgerEntries
    .filter((e) => e.entryType === "INCOME")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = ledgerEntries
    .filter((e) => e.entryType === "EXPENSE")
    .reduce((s, e) => s + e.amount, 0);
  const pendingAmount = project ? project.projectValue - totalIncome : 0;
  const collectedPct =
    project && project.projectValue > 0
      ? Math.min(100, (totalIncome / project.projectValue) * 100)
      : 0;
  const netProfit = totalIncome - totalExpense;
  const hasActivity = totalIncome > 0 || totalExpense > 0;
  const isProfit = netProfit >= 0;
  const marginPct =
    totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  if (projectQuery.isLoading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">Failed to load project. Please try again.</p>
        <Button variant="outline" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" /> Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[project.status];

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${avatarColor(project.clientName)}`}
          >
            {getInitials(project.clientName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-50">
                {project.clientName}
              </h2>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[project.status]}`}
              >
                {project.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {project.serviceType}
              {project.description ? ` — ${project.description}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/projects/${id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Status transitions */}
      {validTransitions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Move to:
          </span>
          {validTransitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant={nextStatus === "CANCELLED" ? "destructive" : "default"}
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(nextStatus)}
            >
              {STATUS_ACTION_LABELS[nextStatus] ?? nextStatus}
            </Button>
          ))}
        </div>
      )}

      {/* Financial banner with progress */}
      <div
        className={`relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 shadow-sm dark:border-slate-800 dark:from-emerald-950/30 dark:to-slate-900/60`}
      >
        <div
          aria-hidden
          className={`absolute left-0 top-0 h-full w-1 ${STATUS_STRIPE[project.status]}`}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 pl-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Project Value
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {formatINR(project.projectValue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {formatINR(totalIncome)} received
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {Math.round(collectedPct)}% collected ·{" "}
              {pendingAmount > 0
                ? `${formatINR(pendingAmount)} pending`
                : "Fully collected"}
            </p>
          </div>
        </div>
        <div className="ml-3 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${collectedPct}%` }}
          />
        </div>
      </div>

      {/* Profit / Loss banner */}
      <div
        className={`relative overflow-hidden rounded-lg border px-5 py-4 shadow-sm ${
          !hasActivity
            ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
            : isProfit
              ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900/60"
              : "border-red-200 bg-gradient-to-r from-red-50 to-white dark:border-red-900/60 dark:from-red-950/30 dark:to-slate-900/60"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                !hasActivity
                  ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  : isProfit
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-500/15 text-red-700 dark:text-red-300"
              }`}
            >
              {hasActivity && isProfit ? (
                <TrendingUp className="h-5 w-5" />
              ) : hasActivity ? (
                <TrendingDown className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {hasActivity
                  ? isProfit
                    ? "In Profit"
                    : "In Loss"
                  : "No Activity Yet"}
              </p>
              <p
                className={`text-2xl font-bold ${
                  !hasActivity
                    ? "text-slate-700 dark:text-slate-200"
                    : isProfit
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {hasActivity
                  ? `${isProfit ? "+" : "−"}${formatINR(Math.abs(netProfit))}`
                  : "—"}
              </p>
            </div>
          </div>
          {hasActivity && (
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <p>
                Income {formatINR(totalIncome)}{" "}
                <span className="text-slate-300 dark:text-slate-600">·</span>{" "}
                Expense {formatINR(totalExpense)}
              </p>
              <p
                className={`text-sm font-semibold ${
                  isProfit
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                Margin {isProfit ? "+" : ""}
                {marginPct}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Project Value"
          value={formatINR(project.projectValue)}
          tone="slate"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Received"
          value={formatINR(totalIncome)}
          tone="emerald"
        />
        <StatCard
          icon={TrendingDown}
          label="Total Expenses"
          value={formatINR(totalExpense)}
          tone="red"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={formatINR(pendingAmount > 0 ? pendingAmount : 0)}
          tone="amber"
        />
      </div>

      {/* Project + Customer details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailsCard title="Project Details" icon={CalendarDays}>
          <DetailRow
            icon={CalendarDays}
            label="Start Date"
            value={formatDate(project.startDate)}
          />
          <DetailRow
            icon={CalendarDays}
            label="Expected Completion"
            value={formatDate(project.expectedCompletionDate)}
          />
          {project.actualCompletionDate && (
            <DetailRow
              icon={CalendarDays}
              label="Actual Completion"
              value={formatDate(project.actualCompletionDate)}
            />
          )}
          {project.notes && (
            <DetailRow icon={FileText} label="Notes" value={project.notes} />
          )}
        </DetailsCard>

        {project.customerId && typeof project.customerId === "object" && (
          <DetailsCard title="Customer" icon={User}>
            <DetailRow
              icon={User}
              label="Name"
              value={project.customerId.name}
            />
            <DetailRow
              icon={Phone}
              label="Phone"
              value={project.customerId.phone}
              link={`tel:${project.customerId.phone}`}
            />
            <DetailRow
              icon={MapPin}
              label="Place"
              value={project.customerId.place}
            />
          </DetailsCard>
        )}
      </div>

      {/* Linked records */}
      <div className="grid gap-4 lg:grid-cols-2">
        {project.quotationId && typeof project.quotationId === "object" && (
          <LinkedRecordCard
            icon={FileText}
            title="Linked Quotation"
            badge={project.quotationId.status}
            line={`Date: ${formatDate(project.quotationId.quotationDate)}`}
            href={`/quotations/${project.quotationId._id}`}
            actionLabel="View Quotation"
          />
        )}
        {project.leadId && typeof project.leadId === "object" && (
          <LinkedRecordCard
            icon={UserPlus}
            title="Linked Lead"
            line={`${project.leadId.customerName} · ${project.leadId.contactNumber}`}
            sub={project.leadId.requirement}
          />
        )}
      </div>

      {/* Ledger entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Ledger Entries
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {ledgerEntries.length}
            </span>
          </div>
          <Button size="sm" asChild>
            <Link
              href={`/ledger/new?projectId=${id}&customerId=${
                typeof project.customerId === "object"
                  ? project.customerId?._id
                  : ""
              }`}
            >
              <Plus className="h-4 w-4" /> Add Entry
            </Link>
          </Button>
        </div>

        {ledgerEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            No ledger entries linked to this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry: LedgerEntryPopulated) => (
                  <tr
                    key={entry._id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          entry.entryType === "INCOME"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                        }`}
                      >
                        {entry.entryType === "INCOME" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {entry.category.replace(/_/g, " ")}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-slate-700 dark:text-slate-300">
                      {entry.description}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        entry.entryType === "INCOME"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {entry.entryType === "INCOME" ? "+" : "−"}
                      {formatINR(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          entry.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : entry.paymentStatus === "PENDING"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {entry.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

/* ── Sub-components ── */

type StatTone = "slate" | "emerald" | "red" | "amber";

const STAT_TONES: Record<StatTone, string> = {
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  red: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: StatTone;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STAT_TONES[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <Icon className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h3>
      </div>
      <div className="space-y-2.5 p-5">{children}</div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {link ? (
          <a
            href={link}
            className="block truncate text-slate-900 hover:text-cine-primary dark:text-slate-100"
          >
            {value}
          </a>
        ) : (
          <p className="truncate text-slate-900 dark:text-slate-100">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function LinkedRecordCard({
  icon: Icon,
  title,
  badge,
  line,
  sub,
  href,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  line: string;
  sub?: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h3>
            {badge && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-700 dark:text-slate-300">
            {line}
          </p>
          {sub && (
            <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {sub}
            </p>
          )}
          {href && actionLabel && (
            <Link
              href={href}
              className="mt-2 inline-flex items-center text-xs font-semibold text-cine-primary hover:underline"
            >
              {actionLabel} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
