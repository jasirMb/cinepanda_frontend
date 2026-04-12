"use client";

import { useProjectsOverview } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const overviewQuery = useProjectsOverview();
  const data = overviewQuery.data?.data;

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <p className="text-red-400">Failed to load dashboard. Please try again.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Dashboard
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          High-level overview of CinePanda projects and financials.
        </p>
      </div>

      {/* Project KPIs */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Projects
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Total Projects"
            value={String(data?.totalProjects ?? 0)}
          />
          <KpiCard
            label="Planning"
            value={String(data?.planningProjects ?? 0)}
            accent="text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            label="Ongoing"
            value={String(data?.ongoingProjects ?? 0)}
            accent="text-amber-600 dark:text-amber-400"
          />
          <KpiCard
            label="Completed"
            value={String(data?.completedProjects ?? 0)}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Cancelled"
            value={String(data?.cancelledProjects ?? 0)}
            accent="text-red-600 dark:text-red-400"
          />
        </div>
      </div>

      {/* Financial KPIs */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Financials
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total Project Value"
            value={formatINR(data?.totalProjectValue ?? 0)}
          />
          <KpiCard
            label="Total Income"
            value={formatINR(data?.totalIncome ?? 0)}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Total Expense"
            value={formatINR(data?.totalExpense ?? 0)}
            accent="text-red-600 dark:text-red-400"
          />
          <KpiCard
            label="Total Pending"
            value={formatINR(data?.totalPending ?? 0)}
            accent="text-amber-600 dark:text-amber-400"
          />
          <KpiCard
            label="Net Profit"
            value={formatINR(data?.netProfit ?? 0)}
            accent={
              (data?.netProfit ?? 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
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
