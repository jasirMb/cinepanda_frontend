"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
} from "lucide-react";

import { usePaymentAccount } from "@/hooks/usePaymentAccounts";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntryPopulated } from "@/lib/api/ledger";
import { downloadStatementPdf, type StatementRow } from "@/lib/statement-pdf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { ProjectFilter } from "@/components/ui/project-filter";

type Period = "all" | "week" | "month" | "year" | "custom";

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function projOf(p: LedgerEntryPopulated["projectId"]) {
  return p && typeof p === "object" ? p : null;
}
function vendorOf(v: LedgerEntryPopulated["vendorId"]) {
  return v && typeof v === "object" ? v : null;
}

function periodRange(period: Period, from: string, to: string) {
  if (period === "all") return { start: null as Date | null, end: null as Date | null };
  if (period === "custom") {
    return {
      start: from ? new Date(from) : null,
      end: to ? new Date(`${to}T23:59:59`) : null,
    };
  }
  const now = new Date();
  let start: Date;
  if (period === "week") {
    start = new Date(now);
    const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end: now };
}

interface StmtRow {
  _id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

function buildRows(
  entries: LedgerEntryPopulated[],
  start: Date | null,
  end: Date | null,
  projectId: string
): StmtRow[] {
  const filtered = entries
    .filter((e) => {
      const ts = new Date(e.entryDate).getTime();
      if (start && ts < start.getTime()) return false;
      if (end && ts > end.getTime()) return false;
      if (projectId) {
        const p = projOf(e.projectId);
        if (projectId === "NONE") {
          if (p) return false;
        } else if (!p || p._id !== projectId) {
          return false;
        }
      }
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

  let balance = 0;
  return filtered.map((e) => {
    const debit = e.entryType === "EXPENSE" ? e.amount ?? 0 : 0;
    const credit = e.entryType === "INCOME" ? e.amount ?? 0 : 0;
    balance += credit - debit;
    const vendor = vendorOf(e.vendorId);
    const proj = projOf(e.projectId);
    const desc =
      (e.category?.replace(/_/g, " ") || "Uncategorised") +
      (vendor ? ` · ${vendor.name}` : proj ? ` · ${proj.clientName}` : "");
    return {
      _id: e._id,
      date: fmtDate(e.entryDate),
      description: desc,
      debit,
      credit,
      balance,
    };
  });
}

function periodLabelFor(period: Period, start: Date | null, end: Date | null): string {
  if (period === "all") return "All time";
  if (start && end)
    return `${fmtDate(start.toISOString())} – ${fmtDate(end.toISOString())}`;
  return "Custom";
}

export default function PaymentAccountStatementPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const accountQuery = usePaymentAccount(id);
  const account = accountQuery.data;

  const ledgerQuery = useLedger({ paymentAccountId: id });
  const entries = ledgerQuery.data?.data ?? [];

  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState(false);

  // Distinct projects present in this account's entries (for the filter).
  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const p = projOf(e.projectId);
      if (p && !map.has(p._id)) map.set(p._id, p.clientName);
    }
    return Array.from(map, ([_id, name]) => ({ _id, name }));
  }, [entries]);

  const { start, end } = periodRange(period, from, to);

  // On-page table rows (driven by the page filters).
  const rows = useMemo(
    () => buildRows(entries, start, end, projectId),
    [entries, start, end, projectId]
  );
  const totalIn = rows.reduce((s, r) => s + r.credit, 0);
  const totalOut = rows.reduce((s, r) => s + r.debit, 0);

  // Pagination for the on-page table (running balance is precomputed over the
  // full set, so slicing the display keeps each row's balance correct).
  const PER_PAGE = 15;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pagedRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => {
    setPage(1);
  }, [period, from, to, projectId]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  // Download dialog — asks which period & project before generating the PDF.
  const [showDownload, setShowDownload] = useState(false);
  const [dlgPeriod, setDlgPeriod] = useState<Period>("all");
  const [dlgFrom, setDlgFrom] = useState("");
  const [dlgTo, setDlgTo] = useState("");
  const [dlgProject, setDlgProject] = useState("");

  function openDownload() {
    // Pre-fill with whatever is currently on screen.
    setDlgPeriod(period);
    setDlgFrom(from);
    setDlgTo(to);
    setDlgProject(projectId);
    setShowDownload(true);
  }

  async function handleDownload() {
    if (!account) return;
    setDownloading(true);
    try {
      const r = periodRange(dlgPeriod, dlgFrom, dlgTo);
      const pdfRows: StatementRow[] = buildRows(
        entries,
        r.start,
        r.end,
        dlgProject
      ).map((row) => ({
        date: row.date,
        description: row.description,
        debit: row.debit,
        credit: row.credit,
        balance: row.balance,
      }));
      await downloadStatementPdf({
        account: {
          name: account.name,
          type: account.type,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          ifsc: account.ifsc,
          upiId: account.upiId,
          upiApp: account.upiApp,
          cardNetwork: account.cardNetwork,
          cardLast4: account.cardLast4,
        },
        rows: pdfRows,
        periodLabel: periodLabelFor(dlgPeriod, r.start, r.end),
        projectLabel: dlgProject
          ? dlgProject === "NONE"
            ? "Without project"
            : projects.find((p) => p._id === dlgProject)?.name
          : undefined,
        generatedOn: new Date().toLocaleString("en-GB"),
      });
      setShowDownload(false);
    } catch {
      toast.error("Failed to generate statement PDF");
    } finally {
      setDownloading(false);
    }
  }

  if (accountQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (accountQuery.isError || !account) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-red-400">Failed to load this account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
          <CreditCard className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {account.name}
            </h2>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {account.type}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {account.bankName && <span>{account.bankName}</span>}
            {account.accountNumber && <span>A/C: {account.accountNumber}</span>}
            {account.ifsc && <span>IFSC: {account.ifsc}</span>}
            {account.upiApp && <span>{account.upiApp}</span>}
            {account.upiId && <span>{account.upiId}</span>}
            {account.cardNetwork && (
              <span>
                {account.cardNetwork}
                {account.cardLast4 ? ` ••${account.cardLast4}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <FilterField label="Period">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
          </select>
        </FilterField>
        {period === "custom" && (
          <>
            <FilterField label="From">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
            </FilterField>
            <FilterField label="To">
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
            </FilterField>
          </>
        )}
        <FilterField label="Project">
          <ProjectFilter
            value={projectId}
            onChange={setProjectId}
            options={projects}
          />
        </FilterField>
        <Button size="sm" onClick={openDownload} className="ml-auto">
          <Download className="h-4 w-4" /> Download statement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<ArrowUpRight className="h-4 w-4" />} label="Received in" value={inr(totalIn)} tone="emerald" />
        <Stat icon={<ArrowDownRight className="h-4 w-4" />} label="Paid out" value={inr(totalOut)} tone="red" />
        <Stat icon={<Banknote className="h-4 w-4" />} label="Net" value={inr(totalIn - totalOut)} tone={totalIn - totalOut >= 0 ? "emerald" : "red"} />
      </div>

      {/* Statement table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit (out)</th>
              <th className="px-4 py-3 text-right">Credit (in)</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {page === 1 && (
              <tr className="border-b border-slate-100 text-xs italic text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
                <td className="px-4 py-2" />
                <td className="px-4 py-2">Opening balance</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-right tabular-nums">{inr(0)}</td>
              </tr>
            )}
            {ledgerQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <Skeleton className="h-10 w-full rounded" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              pagedRows.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{r.date}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                    {r.debit ? inr(r.debit) : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {r.credit ? inr(r.credit) : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                    {inr(r.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold dark:border-slate-700 dark:bg-slate-900/80">
                <td className="px-4 py-3" />
                <td className="px-4 py-3">Totals</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">{inr(totalOut)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{inr(totalIn)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900 dark:text-slate-50">{inr(totalIn - totalOut)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {rows.length > PER_PAGE && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Page {page} of {pageCount} · {rows.length} transactions
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Download statement dialog */}
      <Dialog
        open={showDownload}
        onClose={() => setShowDownload(false)}
        className="max-w-md"
      >
        <div className="space-y-4 p-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Download statement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose the period and project for the PDF.
            </p>
          </div>

          <DialogField label="Period">
            <select
              value={dlgPeriod}
              onChange={(e) => setDlgPeriod(e.target.value as Period)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              <option value="all">All time</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </DialogField>

          {dlgPeriod === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <DialogField label="From">
                <input
                  type="date"
                  value={dlgFrom}
                  onChange={(e) => setDlgFrom(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </DialogField>
              <DialogField label="To">
                <input
                  type="date"
                  value={dlgTo}
                  onChange={(e) => setDlgTo(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </DialogField>
            </div>
          )}

          <DialogField label="Project">
            <select
              value={dlgProject}
              onChange={(e) => setDlgProject(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </DialogField>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setShowDownload(false)}
              disabled={downloading}
            >
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function DialogField({
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

function BackLink() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/payment-accounts">
        <ArrowLeft className="h-4 w-4" /> Back to payment accounts
      </Link>
    </Button>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "red";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span
          className={
            tone === "emerald"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }
        >
          {icon}
        </span>
        {label}
      </div>
      <p
        className={`mt-1 truncate text-xl font-bold ${
          tone === "emerald"
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
