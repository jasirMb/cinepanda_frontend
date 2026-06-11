"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandCoins,
  Pencil,
  PiggyBank,
  Plus,
  Scale,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ledgerKeys, useLedger, useLedgerSummary } from "@/hooks/useLedger";
import {
  deleteLedgerEntry,
  approveLedgerEntry,
  rejectLedgerEntry,
  type LedgerEntryPopulated,
  type LedgerListQuery,
  type EntryType,
  type PaymentStatus,
  type ApprovalStatus,
  type AccountingType,
} from "@/lib/api/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ────────────────────────────────────────────
   Helpers / tokens
   ──────────────────────────────────────────── */

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatINRCompact(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const APPROVAL_BADGE: Record<ApprovalStatus, string> = {
  NOT_REQUIRED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PENDING_APPROVAL:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  PARTIAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

const EXPENSE_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

const INCOME_PALETTE = [
  "#10b981",
  "#14b8a6",
  "#3076A1",
  "#0ea5e9",
  "#6366f1",
  "#84cc16",
  "#64748b",
];

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  color: "#0f172a",
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
};

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function LedgerPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<LedgerListQuery>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [tab, setTab] = useState<"entries" | "summary">("entries");

  const params = useMemo(() => {
    const p: LedgerListQuery = {};
    if (filters.entryType) p.entryType = filters.entryType;
    if (filters.paymentStatus) p.paymentStatus = filters.paymentStatus;
    if (filters.approvalStatus) p.approvalStatus = filters.approvalStatus;
    if (filters.startDate) p.startDate = filters.startDate;
    if (filters.endDate) p.endDate = filters.endDate;
    return p;
  }, [filters]);

  // Server-side pagination: only one page of rows is fetched at a time.
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [params]);

  const listParams = useMemo(
    () => ({ ...params, page, limit: PAGE_SIZE }),
    [params, page]
  );
  const ledgerQuery = useLedger(listParams);
  const entries = ledgerQuery.data?.data ?? [];
  const total = ledgerQuery.data?.total ?? entries.length;
  const totalPages = ledgerQuery.data?.totalPages ?? 1;

  // Pending-approval count for the KPI — independent of the visible page.
  const pendingQuery = useLedger({
    ...params,
    approvalStatus: "PENDING_APPROVAL",
    page: 1,
    limit: 1,
  });
  const pendingCount = pendingQuery.data?.total ?? 0;

  const summaryQuery = useLedgerSummary(params);
  const summary = summaryQuery.data?.data;

  const deleteMutation = useMutation({
    mutationFn: deleteLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success("Entry moved to trash");
    },
    onError: () => toast.error("Failed to delete entry"),
  });

  const approveMutation = useMutation({
    mutationFn: approveLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success("Entry approved");
    },
    onError: () => toast.error("Failed to approve entry"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectLedgerEntry(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Entry rejected");
    },
    onError: () => toast.error("Failed to reject entry"),
  });

  const hasFilters = Boolean(
    filters.entryType ||
      filters.paymentStatus ||
      filters.approvalStatus ||
      filters.startDate ||
      filters.endDate
  );

  const totalIncome = summary?.profitLoss?.totalIncome ?? 0;
  const totalExpense = summary?.profitLoss?.totalExpense ?? 0;
  const netProfitLoss = summary?.profitLoss?.netProfitLoss ?? 0;
  const ownerContribution = summary?.profitLoss?.ownerContribution ?? 0;
  const ownerWithdrawal = summary?.profitLoss?.ownerWithdrawal ?? 0;
  const hasOwnerMoney = ownerContribution > 0 || ownerWithdrawal > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Ledger
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track income, expenses and approvals across projects.
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
          <Link href="/ledger/transfer">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
          </Link>
          <Link href="/ledger/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Total Income"
          value={formatINR(totalIncome)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="success"
          loading={summaryQuery.isLoading}
        />
        <KpiTile
          label="Total Expense"
          value={formatINR(totalExpense)}
          icon={<ArrowDownRight className="h-4 w-4" />}
          tone="danger"
          loading={summaryQuery.isLoading}
        />
        <KpiTile
          label="Net Profit / Loss"
          value={formatINR(netProfitLoss)}
          icon={<Scale className="h-4 w-4" />}
          tone={netProfitLoss >= 0 ? "success" : "danger"}
          loading={summaryQuery.isLoading}
        />
        <KpiTile
          label="Pending Approvals"
          value={String(pendingCount)}
          icon={<Clock className="h-4 w-4" />}
          tone={pendingCount > 0 ? "warning" : "neutral"}
          loading={ledgerQuery.isLoading}
        />
      </div>

      {/* Owner money — quick glance on the Entries tab (the Summary tab shows a fuller card) */}
      {hasOwnerMoney && tab === "entries" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <PiggyBank className="h-4 w-4 text-cine-primary" />
            Owner money
            <span className="text-xs font-normal text-slate-400">
              (not in profit)
            </span>
          </span>
          {ownerContribution > 0 && (
            <span className="text-slate-600 dark:text-slate-300">
              Put in:{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{formatINR(ownerContribution)}
              </span>
            </span>
          )}
          {ownerWithdrawal > 0 && (
            <span className="text-slate-600 dark:text-slate-300">
              Taken out:{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                −{formatINR(ownerWithdrawal)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <TabButton
          label="Entries"
          active={tab === "entries"}
          onClick={() => setTab("entries")}
          count={total}
        />
        <TabButton
          label="Summary"
          active={tab === "summary"}
          onClick={() => setTab("summary")}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        hasFilters={hasFilters}
      />

      {/* Tabs content */}
      {tab === "entries" ? (
        <EntriesTable
          loading={ledgerQuery.isLoading}
          error={ledgerQuery.isError}
          entries={entries}
          totalCount={total}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onApprove={(id) => approveMutation.mutate(id)}
          approving={approveMutation.isPending}
          onReject={(id) => setRejectTarget(id)}
          onDelete={(id) => setDeleteTarget(id)}
        />
      ) : (
        <SummaryPanel
          loading={summaryQuery.isLoading}
          summary={summary}
        />
      )}

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete ledger entry"
        description="Are you sure you want to delete this entry? It will be moved to the Trash and can be restored later."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />

      {/* Reject dialog */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder="Reason for rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget && rejectReason.trim()) {
                  rejectMutation.mutate({
                    id: rejectTarget,
                    reason: rejectReason.trim(),
                  });
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

type Tone = "primary" | "success" | "danger" | "warning" | "neutral";

const TONES: Record<Tone, { bg: string; text: string; ring: string }> = {
  primary: {
    bg: "bg-cine-primary/10 dark:bg-cine-primary/20",
    text: "text-cine-primary",
    ring: "ring-cine-primary/20",
  },
  success: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  danger: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/20",
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  neutral: {
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-300",
    ring: "ring-slate-500/20",
  },
};

function KpiTile({
  label,
  value,
  icon,
  tone = "neutral",
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: Tone;
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

function TabButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-cine-primary/10 text-cine-primary"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      }`}
      onClick={onClick}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-1.5 text-[10px] font-semibold ${
            active
              ? "bg-cine-primary/20 text-cine-primary"
              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

type LedgerPeriod =
  | "all"
  | "week"
  | "month"
  | "6months"
  | "year"
  | "custom";

const PERIOD_OPTIONS: { value: LedgerPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "6months", label: "Last 6 months" },
  { value: "year", label: "Last 1 year" },
  { value: "custom", label: "Custom range" },
];

/** Local YYYY-MM-DD (matches the DatePicker / backend date filter format). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rolling window ending today for a preset; {} means no date filter. */
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

function FilterBar({
  filters,
  setFilters,
  hasFilters,
}: {
  filters: LedgerListQuery;
  setFilters: React.Dispatch<React.SetStateAction<LedgerListQuery>>;
  hasFilters: boolean;
}) {
  const [period, setPeriod] = useState<LedgerPeriod>("all");

  function handlePeriodChange(value: LedgerPeriod) {
    setPeriod(value);
    if (value === "custom") return; // keep current dates; user edits From/To
    const { startDate, endDate } = periodDates(value);
    setFilters((f) => ({ ...f, startDate, endDate }));
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <FilterField label="Type" width="140px">
        <Select
          value={filters.entryType ?? "ALL"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              entryType: v === "ALL" ? undefined : (v as EntryType),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Payment" width="140px">
        <Select
          value={filters.paymentStatus ?? "ALL"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              paymentStatus: v === "ALL" ? undefined : (v as PaymentStatus),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Approval" width="160px">
        <Select
          value={filters.approvalStatus ?? "ALL"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              approvalStatus:
                v === "ALL" ? undefined : (v as ApprovalStatus),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Period" width="160px">
        <Select
          value={period}
          onValueChange={(v) => handlePeriodChange(v as LedgerPeriod)}
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
              value={filters.startDate ?? ""}
              onChange={(v) =>
                setFilters((f) => ({ ...f, startDate: v || undefined }))
              }
              placeholder="Start date"
            />
          </FilterField>

          <FilterField label="To" width="150px">
            <DatePicker
              value={filters.endDate ?? ""}
              onChange={(v) =>
                setFilters((f) => ({ ...f, endDate: v || undefined }))
              }
              placeholder="End date"
            />
          </FilterField>
        </>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilters({});
            setPeriod("all");
          }}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
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

function EntriesTable({
  loading,
  error,
  entries,
  totalCount,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onApprove,
  approving,
  onReject,
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
  onApprove: (id: string) => void;
  approving: boolean;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
        Failed to load ledger. Please try again.
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500">
        <Wallet className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">No ledger entries</p>
        <p className="mt-1 text-xs">
          Try adjusting filters or create a new entry.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1000px] table-fixed text-sm">
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[32%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Entry</th>
              <th className="px-4 py-3 text-left font-medium">Project</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-center font-medium">Payment</th>
              <th className="px-4 py-3 text-center font-medium">Approval</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((entry) => {
              const isIncome = entry.entryType === "INCOME";
              const highlight =
                entry.approvalStatus === "PENDING_APPROVAL"
                  ? "bg-amber-50/50 dark:bg-amber-900/10"
                  : "bg-white dark:bg-transparent";
              return (
                <tr
                  key={entry._id}
                  className={`${highlight} transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                    {formatDate(entry.entryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-50">
                            {entry.category || "Uncategorised"}
                          </p>
                          <AccountingBadge type={entry.accountingType} />
                        </div>
                        {entry.description ? (
                          <p className="mt-0.5 max-w-[360px] truncate text-xs text-slate-500 dark:text-slate-400">
                            {entry.description}
                          </p>
                        ) : null}
                        {(entry.vendorId ||
                          entry.paymentAccountId ||
                          entry.itemType) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {entry.vendorId &&
                              typeof entry.vendorId === "object" && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {entry.vendorId.name}
                                </span>
                              )}
                            {entry.paymentAccountId &&
                              typeof entry.paymentAccountId === "object" && (
                                <span
                                  title={accountDetail(entry.paymentAccountId)}
                                  className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                                >
                                  {entry.paymentAccountId.name}
                                  {accountDetailShort(entry.paymentAccountId) && (
                                    <span className="font-normal opacity-75">
                                      {" "}
                                      · {accountDetailShort(entry.paymentAccountId)}
                                    </span>
                                  )}
                                </span>
                              )}
                            {entry.itemType && (
                              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                {entry.itemType}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {entry.projectId && typeof entry.projectId === "object" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">
                          {entry.projectId.clientName}
                        </span>
                        {entry.projectId.deletedAt && (
                          <span
                            title="This project has been deleted"
                            className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          >
                            deleted
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatINR(entry.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        PAYMENT_BADGE[entry.paymentStatus]
                      }`}
                    >
                      {entry.paymentStatus}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        APPROVAL_BADGE[entry.approvalStatus]
                      }`}
                    >
                      {entry.approvalStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {entry.approvalStatus === "PENDING_APPROVAL" && (
                        <>
                          <IconButton
                            title="Approve"
                            tone="success"
                            disabled={approving}
                            onClick={() => onApprove(entry._id)}
                          >
                            <Check className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            title="Reject"
                            tone="danger"
                            onClick={() => onReject(entry._id)}
                          >
                            <X className="h-4 w-4" />
                          </IconButton>
                        </>
                      )}
                      <Link href={`/ledger/${entry._id}/edit`}>
                        <IconButton title="Edit" tone="neutral">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </Link>
                      <IconButton
                        title="Delete"
                        tone="danger"
                        onClick={() => onDelete(entry._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
            </span>{" "}
            entries
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

const ICON_BUTTON_HOVER: Record<Tone, string> = {
  primary: "hover:bg-cine-primary/10 hover:text-cine-primary",
  success:
    "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
  danger: "hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400",
  warning:
    "hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
  neutral: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
};

function accountDetail(a: {
  type: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifsc?: string;
  upiId?: string;
  upiApp?: string;
  cardNetwork?: string;
  cardLast4?: string;
}): string {
  if (a.type === "BANK")
    return (
      [
        a.bankName,
        a.accountNumber ? `A/C ${a.accountNumber}` : "",
        a.ifsc ? `IFSC ${a.ifsc}` : "",
        a.accountHolderName,
      ]
        .filter(Boolean)
        .join(" · ") || "Bank account"
    );
  if (a.type === "UPI")
    return [a.upiApp, a.upiId].filter(Boolean).join(" · ") || "UPI";
  if (a.type === "CARD")
    return (
      [a.cardNetwork, a.cardLast4 ? `••${a.cardLast4}` : ""]
        .filter(Boolean)
        .join(" · ") || "Card"
    );
  if (a.type === "CASH") return "Cash";
  return "Other";
}

/** Small pill marking entries that are owner capital or account transfers
 *  (i.e. not part of operating profit/loss). */
function AccountingBadge({ type }: { type?: AccountingType }) {
  if (!type || type === "OPERATING") return null;
  const label = type === "CAPITAL" ? "Owner" : "Transfer";
  return (
    <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
      {label}
    </span>
  );
}

function accountDetailShort(a: {
  type: string;
  bankName?: string;
  upiId?: string;
  upiApp?: string;
  cardNetwork?: string;
}): string {
  if (a.type === "BANK") return a.bankName ?? "";
  if (a.type === "UPI") return a.upiApp || a.upiId || "";
  if (a.type === "CARD") return a.cardNetwork ?? "";
  return "";
}

function IconButton({
  children,
  onClick,
  title,
  disabled,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  tone?: Tone;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 ${ICON_BUTTON_HOVER[tone]}`}
    >
      {children}
    </button>
  );
}

function SummaryPanel({
  loading,
  summary,
}: {
  loading: boolean;
  summary:
    | {
        byCategory: { _id: { entryType: EntryType; category: string }; total: number; count: number }[];
        byProject: {
          _id: { projectId: string; entryType: EntryType };
          total: number;
          count: number;
          project: { _id: string; clientName: string; serviceType: string };
        }[];
        profitLoss: {
          totalIncome: number;
          totalExpense: number;
          netProfitLoss: number;
          ownerContribution?: number;
          ownerWithdrawal?: number;
        };
      }
    | undefined;
}) {
  const ownerContribution = summary?.profitLoss?.ownerContribution ?? 0;
  const ownerWithdrawal = summary?.profitLoss?.ownerWithdrawal ?? 0;
  const ownerNet = ownerContribution - ownerWithdrawal;
  const hasOwnerMoney = ownerContribution > 0 || ownerWithdrawal > 0;

  const expenseCategories = useMemo(() => {
    return (summary?.byCategory ?? [])
      .filter((c) => c._id.entryType === "EXPENSE")
      .map((c) => ({
        name: c._id.category || "Uncategorised",
        value: c.total,
        count: c.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [summary?.byCategory]);

  const incomeCategories = useMemo(() => {
    return (summary?.byCategory ?? [])
      .filter((c) => c._id.entryType === "INCOME")
      .map((c) => ({
        name: c._id.category || "Uncategorised",
        value: c.total,
        count: c.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [summary?.byCategory]);

  const byProject = useMemo(() => {
    const map = new Map<
      string,
      { name: string; income: number; expense: number }
    >();
    for (const p of summary?.byProject ?? []) {
      const name = p.project?.clientName ?? "—";
      const row = map.get(name) ?? { name, income: 0, expense: 0 };
      if (p._id.entryType === "INCOME") row.income += p.total;
      else if (p._id.entryType === "EXPENSE") row.expense += p.total;
      map.set(name, row);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, net: r.income - r.expense }))
      .sort((a, b) => b.income + b.expense - (a.income + a.expense))
      .slice(0, 8);
  }, [summary?.byProject]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl lg:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasOwnerMoney && (
        <OwnerMoneyCard
          contribution={ownerContribution}
          withdrawal={ownerWithdrawal}
          net={ownerNet}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryChartCard
          title="Expense by Category"
          subtitle="Where money is going"
          categories={expenseCategories}
          palette={EXPENSE_PALETTE}
        />
        <CategoryChartCard
          title="Income by Category"
          subtitle="Where money is coming from"
          categories={incomeCategories}
          palette={INCOME_PALETTE}
        />
      </div>

      <ProjectActivityList projects={byProject} />
    </div>
  );
}

/** Owner's own money in/out — shown separately because it never affects profit. */
function OwnerMoneyCard({
  contribution,
  withdrawal,
  net,
}: {
  contribution: number;
  withdrawal: number;
  net: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <PiggyBank className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Owner Money
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your own money in &amp; out — never counted in profit or loss
            </p>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
        <OwnerStat
          label="Put in"
          value={`+${formatINR(contribution)}`}
          icon={<PiggyBank className="h-4 w-4" />}
          tone="success"
        />
        <OwnerStat
          label="Taken out"
          value={`−${formatINR(withdrawal)}`}
          icon={<HandCoins className="h-4 w-4" />}
          tone="danger"
        />
        <OwnerStat
          label="Net in business"
          value={`${net >= 0 ? "+" : "−"}${formatINR(Math.abs(net))}`}
          icon={<Scale className="h-4 w-4" />}
          tone={net >= 0 ? "success" : "danger"}
        />
      </div>
    </section>
  );
}

function OwnerStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded ${t.bg} ${t.text}`}
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

function ProjectActivityList({
  projects,
}: {
  projects: { name: string; income: number; expense: number; net: number }[];
}) {
  const globalMax = Math.max(
    1,
    ...projects.flatMap((p) => [p.income, p.expense])
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Income vs Expense by Project
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Top {projects.length} project{projects.length !== 1 ? "s" : ""} by
            activity
          </p>
        </div>
        <div className="hidden items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 sm:flex">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-red-500" /> Expense
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Income
          </span>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="p-5">
          <EmptyBlock label="No project activity in the current filter" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <ul className="min-w-[640px] divide-y divide-slate-100 dark:divide-slate-800">
          {projects.map((p, i) => {
            const incomePct = Math.round((p.income / globalMax) * 100);
            const expensePct = Math.round((p.expense / globalMax) * 100);
            const isPositive = p.net >= 0;
            return (
              <li
                key={p.name}
                className="grid grid-cols-[140px_1fr_1fr_104px] items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {i + 1}
                  </span>
                  <span
                    className="truncate text-sm font-medium text-slate-900 dark:text-slate-50"
                    title={p.name}
                  >
                    {p.name}
                  </span>
                </div>

                {/* Expense bar — grows from center to LEFT */}
                <div className="relative flex h-7 items-center justify-end">
                  <div
                    className="h-5 rounded-l-md bg-red-500 transition-all"
                    style={{
                      width: `${
                        p.expense > 0 ? Math.max(2, expensePct) : 0
                      }%`,
                    }}
                  />
                  {p.expense > 0 && (
                    <span
                      className={`absolute right-1.5 text-[10px] font-bold text-white ${
                        expensePct < 25 ? "right-auto" : ""
                      }`}
                      style={
                        expensePct < 25
                          ? { right: `calc(${expensePct}% + 4px)` }
                          : undefined
                      }
                    >
                      {expensePct < 25 ? (
                        <span className="text-red-600 dark:text-red-400">
                          {formatINRCompact(p.expense)}
                        </span>
                      ) : (
                        formatINRCompact(p.expense)
                      )}
                    </span>
                  )}
                </div>

                {/* Income bar — grows from center to RIGHT */}
                <div className="relative flex h-7 items-center border-l-2 border-slate-200 pl-px dark:border-slate-700">
                  <div
                    className="h-5 rounded-r-md bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        p.income > 0 ? Math.max(2, incomePct) : 0
                      }%`,
                    }}
                  />
                  {p.income > 0 && (
                    <span
                      className={`absolute text-[10px] font-bold text-white ${
                        incomePct < 25
                          ? "text-emerald-700 dark:text-emerald-400"
                          : ""
                      }`}
                      style={
                        incomePct < 25
                          ? { left: `calc(${incomePct}% + 4px)` }
                          : { left: `${Math.max(8, incomePct - 16)}%` }
                      }
                    >
                      {formatINRCompact(p.income)}
                    </span>
                  )}
                </div>

                {/* Net */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      isPositive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {isPositive ? "+" : "−"}
                    {formatINRCompact(Math.abs(p.net))}
                  </span>
                </div>
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </section>
  );
}

function CategoryChartCard({
  title,
  subtitle,
  categories,
  palette,
}: {
  title: string;
  subtitle: string;
  categories: { name: string; value: number; count: number }[];
  palette: string[];
}) {
  const total = categories.reduce((s, c) => s + c.value, 0);
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </header>
      <div className="p-5">
        {categories.length === 0 ? (
          <EmptyBlock label="No data" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categories}
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatINR(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2">
              {categories.slice(0, 6).map((c, i) => {
                const pct = total ? Math.round((c.value / total) * 100) : 0;
                return (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: palette[i % palette.length] }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {formatINRCompact(c.value)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {pct}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500">
      <Wallet className="mb-2 h-7 w-7 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
