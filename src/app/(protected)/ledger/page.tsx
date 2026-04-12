"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ledgerKeys, useLedger, useLedgerSummary } from "@/hooks/useLedger";
import {
  deleteLedgerEntry,
  approveLedgerEntry,
  rejectLedgerEntry,
  generateRecurringEntries,
  type LedgerEntryPopulated,
  type LedgerListQuery,
  type EntryType,
  type PaymentStatus,
  type ApprovalStatus,
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
   Helpers
   ──────────────────────────────────────────── */

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

const APPROVAL_BADGE: Record<ApprovalStatus, string> = {
  NOT_REQUIRED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  PENDING_APPROVAL:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  PARTIAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
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

  const ledgerQuery = useLedger(params);
  const entries = ledgerQuery.data?.data ?? [];

  const summaryQuery = useLedgerSummary(params);
  const summary = summaryQuery.data?.data;

  const deleteMutation = useMutation({
    mutationFn: deleteLedgerEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success("Entry deleted");
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

  const recurringMutation = useMutation({
    mutationFn: generateRecurringEntries,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success(`Generated ${res.count} recurring entries`);
    },
    onError: () => toast.error("Failed to generate recurring entries"),
  });

  /* ── Loading ── */
  if (ledgerQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (ledgerQuery.isError) {
    return (
      <p className="text-red-400">Failed to load ledger. Please try again.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Ledger
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            View and manage CinePanda income and expenses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={recurringMutation.isPending}
            onClick={() => recurringMutation.mutate()}
          >
            {recurringMutation.isPending ? "Generating..." : "Generate Due Recurring"}
          </Button>
          <Link href="/ledger/new">
            <Button>New Entry</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "entries"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          }`}
          onClick={() => setTab("entries")}
        >
          Entries
        </button>
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "summary"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          }`}
          onClick={() => setTab("summary")}
        >
          Summary
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Type
          </label>
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
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Payment
          </label>
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
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Approval
          </label>
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
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            From
          </label>
          <DatePicker
            value={filters.startDate ?? ""}
            onChange={(v) =>
              setFilters((f) => ({ ...f, startDate: v || undefined }))
            }
            placeholder="Start date"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            To
          </label>
          <DatePicker
            value={filters.endDate ?? ""}
            onChange={(v) =>
              setFilters((f) => ({ ...f, endDate: v || undefined }))
            }
            placeholder="End date"
          />
        </div>
        {(filters.entryType ||
          filters.paymentStatus ||
          filters.approvalStatus ||
          filters.startDate ||
          filters.endDate) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Clear
          </Button>
        )}
      </div>

      {/* Entries tab */}
      {tab === "entries" && (
        <>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No ledger entries found.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                      Approval
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                      Project
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: LedgerEntryPopulated) => (
                    <tr
                      key={entry._id}
                      className={`border-b border-slate-100 last:border-0 dark:border-slate-800/50 ${
                        entry.approvalStatus === "PENDING_APPROVAL"
                          ? "bg-amber-50/50 dark:bg-amber-900/10"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            entry.entryType === "INCOME"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {entry.entryType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {entry.category}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-700 dark:text-slate-300">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-50">
                        {formatINR(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_BADGE[entry.paymentStatus]}`}
                        >
                          {entry.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_BADGE[entry.approvalStatus]}`}
                        >
                          {entry.approvalStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {entry.projectId &&
                        typeof entry.projectId === "object"
                          ? entry.projectId.clientName
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.approvalStatus === "PENDING_APPROVAL" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                disabled={approveMutation.isPending}
                                onClick={() =>
                                  approveMutation.mutate(entry._id)
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 dark:text-red-400"
                                onClick={() => setRejectTarget(entry._id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Link href={`/ledger/${entry._id}/edit`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                            onClick={() => setDeleteTarget(entry._id)}
                          >
                            Del
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Summary tab */}
      {tab === "summary" && (
        <div className="space-y-6">
          {/* P&L card */}
          {summary?.profitLoss && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Total Income"
                value={formatINR(summary.profitLoss.totalIncome)}
                accent="text-emerald-600 dark:text-emerald-400"
              />
              <SummaryCard
                label="Total Expense"
                value={formatINR(summary.profitLoss.totalExpense)}
                accent="text-red-600 dark:text-red-400"
              />
              <SummaryCard
                label="Net Profit / Loss"
                value={formatINR(summary.profitLoss.netProfitLoss)}
                accent={
                  summary.profitLoss.netProfitLoss >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }
              />
            </div>
          )}

          {/* By category */}
          {summary?.byCategory && summary.byCategory.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                By Category
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                        Category
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                        Total
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byCategory.map((cat, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs font-semibold ${
                              cat._id.entryType === "INCOME"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {cat._id.entryType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {cat._id.category}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                          {formatINR(cat.total)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                          {cat.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By project */}
          {summary?.byProject && summary.byProject.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                By Project
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                        Project
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                        Type
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                        Total
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byProject.map((proj, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                      >
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {proj.project?.clientName ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs font-semibold ${
                              proj._id.entryType === "INCOME"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {proj._id.entryType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                          {formatINR(proj.total)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                          {proj.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete ledger entry"
        description="Are you sure you want to delete this entry? This action cannot be undone."
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

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          accent ?? "text-slate-900 dark:text-slate-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
