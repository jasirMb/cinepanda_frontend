"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  FolderKanban,
  Phone,
  Receipt,
} from "lucide-react";

import { useVendor } from "@/hooks/useVendors";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntryPopulated } from "@/lib/api/ledger";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function projectName(p: LedgerEntryPopulated["projectId"]): string {
  return p && typeof p === "object" ? p.clientName : "—";
}
function accountName(a: LedgerEntryPopulated["paymentAccountId"]): string | null {
  return a && typeof a === "object" ? a.name : null;
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

  const total = useMemo(
    () => entries.reduce((s, e) => s + (e.amount ?? 0), 0),
    [entries]
  );

  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const e of entries) {
      const key =
        e.projectId && typeof e.projectId === "object" ? e.projectId._id : "none";
      const name = projectName(e.projectId);
      const row = map.get(key) ?? { name, total: 0, count: 0 };
      row.total += e.amount ?? 0;
      row.count += 1;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries]);

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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<Banknote className="h-4 w-4" />} label="Total paid" value={inr(total)} accent />
        <Stat icon={<Receipt className="h-4 w-4" />} label="Entries" value={String(entries.length)} />
        <Stat icon={<FolderKanban className="h-4 w-4" />} label="Projects" value={String(byProject.filter((p) => p.name !== "—").length)} />
      </div>

      {/* By project */}
      {byProject.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
            Paid by project
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {byProject.map((p, i) => (
              <li key={p.name + i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                  {p.name}{" "}
                  <span className="text-xs text-slate-400">· {p.count} entr{p.count === 1 ? "y" : "ies"}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {inr(p.total)}
                </span>
              </li>
            ))}
          </ul>
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
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No ledger entries for this vendor yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((e) => (
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
      </div>
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
