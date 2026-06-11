"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandCoins,
  PiggyBank,
  Scale,
  Trash2,
  Pencil,
  Wallet,
} from "lucide-react";

import { ledgerKeys, useLedger, useLedgerSummary } from "@/hooks/useLedger";
import { useProjectsOverview } from "@/hooks/useDashboard";
import {
  deleteLedgerEntry,
  type LedgerEntryPopulated,
} from "@/lib/api/ledger";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";

const PAGE_SIZE = 10;

type OwnerView = "all" | "in" | "out";

type LedgerPeriod = "all" | "week" | "month" | "6months" | "year" | "custom";

const PERIOD_OPTIONS: { value: LedgerPeriod; label: string }[] = [
  { value: "all", label: "All" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "6months", label: "6 months" },
  { value: "year", label: "1 year" },
  { value: "custom", label: "Custom" },
];

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

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rolling window ending today for a preset; {} means no date filter (all time). */
function periodDates(period: LedgerPeriod): {
  startDate?: string;
  endDate?: string;
} {
  if (period === "all" || period === "custom") return {};
  const now = new Date();
  const start = new Date(now);
  if (period === "week") start.setDate(now.getDate() - 7);
  else if (period === "month") start.setDate(now.getDate() - 30);
  else if (period === "6months") start.setMonth(now.getMonth() - 6);
  else start.setFullYear(now.getFullYear() - 1); // year
  return { startDate: toISODate(start), endDate: toISODate(now) };
}

export default function OwnerMoneyPage() {
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [view, setView] = useState<OwnerView>("all");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<LedgerPeriod>("all");
  const [dates, setDates] = useState<{ startDate?: string; endDate?: string }>(
    {}
  );

  // Date filter is applied server-side, so totals and list reflect it.
  const ownerQuery = useLedger({ accountingType: "CAPITAL", ...dates });
  const entries = useMemo(() => ownerQuery.data?.data ?? [], [ownerQuery.data]);

  // Company profit/loss for the same period (already excludes owner money & transfers).
  const summaryQuery = useLedgerSummary(dates);
  const profitLoss = summaryQuery.data?.data?.profitLoss;
  const totalIncome = profitLoss?.totalIncome ?? 0;
  const totalExpense = profitLoss?.totalExpense ?? 0;
  const netProfitLoss = profitLoss?.netProfitLoss ?? 0;

  // Client collections — a current snapshot (project value vs paid), all-time.
  const overviewQuery = useProjectsOverview();
  const overview = overviewQuery.data?.data;
  const projectValue = overview?.totalProjectValue ?? 0;
  const received = overview?.totalIncome ?? 0;
  const pending = overview?.totalPending ?? 0;

  function handlePeriodChange(value: LedgerPeriod) {
    setPeriod(value);
    if (value === "custom") return; // keep current dates; user edits From/To
    setDates(periodDates(value));
  }

  // Owner totals + counts always reflect every owner entry (not the view filter).
  const { contribution, withdrawal, net, contributionCount, withdrawalCount } =
    useMemo(() => {
      let contribution = 0;
      let withdrawal = 0;
      let contributionCount = 0;
      let withdrawalCount = 0;
      for (const e of entries) {
        if (e.entryType === "INCOME") {
          contribution += e.amount;
          contributionCount += 1;
        } else if (e.entryType === "EXPENSE") {
          withdrawal += e.amount;
          withdrawalCount += 1;
        }
      }
      return {
        contribution,
        withdrawal,
        net: contribution - withdrawal,
        contributionCount,
        withdrawalCount,
      };
    }, [entries]);

  const filtered = useMemo(() => {
    if (view === "in") return entries.filter((e) => e.entryType === "INCOME");
    if (view === "out") return entries.filter((e) => e.entryType === "EXPENSE");
    return entries;
  }, [entries, view]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [view, dates.startDate, dates.endDate]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const deleteMutation = useMutation({
    mutationFn: deleteLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success("Entry moved to trash");
    },
    onError: () => toast.error("Failed to delete entry"),
  });

  const fmtSigned = (n: number) =>
    `${n >= 0 ? "+" : "−"}${formatINR(Math.abs(n))}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/ledger"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ledger
          </Link>
          <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <PiggyBank className="h-5 w-5" />
            </span>
            Owner Money
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your own money in &amp; out — never counted in profit or loss.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ledger/new?entryType=INCOME&category=OWNER_CONTRIBUTION">
            <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <PiggyBank className="h-4 w-4" />
              Add my money
            </Button>
          </Link>
          <Link href="/ledger/new?entryType=EXPENSE&category=OWNER_WITHDRAWAL">
            <Button variant="outline" className="gap-1.5">
              <HandCoins className="h-4 w-4" />
              Take out
            </Button>
          </Link>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          Period
        </span>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handlePeriodChange(o.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === o.value
                  ? "bg-cine-primary text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="w-[140px]">
              <DatePicker
                value={dates.startDate ?? ""}
                onChange={(v) =>
                  setDates((d) => ({ ...d, startDate: v || undefined }))
                }
                placeholder="From"
              />
            </div>
            <span className="text-slate-400">→</span>
            <div className="w-[140px]">
              <DatePicker
                value={dates.endDate ?? ""}
                onChange={(v) =>
                  setDates((d) => ({ ...d, endDate: v || undefined }))
                }
                placeholder="To"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Owner money bento (hero) ── */}
      <section>
        <SectionLabel>Owner money · not in profit</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          <StatCard
            className="sm:col-span-2 lg:row-span-2"
            featured
            tone="primary"
            icon={<Scale className="h-5 w-5" />}
            label="Net in business"
            value={fmtSigned(net)}
            loading={ownerQuery.isLoading}
            footer={
              <div className="flex flex-wrap gap-2">
                <Chip tone="success">▲ Put in {formatINR(contribution)}</Chip>
                <Chip tone="danger">▼ Taken out {formatINR(withdrawal)}</Chip>
              </div>
            }
          />
          <StatCard
            tone="success"
            icon={<PiggyBank className="h-5 w-5" />}
            label="Put in"
            value={`+${formatINR(contribution)}`}
            loading={ownerQuery.isLoading}
          />
          <StatCard
            tone="danger"
            icon={<HandCoins className="h-5 w-5" />}
            label="Taken out"
            value={`−${formatINR(withdrawal)}`}
            loading={ownerQuery.isLoading}
          />
        </div>
      </section>

      {/* ── Business profit & loss bento ── */}
      <section>
        <SectionLabel>Business · profit &amp; loss</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            tone="success"
            icon={<ArrowUpRight className="h-5 w-5" />}
            label="Total income"
            value={formatINR(totalIncome)}
            loading={summaryQuery.isLoading}
          />
          <StatCard
            tone="danger"
            icon={<ArrowDownRight className="h-5 w-5" />}
            label="Total expense"
            value={formatINR(totalExpense)}
            loading={summaryQuery.isLoading}
          />
          <StatCard
            className="sm:col-span-2"
            featured
            tone={netProfitLoss >= 0 ? "success" : "danger"}
            icon={<Scale className="h-5 w-5" />}
            label="Net profit / loss"
            value={formatINR(netProfitLoss)}
            loading={summaryQuery.isLoading}
          />
        </div>
      </section>

      {/* ── Client collections bento ── */}
      <section>
        <SectionLabel>
          Client collections{" "}
          <span className="font-normal normal-case text-slate-400">
            · overall, all projects to date
          </span>
        </SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            tone="neutral"
            icon={<Briefcase className="h-5 w-5" />}
            label="Project value"
            value={formatINR(projectValue)}
            loading={overviewQuery.isLoading}
          />
          <StatCard
            tone="success"
            icon={<Wallet className="h-5 w-5" />}
            label="Taken (received)"
            value={formatINR(received)}
            loading={overviewQuery.isLoading}
          />
          <StatCard
            className="sm:col-span-2"
            featured
            tone="warning"
            icon={<Clock className="h-5 w-5" />}
            label="Left (pending)"
            value={formatINR(pending)}
            loading={overviewQuery.isLoading}
            footer={<Chip tone="warning">Clients still owe you</Chip>}
          />
        </div>
      </section>

      {/* ── Entries list ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Owner money entries
          </h3>
          <div className="flex w-full gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:w-auto">
            <ViewTab
              label="All"
              count={entries.length}
              active={view === "all"}
              tone="primary"
              onClick={() => setView("all")}
            />
            <ViewTab
              label="Put in"
              count={contributionCount}
              active={view === "in"}
              tone="success"
              onClick={() => setView("in")}
            />
            <ViewTab
              label="Taken out"
              count={withdrawalCount}
              active={view === "out"}
              tone="danger"
              onClick={() => setView("out")}
            />
          </div>
        </div>

        <OwnerEntriesList
          loading={ownerQuery.isLoading}
          error={ownerQuery.isError}
          entries={paged}
          totalCount={filtered.length}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onDelete={(id) => setDeleteTarget(id)}
        />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete owner money entry"
        description="This entry will be moved to the Trash and can be restored later."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────
   Bento tiles
   ──────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 px-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </h3>
  );
}

type Tone = "success" | "danger" | "warning" | "neutral" | "primary";

const ICON: Record<Tone, { chip: string; tint: string }> = {
  success: {
    chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    tint: "bg-emerald-50/70 dark:bg-emerald-950/20",
  },
  danger: {
    chip: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    tint: "bg-rose-50/70 dark:bg-rose-950/20",
  },
  warning: {
    chip: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    tint: "bg-amber-50/70 dark:bg-amber-950/20",
  },
  neutral: {
    chip: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    tint: "bg-slate-50 dark:bg-slate-800/40",
  },
  primary: {
    chip: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    tint: "bg-indigo-50/70 dark:bg-indigo-950/20",
  },
};

function StatCard({
  label,
  value,
  tone,
  icon,
  featured,
  footer,
  className,
  loading,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ReactNode;
  featured?: boolean;
  footer?: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  const t = ICON[tone];
  return (
    <div
      className={`flex min-h-[96px] flex-col rounded-2xl border border-slate-200/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 ${
        featured ? t.tint : "bg-white dark:bg-slate-900/60"
      } ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.chip}`}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p
          className={`mt-2 truncate font-bold tracking-tight text-slate-900 dark:text-slate-50 ${
            featured ? "text-3xl" : "text-2xl"
          }`}
        >
          {value}
        </p>
      )}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </div>
  );
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "danger" | "warning" | "neutral";
}) {
  const map: Record<string, string> = {
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function ViewTab({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone: "primary" | "success" | "danger";
  onClick: () => void;
}) {
  const activeText = {
    primary: "text-cine-primary",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
  }[tone];
  const activeBadge = {
    primary: "bg-cine-primary/10 text-cine-primary",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none ${
        active
          ? `bg-white shadow-sm dark:bg-slate-900 ${activeText}`
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-bold ${
          active
            ? activeBadge
            : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ────────────────────────────────────────────
   Entries list
   ──────────────────────────────────────────── */

function OwnerEntriesList({
  loading,
  error,
  entries,
  totalCount,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onDelete,
}: {
  loading: boolean;
  error: boolean;
  entries: LedgerEntryPopulated[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
        Failed to load owner money entries.
      </p>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
        <Wallet className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">No owner money here yet</p>
        <p className="mt-1 text-xs">
          Use “Add my money” or “Take out” to record your own funds.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => {
          const isContribution = entry.entryType === "INCOME";
          return (
            <li
              key={entry._id}
              className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isContribution
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                }`}
              >
                {isContribution ? (
                  <PiggyBank className="h-4 w-4" />
                ) : (
                  <HandCoins className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {isContribution ? "Put in" : "Taken out"}
                  </p>
                  {entry.projectId && typeof entry.projectId === "object" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Briefcase className="h-3 w-3" />
                      {entry.projectId.clientName}
                    </span>
                  )}
                  {entry.paymentAccountId &&
                    typeof entry.paymentAccountId === "object" && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                        {entry.paymentAccountId.name}
                      </span>
                    )}
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(entry.entryDate)}
                  {entry.description && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">
                        •
                      </span>
                      <span className="truncate">{entry.description}</span>
                    </>
                  )}
                </p>
              </div>
              <span
                className={`shrink-0 text-base font-bold tabular-nums ${
                  isContribution
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isContribution ? "+" : "−"}
                {formatINR(entry.amount)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Link href={`/ledger/${entry._id}/edit`}>
                  <button
                    type="button"
                    title="Edit"
                    aria-label="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  type="button"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => onDelete(entry._id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {totalCount > pageSize && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800 sm:flex-row">
          <p className="text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {totalCount}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="px-1 text-slate-600 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
