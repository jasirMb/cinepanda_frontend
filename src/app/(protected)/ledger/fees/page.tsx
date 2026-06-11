"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Percent,
  Receipt,
  Trash2,
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

const PAGE_SIZE = 10;

type FeeView = "all" | "BANK_CHARGES" | "TAXES";
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
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
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
  else start.setFullYear(now.getFullYear() - 1);
  return { startDate: toISODate(start), endDate: toISODate(now) };
}

export default function FeesPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? undefined;
  const queryClient = useQueryClient();

  const [view, setView] = useState<FeeView>("all");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<LedgerPeriod>("all");
  const [dates, setDates] = useState<{ startDate?: string; endDate?: string }>(
    {}
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const baseParams = { ...dates, ...(projectId ? { projectId } : {}) };
  const bankQ = useLedger({ category: "BANK_CHARGES", ...baseParams });
  const taxQ = useLedger({ category: "TAXES", ...baseParams });

  const bankEntries = useMemo(() => bankQ.data?.data ?? [], [bankQ.data]);
  const taxEntries = useMemo(() => taxQ.data?.data ?? [], [taxQ.data]);

  const entries = useMemo(
    () =>
      [...bankEntries, ...taxEntries].sort(
        (a, b) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      ),
    [bankEntries, taxEntries]
  );

  const loading = bankQ.isLoading || taxQ.isLoading;
  const error = bankQ.isError || taxQ.isError;

  const bankTotal = bankEntries.reduce((s, e) => s + e.amount, 0);
  const taxTotal = taxEntries.reduce((s, e) => s + e.amount, 0);
  const total = bankTotal + taxTotal;

  function handlePeriodChange(value: LedgerPeriod) {
    setPeriod(value);
    if (value === "custom") return;
    setDates(periodDates(value));
  }

  const filtered = useMemo(() => {
    if (view === "all") return entries;
    return entries.filter((e) => e.category === view);
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/ledger"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ledger
        </Link>
        <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <Receipt className="h-5 w-5" />
          </span>
          Fees &amp; Taxes
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Money lost to bank/card charges and taxes
          {projectId ? " on this project" : ""}.
        </p>
      </div>

      {/* Period pills */}
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

      {/* Totals */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FeeStat
          label="Total lost"
          value={`−${formatINR(total)}`}
          icon={<Receipt className="h-5 w-5" />}
          loading={loading}
        />
        <FeeStat
          label="Bank / card charges"
          value={`−${formatINR(bankTotal)}`}
          icon={<CreditCard className="h-5 w-5" />}
          loading={loading}
        />
        <FeeStat
          label="Taxes"
          value={`−${formatINR(taxTotal)}`}
          icon={<Percent className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Fee &amp; tax entries
          </h3>
          <div className="flex w-full gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:w-auto">
            <ViewTab
              label="All"
              count={entries.length}
              active={view === "all"}
              onClick={() => setView("all")}
            />
            <ViewTab
              label="Charges"
              count={bankEntries.length}
              active={view === "BANK_CHARGES"}
              onClick={() => setView("BANK_CHARGES")}
            />
            <ViewTab
              label="Taxes"
              count={taxEntries.length}
              active={view === "TAXES"}
              onClick={() => setView("TAXES")}
            />
          </div>
        </div>

        <FeeList
          loading={loading}
          error={error}
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
        title="Delete fee entry"
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

function FeeStat({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-[92px] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 truncate text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
          {value}
        </p>
      )}
    </div>
  );
}

function ViewTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none ${
        active
          ? "bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-400"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-bold ${
          active
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function FeeList({
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
        Failed to load fee entries.
      </p>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
        <Receipt className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">No fees or taxes here</p>
        <p className="mt-1 text-xs">
          Record an entry with an extra charge %, or a Bank Charges / Taxes
          expense.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => {
          const isTax = entry.category === "TAXES";
          return (
            <li
              key={entry._id}
              className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                {isTax ? (
                  <Percent className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {isTax ? "Tax" : "Bank / card charge"}
                  </p>
                  {entry.projectId && typeof entry.projectId === "object" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Briefcase className="h-3 w-3" />
                      {entry.projectId.clientName}
                    </span>
                  )}
                  {entry.paymentAccountId &&
                    typeof entry.paymentAccountId === "object" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                        <Wallet className="h-3 w-3" />
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
              <span className="shrink-0 text-base font-bold tabular-nums text-red-600 dark:text-red-400">
                −{formatINR(entry.amount)}
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
