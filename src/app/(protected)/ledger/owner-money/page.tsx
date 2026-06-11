"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  PiggyBank,
  Scale,
  Trash2,
  Pencil,
  Wallet,
} from "lucide-react";

import { ledgerKeys, useLedger } from "@/hooks/useLedger";
import {
  deleteLedgerEntry,
  type LedgerEntryPopulated,
} from "@/lib/api/ledger";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 10;

type OwnerView = "all" | "in" | "out";

type LedgerPeriod = "all" | "week" | "month" | "6months" | "year" | "custom";

const PERIOD_OPTIONS: { value: LedgerPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "6months", label: "Last 6 months" },
  { value: "year", label: "Last 1 year" },
  { value: "custom", label: "Custom range" },
];

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

export default function OwnerMoneyPage() {
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [view, setView] = useState<OwnerView>("all");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<LedgerPeriod>("all");
  const [dates, setDates] = useState<{ startDate?: string; endDate?: string }>(
    {}
  );

  // Date filter is applied server-side, so both totals and list reflect it.
  const ownerQuery = useLedger({ accountingType: "CAPITAL", ...dates });
  const entries = useMemo(() => ownerQuery.data?.data ?? [], [ownerQuery.data]);

  function handlePeriodChange(value: LedgerPeriod) {
    setPeriod(value);
    if (value === "custom") return; // keep current dates; user edits From/To
    setDates(periodDates(value));
  }

  // Overall totals + counts always reflect every owner entry (not the filter).
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

  // Reset to page 1 when a filter changes; clamp if the page falls off the end.
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/ledger"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ledger
          </Link>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            <PiggyBank className="h-6 w-6 text-indigo-500" />
            Owner Money
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your own money put into and taken out of the business — never counted
            in profit or loss.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ledger/new?entryType=INCOME&category=OWNER_CONTRIBUTION">
            <Button variant="outline" className="gap-1.5">
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

      {/* Totals */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Put in"
          value={`+${formatINR(contribution)}`}
          icon={<PiggyBank className="h-4 w-4" />}
          tone="success"
          loading={ownerQuery.isLoading}
        />
        <StatTile
          label="Taken out"
          value={`−${formatINR(withdrawal)}`}
          icon={<HandCoins className="h-4 w-4" />}
          tone="danger"
          loading={ownerQuery.isLoading}
        />
        <StatTile
          label="Net in business"
          value={`${net >= 0 ? "+" : "−"}${formatINR(Math.abs(net))}`}
          icon={<Scale className="h-4 w-4" />}
          tone={net >= 0 ? "success" : "danger"}
          loading={ownerQuery.isLoading}
        />
      </div>

      {/* Date period filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <FilterField label="Period" width="170px">
          <Select
            value={period}
            onValueChange={(v) => v && handlePeriodChange(v as LedgerPeriod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {period === "custom" && (
          <>
            <FilterField label="From" width="150px">
              <DatePicker
                value={dates.startDate ?? ""}
                onChange={(v) =>
                  setDates((d) => ({ ...d, startDate: v || undefined }))
                }
                placeholder="Start date"
              />
            </FilterField>
            <FilterField label="To" width="150px">
              <DatePicker
                value={dates.endDate ?? ""}
                onChange={(v) =>
                  setDates((d) => ({ ...d, endDate: v || undefined }))
                }
                placeholder="End date"
              />
            </FilterField>
          </>
        )}
      </div>

      {/* Filter: All / Put in / Taken out */}
      <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <ViewTab
          label="All"
          count={entries.length}
          active={view === "all"}
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

      {/* List */}
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

type Tone = "success" | "danger" | "neutral";

const TONES: Record<Tone, { bg: string; text: string }> = {
  success: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  danger: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
  },
  neutral: {
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-300",
  },
};

function ViewTab({
  label,
  count,
  active,
  tone = "neutral",
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: Tone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-cine-primary/10 text-cine-primary"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-semibold ${
          active
            ? "bg-cine-primary/20 text-cine-primary"
            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function FilterField({
  label,
  width,
  children,
}: {
  label: string;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minWidth: width }}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: Tone;
  loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md ${t.bg} ${t.text}`}
        >
          {icon}
        </span>
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : (
        <p className="mt-2 truncate text-xl font-semibold text-slate-900 dark:text-slate-50">
          {value}
        </p>
      )}
    </div>
  );
}

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
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
        Failed to load owner money entries.
      </p>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500">
        <Wallet className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">No owner money here yet</p>
        <p className="mt-1 text-xs">
          Use “Add my money” or “Take out” to record your own funds.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
        Owner money ({totalCount})
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => {
          const isContribution = entry.entryType === "INCOME";
          return (
            <li
              key={entry._id}
              className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isContribution
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
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
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Briefcase className="h-3 w-3" />
                      {entry.projectId.clientName}
                    </span>
                  )}
                  {entry.paymentAccountId &&
                    typeof entry.paymentAccountId === "object" && (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
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
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  isContribution
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
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
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  type="button"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => onDelete(entry._id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
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
    </div>
  );
}
