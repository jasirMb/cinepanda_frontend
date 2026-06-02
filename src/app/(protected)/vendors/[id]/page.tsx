"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderKanban,
  Phone,
  Receipt,
} from "lucide-react";

import { useVendor } from "@/hooks/useVendors";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntryPopulated } from "@/lib/api/ledger";
import {
  downloadVendorStatementPdf,
  type VendorStatementRow,
} from "@/lib/statement-pdf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";

type Period = "all" | "week" | "month" | "year" | "custom";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    const day = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end: now };
}

function periodLabelFor(period: Period, start: Date | null, end: Date | null): string {
  if (period === "all") return "All time";
  if (start && end)
    return `${fmtDate(start.toISOString())} – ${fmtDate(end.toISOString())}`;
  return "Custom";
}

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function projectName(p: LedgerEntryPopulated["projectId"]): string {
  return p && typeof p === "object" ? p.clientName : "—";
}
function accountName(a: LedgerEntryPopulated["paymentAccountId"]): string | null {
  return a && typeof a === "object" ? a.name : null;
}
function paidViaOf(e: LedgerEntryPopulated): string {
  const a = e.paymentAccountId;
  if (a && typeof a === "object") {
    if (a.type === "UPI") return a.upiId ? `${a.name} · ${a.upiId}` : a.name;
    if (a.type === "BANK") {
      const sub = [
        a.bankName,
        a.accountNumber ? `A/C ••${a.accountNumber.slice(-4)}` : "",
        a.accountHolderName,
      ].filter(Boolean);
      return sub.length ? `${a.name} · ${sub.join(" · ")}` : a.name;
    }
    return a.name;
  }
  return e.paymentMethod ? e.paymentMethod.replace(/_/g, " ") : "—";
}

export default function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const vendorQuery = useVendor(id);
  const vendor = vendorQuery.data;

  const ledgerQuery = useLedger({ vendorId: id });
  const entries = ledgerQuery.data?.data ?? [];

  // Page filters (date period + project).
  const [fPeriod, setFPeriod] = useState<Period>("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fProject, setFProject] = useState("");

  // Distinct projects (id+name) for the filter — from ALL entries.
  const projectList = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const p = e.projectId;
      if (p && typeof p === "object" && !map.has(p._id))
        map.set(p._id, p.clientName);
    }
    return Array.from(map, ([_id, name]) => ({ _id, name }));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const { start, end } = periodRange(fPeriod, fFrom, fTo);
    return entries
      .filter((e) => {
        const ts = new Date(e.entryDate).getTime();
        if (start && ts < start.getTime()) return false;
        if (end && ts > end.getTime()) return false;
        if (fProject) {
          const p = e.projectId;
          if (!(p && typeof p === "object" && p._id === fProject)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      );
  }, [entries, fPeriod, fFrom, fTo, fProject]);

  const total = useMemo(
    () => filteredEntries.reduce((s, e) => s + (e.amount ?? 0), 0),
    [filteredEntries]
  );

  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const e of filteredEntries) {
      const key =
        e.projectId && typeof e.projectId === "object" ? e.projectId._id : "none";
      const name = projectName(e.projectId);
      const row = map.get(key) ?? { name, total: 0, count: 0 };
      row.total += e.amount ?? 0;
      row.count += 1;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredEntries]);

  // Pagination
  const PER_PAGE = 12;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PER_PAGE));
  const pagedEntries = filteredEntries.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );
  useEffect(() => {
    setPage(1);
  }, [fPeriod, fFrom, fTo, fProject]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const [showDownload, setShowDownload] = useState(false);
  const [dlgPeriod, setDlgPeriod] = useState<Period>("all");
  const [dlgFrom, setDlgFrom] = useState("");
  const [dlgTo, setDlgTo] = useState("");
  const [dlgProject, setDlgProject] = useState("");
  const [downloading, setDownloading] = useState(false);

  function openDownload() {
    setDlgPeriod(fPeriod);
    setDlgFrom(fFrom);
    setDlgTo(fTo);
    setDlgProject(fProject);
    setShowDownload(true);
  }

  async function handleDownload() {
    if (!vendor) return;
    setDownloading(true);
    try {
      const { start, end } = periodRange(dlgPeriod, dlgFrom, dlgTo);
      const pdfRows: VendorStatementRow[] = entries
        .filter((e) => {
          const ts = new Date(e.entryDate).getTime();
          if (start && ts < start.getTime()) return false;
          if (end && ts > end.getTime()) return false;
          if (dlgProject) {
            const p = e.projectId;
            if (!(p && typeof p === "object" && p._id === dlgProject)) return false;
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
        )
        .map((e) => ({
          date: fmtDate(e.entryDate),
          project: projectName(e.projectId),
          description: e.category?.replace(/_/g, " ") || "Uncategorised",
          paidVia: paidViaOf(e),
          amount: e.amount ?? 0,
        }));
      await downloadVendorStatementPdf({
        vendor: {
          name: vendor.name,
          gstNumber: vendor.gstNumber,
          contactPerson: vendor.contactPerson,
          phone: vendor.phone,
          email: vendor.email,
          address: vendor.address,
          upiId: vendor.upiId,
          bankName: vendor.bankName,
          accountNumber: vendor.accountNumber,
          ifsc: vendor.ifsc,
        },
        rows: pdfRows,
        periodLabel: periodLabelFor(dlgPeriod, start, end),
        projectLabel: dlgProject
          ? projectList.find((p) => p._id === dlgProject)?.name
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

  if (vendorQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (vendorQuery.isError || !vendor) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-red-400">Failed to load this vendor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {vendor.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {vendor.contactPerson && <span>{vendor.contactPerson}</span>}
            {vendor.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {vendor.phone}
              </span>
            )}
            {vendor.gstNumber && <span>GST: {vendor.gstNumber}</span>}
            {(vendor.upiId || vendor.bankName) && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                {vendor.upiId || `${vendor.bankName}${vendor.accountNumber ? " · " + vendor.accountNumber : ""}`}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openDownload}
          className="shrink-0"
        >
          <Download className="h-4 w-4" /> Statement
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <FilterField label="Period">
          <select
            value={fPeriod}
            onChange={(e) => setFPeriod(e.target.value as Period)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
          </select>
        </FilterField>
        {fPeriod === "custom" && (
          <>
            <FilterField label="From">
              <input
                type="date"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
            </FilterField>
            <FilterField label="To">
              <input
                type="date"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
            </FilterField>
          </>
        )}
        <FilterField label="Project">
          <select
            value={fProject}
            onChange={(e) => setFProject(e.target.value)}
            className="h-8 max-w-[180px] rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="">All projects</option>
            {projectList.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </FilterField>
        <span className="ml-auto self-center text-xs text-slate-500 dark:text-slate-400">
          {filteredEntries.length} of {entries.length}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<Banknote className="h-4 w-4" />} label="Total paid" value={inr(total)} accent />
        <Stat icon={<Receipt className="h-4 w-4" />} label="Entries" value={String(filteredEntries.length)} />
        <Stat icon={<FolderKanban className="h-4 w-4" />} label="Projects" value={String(byProject.filter((p) => p.name !== "—").length)} />
      </div>

      {/* By project — horizontal slider */}
      {byProject.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Paid by project
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {byProject.length}
            </span>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto p-4">
            {byProject.map((p, i) => (
              <div
                key={p.name + i}
                className="flex w-44 shrink-0 snap-start flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={p.name}>
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {p.count} entr{p.count === 1 ? "y" : "ies"}
                  </p>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {inr(p.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
          Ledger entries
        </div>
        {ledgerQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {entries.length === 0
              ? "No ledger entries for this vendor yet."
              : "No entries match the selected filters."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagedEntries.map((e) => (
              <li key={e._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                    {e.category?.replace(/_/g, " ") || "Uncategorised"}
                    {e.itemType && (
                      <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                        {e.itemType}
                      </span>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(e.entryDate).toLocaleDateString()}
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    {projectName(e.projectId)}
                    {accountName(e.paymentAccountId) && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        {accountName(e.paymentAccountId)}
                      </>
                    )}
                  </p>
                </div>
                <Link
                  href={`/ledger/${e._id}/edit`}
                  className="shrink-0 text-sm font-bold text-red-600 hover:underline dark:text-red-400"
                >
                  {inr(e.amount)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {filteredEntries.length > PER_PAGE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              Page {page} of {pageCount} · {filteredEntries.length} entries
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
      </div>

      {/* Download statement dialog */}
      <Dialog
        open={showDownload}
        onClose={() => setShowDownload(false)}
        className="max-w-md"
      >
        <div className="space-y-4 p-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Vendor statement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate a PDF of payments to {vendor.name}.
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
              {projectList.map((p) => (
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

function BackLink() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/vendors">
        <ArrowLeft className="h-4 w-4" /> Back to vendors
      </Link>
    </Button>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className={accent ? "text-cine-primary" : "text-slate-400"}>{icon}</span>
        {label}
      </div>
      <p
        className={`mt-1 truncate text-xl font-bold ${
          accent ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
