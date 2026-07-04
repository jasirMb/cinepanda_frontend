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
  Link2,
} from "lucide-react";

import {
  usePaymentAccount,
  usePaymentAccounts,
  useAccountStatement,
} from "@/hooks/usePaymentAccounts";
import { fetchAccountStatement } from "@/lib/api/payment-accounts";
import { useProjects } from "@/hooks/useProjects";
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

/** The columns a statement row shows, derived from one ledger entry. */
function entryDisplay(e: LedgerEntryPopulated) {
  const vendor = vendorOf(e.vendorId);
  const proj = projOf(e.projectId);
  // Main line: Category · who it was with. Note line: the entry's own description.
  const description = [
    e.category?.replace(/_/g, " ") || "Uncategorised",
    vendor ? vendor.name : proj ? proj.clientName : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    date: fmtDate(e.entryDate),
    description,
    note: e.description?.trim() || "",
    debit: e.entryType === "EXPENSE" ? e.amount ?? 0 : 0,
    credit: e.entryType === "INCOME" ? e.amount ?? 0 : 0,
  };
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

  const allAccounts = usePaymentAccounts().data?.data ?? [];
  // Linked UPIs that draw from this account (when this account is a bank).
  const linkedChildren = useMemo(
    () => allAccounts.filter((a) => a.linkedAccountId === id),
    [allAccounts, id]
  );
  // When this account is itself a UPI linked to a bank, that bank.
  const linkedParent = useMemo(
    () =>
      account?.linkedAccountId
        ? allAccounts.find((a) => a._id === account.linkedAccountId) ?? null
        : null,
    [allAccounts, account?.linkedAccountId]
  );
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const PER_PAGE = 15;
  const [page, setPage] = useState(1);

  const { start, end } = periodRange(period, from, to);

  // Server-paginated statement; the running balance is computed on the backend
  // over every entry (incl. any linked UPIs), so each page stays correct.
  const stmtQuery = useAccountStatement(id, {
    startDate: start ? start.toISOString() : undefined,
    endDate: end ? end.toISOString() : undefined,
    projectId: projectId || undefined,
    page,
    limit: PER_PAGE,
  });
  const stmt = stmtQuery.data;
  const displayRows = useMemo(
    () =>
      (stmt?.data ?? []).map((r) => ({
        _id: r.entry._id,
        ...entryDisplay(r.entry),
        balance: r.balance,
      })),
    [stmt]
  );
  const total = stmt?.total ?? 0;
  const pageCount = stmt?.totalPages ?? 1;
  const currentBalance = stmt?.currentBalance ?? account?.openingBalance ?? 0;
  const openingSeed = stmt?.broughtForward ?? account?.openingBalance ?? 0;
  const totalIn = stmt?.periodIn ?? 0;
  const totalOut = stmt?.periodOut ?? 0;

  // Project options for the filter — every project (the server filters by id).
  const projectsList = useProjects().data?.data ?? [];
  const projects = useMemo(
    () => projectsList.map((p) => ({ _id: p._id, name: p.clientName })),
    [projectsList]
  );

  useEffect(() => {
    setPage(1);
  }, [period, from, to, projectId]);

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
      const res = await fetchAccountStatement(id, {
        startDate: r.start ? r.start.toISOString() : undefined,
        endDate: r.end ? r.end.toISOString() : undefined,
        projectId: dlgProject || undefined,
        limit: 0, // all rows for the chosen period
      });
      const pdfRows: StatementRow[] = res.data.map((row) => {
        const d = entryDisplay(row.entry);
        return {
          date: d.date,
          description: d.note ? `${d.description} · ${d.note}` : d.description,
          debit: d.debit,
          credit: d.credit,
          balance: row.balance,
        };
      });
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

      {/* Linked-account note */}
      {(linkedParent || linkedChildren.length > 0) && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
          {linkedParent ? (
            <p>
              This UPI is linked to{" "}
              <Link
                href={`/payment-accounts/${linkedParent._id}`}
                className="font-semibold underline"
              >
                {linkedParent.name}
              </Link>
              . The balance is shared with the bank — the entries below are the
              ones made through this UPI.
            </p>
          ) : (
            <p>
              Balance and statement include linked UPI
              {linkedChildren.length > 1 ? "s" : ""}:{" "}
              <span className="font-semibold">
                {linkedChildren.map((c) => c.name).join(", ")}
              </span>
              .
            </p>
          )}
        </div>
      )}

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
            {account.cardType && (
              <span>{account.cardType === "CREDIT" ? "Credit card" : "Debit card"}</span>
            )}
            {account.cardNetwork && (
              <span>
                {account.cardNetwork}
                {account.cardLast4 ? ` ••${account.cardLast4}` : ""}
              </span>
            )}
            {account.cardType === "CREDIT" && account.creditLimit != null && (
              <span>Limit: {inr(account.creditLimit)}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {account.type === "CARD" && account.cardType === "CREDIT"
              ? "Spent"
              : "Balance now"}
          </p>
          <p
            className={`text-2xl font-bold tracking-tight ${
              currentBalance >= 0
                ? "text-slate-900 dark:text-slate-50"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {inr(currentBalance)}
          </p>
          {account.type === "CARD" &&
            account.cardType === "CREDIT" &&
            account.creditLimit != null && (
              <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {inr(account.creditLimit - currentBalance)} available
              </p>
            )}
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
                <td className="px-4 py-2">
                  {period === "all" ? "Opening balance" : "Balance brought forward"}
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-right tabular-nums">{inr(openingSeed)}</td>
              </tr>
            )}
            {stmtQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <Skeleton className="h-10 w-full rounded" />
                </td>
              </tr>
            ) : total === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              displayRows.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{r.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 dark:text-slate-200">
                      {r.description}
                    </p>
                    {r.note && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {r.note}
                      </p>
                    )}
                  </td>
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
          {total > 0 && (
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

      {total > PER_PAGE && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Page {page} of {pageCount} · {total} transactions
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
