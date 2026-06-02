"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CreditCard,
  Receipt,
} from "lucide-react";

import { usePaymentAccount } from "@/hooks/usePaymentAccounts";
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
function vendorName(v: LedgerEntryPopulated["vendorId"]): string | null {
  return v && typeof v === "object" ? v.name : null;
}

export default function PaymentAccountDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const accountQuery = usePaymentAccount(id);
  const account = accountQuery.data;

  const ledgerQuery = useLedger({ paymentAccountId: id });
  const entries = ledgerQuery.data?.data ?? [];

  const { totalIn, totalOut } = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const e of entries) {
      if (e.entryType === "INCOME") totalIn += e.amount ?? 0;
      else totalOut += e.amount ?? 0;
    }
    return { totalIn, totalOut };
  }, [entries]);

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
            {account.upiId && <span>{account.upiId}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<ArrowUpRight className="h-4 w-4" />} label="Received in" value={inr(totalIn)} tone="emerald" />
        <Stat icon={<ArrowDownRight className="h-4 w-4" />} label="Paid out" value={inr(totalOut)} tone="red" />
        <Stat icon={<Banknote className="h-4 w-4" />} label="Net" value={inr(totalIn - totalOut)} tone={totalIn - totalOut >= 0 ? "emerald" : "red"} />
      </div>

      {/* Entries */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Transactions
          </h3>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Receipt className="h-3.5 w-3.5" /> {entries.length}
          </span>
        </div>
        {ledgerQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No transactions through this account yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((e) => {
              const isIncome = e.entryType === "INCOME";
              return (
                <li key={e._id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {e.category?.replace(/_/g, " ") || "Uncategorised"}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(e.entryDate).toLocaleDateString()}
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      {projectName(e.projectId)}
                      {vendorName(e.vendorId) && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          {vendorName(e.vendorId)}
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/ledger/${e._id}/edit`}
                    className={`shrink-0 text-sm font-bold hover:underline ${
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isIncome ? "+" : "−"}
                    {inr(e.amount)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
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
