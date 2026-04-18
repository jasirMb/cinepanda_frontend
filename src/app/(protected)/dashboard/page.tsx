"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  Phone,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";

import { useProjectsOverview } from "@/hooks/useDashboard";
import { useLedger, useLedgerSummary } from "@/hooks/useLedger";
import { useFollowupLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/lib/api/leads";
import type {
  CategorySummary,
  LedgerEntryPopulated,
} from "@/lib/api/ledger";
import type { ProjectPopulated } from "@/lib/api/projects";

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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shortMonth(d: Date) {
  return d.toLocaleString("en-US", { month: "short" });
}

function startOfSixMonthsAgo(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - 5);
  return d;
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ────────────────────────────────────────────
   Design tokens (Zoho Books-inspired)
   ──────────────────────────────────────────── */

const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "#60a5fa",
  ONGOING: "#f59e0b",
  ON_HOLD: "#a78bfa",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const EXPENSE_PALETTE = [
  "#0ea5e9",
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
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
   Page
   ──────────────────────────────────────────── */

export default function DashboardPage() {
  const overviewQuery = useProjectsOverview();
  const summaryQuery = useLedgerSummary();

  const sixMonthsAgo = useMemo(() => startOfSixMonthsAgo(), []);
  const today = useMemo(() => new Date(), []);
  const ledgerQuery = useLedger({
    startDate: toIsoDate(sixMonthsAgo),
    endDate: toIsoDate(today),
  });
  const recentLedgerQuery = useLedger({});
  const followupQuery = useFollowupLeads({
    date: toIsoDate(today),
    period: "week",
  });
  const projectsQuery = useProjects();

  const data = overviewQuery.data?.data;

  const monthlySeries = useMemo(() => {
    const base: Record<
      string,
      { key: string; month: string; income: number; expense: number }
    > = {};
    const cursor = new Date(sixMonthsAgo);
    for (let i = 0; i < 6; i++) {
      const key = monthKey(cursor);
      base[key] = { key, month: shortMonth(cursor), income: 0, expense: 0 };
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const entries: LedgerEntryPopulated[] = ledgerQuery.data?.data ?? [];
    for (const e of entries) {
      const d = new Date(e.entryDate);
      const key = monthKey(d);
      const bucket = base[key];
      if (!bucket) continue;
      if (e.entryType === "INCOME") bucket.income += e.amount;
      else if (e.entryType === "EXPENSE") bucket.expense += e.amount;
    }
    return Object.values(base).map((b) => ({
      ...b,
      profit: b.income - b.expense,
    }));
  }, [ledgerQuery.data?.data, sixMonthsAgo]);

  const hasMonthlyData = monthlySeries.some((m) => m.income || m.expense);

  const projectStatusData = useMemo(
    () =>
      [
        { name: "Planning", value: data?.planningProjects ?? 0, key: "PLANNING" },
        { name: "Ongoing", value: data?.ongoingProjects ?? 0, key: "ONGOING" },
        {
          name: "Completed",
          value: data?.completedProjects ?? 0,
          key: "COMPLETED",
        },
        {
          name: "Cancelled",
          value: data?.cancelledProjects ?? 0,
          key: "CANCELLED",
        },
      ].filter((s) => s.value > 0),
    [data]
  );

  const expenseByCategory = useMemo(() => {
    const byCategory: CategorySummary[] =
      summaryQuery.data?.data.byCategory ?? [];
    return byCategory
      .filter((c) => c._id.entryType === "EXPENSE")
      .map((c) => ({
        name: c._id.category || "Uncategorised",
        value: c.total,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [summaryQuery.data?.data.byCategory]);

  const expenseTotal = expenseByCategory.reduce((s, c) => s + c.value, 0);

  const upcomingLeads: Lead[] = followupQuery.data?.data ?? [];

  const recentTransactions: LedgerEntryPopulated[] = useMemo(() => {
    const entries = recentLedgerQuery.data?.data ?? [];
    return [...entries]
      .sort(
        (a, b) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      )
      .slice(0, 6);
  }, [recentLedgerQuery.data?.data]);

  const pipelineProjects: ProjectPopulated[] = useMemo(() => {
    const list = projectsQuery.data?.data ?? [];
    return list
      .filter((p) => p.status === "PLANNING" || p.status === "ONGOING")
      .sort(
        (a, b) =>
          new Date(a.expectedCompletionDate).getTime() -
          new Date(b.expectedCompletionDate).getTime()
      )
      .slice(0, 5);
  }, [projectsQuery.data?.data]);

  if (overviewQuery.isLoading) return <DashboardSkeleton />;
  if (overviewQuery.isError) {
    return (
      <p className="text-red-500 dark:text-red-400">
        Failed to load dashboard. Please try again.
      </p>
    );
  }

  const netProfit = data?.netProfit ?? 0;
  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const profitMargin =
    totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
  const totalPending = data?.totalPending ?? 0;
  const totalProjectValue = data?.totalProjectValue ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {greeting()}, Admin
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {today.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <CalendarDays className="h-3.5 w-3.5" />
          This Fiscal Year
        </span>
      </div>

      {/* Upcoming Leads — featured at top */}
      <UpcomingLeadsCard
        leads={upcomingLeads}
        loading={followupQuery.isLoading}
      />

      {/* Receivables / Sales summary (Zoho-style top cards) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReceivablesCard
          totalPending={totalPending}
          totalProjectValue={totalProjectValue}
          totalProjects={data?.totalProjects ?? 0}
          planning={data?.planningProjects ?? 0}
          ongoing={data?.ongoingProjects ?? 0}
          completed={data?.completedProjects ?? 0}
        />
        <SalesSummaryCard
          totalProjectValue={totalProjectValue}
          totalIncome={totalIncome}
          netProfit={netProfit}
          monthly={monthlySeries}
          loading={ledgerQuery.isLoading}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiMini
          label="Total Project Value"
          value={formatINR(totalProjectValue)}
          icon={<Briefcase className="h-4 w-4" />}
          tone="primary"
          hint={`${data?.totalProjects ?? 0} projects`}
        />
        <KpiMini
          label="Total Income"
          value={formatINR(totalIncome)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="success"
        />
        <KpiMini
          label="Total Expense"
          value={formatINR(totalExpense)}
          icon={<ArrowDownRight className="h-4 w-4" />}
          tone="danger"
        />
        <KpiMini
          label="Net Profit"
          value={formatINR(netProfit)}
          icon={
            netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
          }
          tone={netProfit >= 0 ? "success" : "danger"}
          hint={`${profitMargin}% margin`}
        />
      </div>

      {/* Cash flow chart */}
      <SectionCard
        title="Cash Flow"
        subtitle="Income, expense and profit — last 6 months"
        action={
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            6 months
          </span>
        }
      >
        {ledgerQuery.isLoading ? (
          <Skeleton className="h-[280px] rounded-lg" />
        ) : hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={monthlySeries}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3076A1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3076A1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-slate-500"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-slate-500"
                tickFormatter={(v) => formatINRCompact(Number(v))}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatINR(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#10b981"
                strokeWidth={2.2}
                fill="url(#incomeFill)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Expense"
                stroke="#ef4444"
                strokeWidth={2.2}
                fill="url(#expenseFill)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#3076A1"
                strokeWidth={2.2}
                fill="url(#profitFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyBlock label="No ledger activity in last 6 months" />
        )}
      </SectionCard>

      {/* Top Expenses + Project Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top Expenses" subtitle="Breakdown by category">
          {summaryQuery.isLoading ? (
            <Skeleton className="h-[300px] rounded-lg" />
          ) : expenseByCategory.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {expenseByCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => formatINR(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2">
                {expenseByCategory.map((c, i) => {
                  const pct = expenseTotal
                    ? Math.round((c.value / expenseTotal) * 100)
                    : 0;
                  return (
                    <li
                      key={c.name}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background:
                              EXPENSE_PALETTE[i % EXPENSE_PALETTE.length],
                          }}
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
          ) : (
            <EmptyBlock label="No expenses recorded yet" />
          )}
        </SectionCard>

        <SectionCard
          title="Project Status"
          subtitle={`${data?.totalProjects ?? 0} total projects`}
        >
          {projectStatusData.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {projectStatusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PROJECT_STATUS_COLORS[entry.key] ?? "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2">
                {projectStatusData.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            PROJECT_STATUS_COLORS[s.key] ?? "#64748b",
                        }}
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        {s.name}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-50">
                      {s.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyBlock label="No projects yet" />
          )}
        </SectionCard>
      </div>

      {/* Recent Transactions */}
      <RecentTransactionsCard
        entries={recentTransactions}
        loading={recentLedgerQuery.isLoading}
      />

      {/* Projects in Pipeline */}
      <SectionCard
        title="Projects in the Pipeline"
        subtitle="Active and upcoming projects"
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-medium text-cine-primary hover:underline"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {projectsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : pipelineProjects.length === 0 ? (
          <EmptyBlock label="No active or upcoming projects" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Due</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pipelineProjects.map((p) => (
                  <tr
                    key={p._id}
                    className="bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                      {p.clientName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {p.serviceType}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatDate(p.expectedCompletionDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">
                      {formatINR(p.projectValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ────────────────────────────────────────────
   Shared sub-components
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

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60 ${
        className ?? ""
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function KpiMini({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: Tone;
  hint?: string;
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
      <p className="mt-2 truncate text-xl font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {hint ? (
        <p className={`text-xs font-medium ${t.text}`}>{hint}</p>
      ) : null}
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500">
      <ReceiptText className="mb-2 h-7 w-7 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function ReceivablesCard({
  totalPending,
  totalProjectValue,
  totalProjects,
  planning,
  ongoing,
  completed,
}: {
  totalPending: number;
  totalProjectValue: number;
  totalProjects: number;
  planning: number;
  ongoing: number;
  completed: number;
}) {
  const pct =
    totalProjectValue > 0
      ? Math.min(100, Math.round((totalPending / totalProjectValue) * 100))
      : 0;
  const total = planning + ongoing + completed || 1;
  const segments = [
    {
      label: "Planning",
      value: planning,
      color: PROJECT_STATUS_COLORS.PLANNING,
    },
    {
      label: "Ongoing",
      value: ongoing,
      color: PROJECT_STATUS_COLORS.ONGOING,
    },
    {
      label: "Completed",
      value: completed,
      color: PROJECT_STATUS_COLORS.COMPLETED,
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Total Receivables
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Amount yet to be collected
          </p>
        </div>
        <Wallet className="h-4 w-4 text-slate-400" />
      </header>
      <div className="p-5">
        <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {formatINR(totalPending)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {pct}% of {formatINRCompact(totalProjectValue)} total project value ·{" "}
          {totalProjects} projects
        </p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span>Project mix</span>
            <span>{totalProjects} total</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {segments.map((s) => (
              <div
                key={s.label}
                className="h-full"
                style={{
                  width: `${(s.value / total) * 100}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {segments.map((s) => (
              <li key={s.label} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {s.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {s.value}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SalesSummaryCard({
  totalProjectValue,
  totalIncome,
  netProfit,
  monthly,
  loading,
}: {
  totalProjectValue: number;
  totalIncome: number;
  netProfit: number;
  monthly: { month: string; income: number; expense: number; profit: number }[];
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Sales
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This fiscal year
          </p>
        </div>
        <TrendingUp className="h-4 w-4 text-slate-400" />
      </header>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total Project Value
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {formatINR(totalProjectValue)}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Total Income
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatINRCompact(totalIncome)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Net Profit
              </span>
              <span
                className={`font-semibold ${
                  netProfit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatINRCompact(netProfit)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-end">
          {loading ? (
            <Skeleton className="h-[120px] w-full rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart
                data={monthly}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3076A1" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#3076A1"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatINR(Number(value))}
                  labelFormatter={(l) => `Month: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#3076A1"
                  strokeWidth={2}
                  fill="url(#sparkFill)"
                  name="Income"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

const PRIORITY_TONE: Record<string, Tone> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "primary",
  High: "danger",
  Medium: "warning",
  Low: "primary",
};

function UpcomingLeadsCard({
  leads,
  loading,
}: {
  leads: Lead[];
  loading: boolean;
}) {
  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      const ta = a.nextCallTime ? new Date(a.nextCallTime).getTime() : Infinity;
      const tb = b.nextCallTime ? new Date(b.nextCallTime).getTime() : Infinity;
      return ta - tb;
    });
  }, [leads]);

  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-cine-primary/5 via-white to-white shadow-sm dark:border-slate-800 dark:from-cine-primary/15 dark:via-slate-900/60 dark:to-slate-900/60">
      <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary ring-1 ring-cine-primary/20 dark:bg-cine-primary/20">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Upcoming Leads
              </h3>
              {sorted.length > 0 ? (
                <span className="rounded-full bg-cine-primary/10 px-2 py-0.5 text-[11px] font-semibold text-cine-primary">
                  {sorted.length} this week
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Follow-ups scheduled in the next 7 days
            </p>
          </div>
        </div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 self-start rounded-md bg-cine-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cine-primary/90 sm:self-auto"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="p-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-slate-400 dark:border-slate-800 dark:text-slate-500">
            <CalendarDays className="mb-2 h-8 w-8 opacity-60" />
            <p className="text-sm font-medium">No follow-ups scheduled</p>
            <p className="mt-0.5 text-xs">
              Leads with a next-call date in the next 7 days will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.slice(0, 6).map((lead) => (
              <UpcomingLeadTile key={lead._id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function UpcomingLeadTile({ lead }: { lead: Lead }) {
  const tone = PRIORITY_TONE[lead.priorityType] ?? "neutral";
  const t = TONES[tone];
  const initials =
    lead.customerName
      ?.split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const due = lead.nextCallTime ? dueLabel(lead.nextCallTime) : null;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cine-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cine-primary/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${t.bg} ${t.text}`}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {lead.customerName}
            </p>
            {lead.place ? (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {lead.place}
              </p>
            ) : null}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${t.bg} ${t.text}`}
        >
          {lead.priorityType}
        </span>
      </div>

      {due ? (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
            due.urgent
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {due.label}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
          {lead.contactNumber ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {lead.contactNumber}
            </span>
          ) : (
            <span className="italic">No contact</span>
          )}
        </div>
        {lead.contactNumber ? (
          <a
            href={`tel:${lead.contactNumber}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-cine-primary/40 hover:text-cine-primary dark:border-slate-700 dark:text-slate-200"
          >
            Call
          </a>
        ) : null}
      </div>
    </article>
  );
}

function dueLabel(iso: string): { label: string; urgent: boolean } {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (diffMs < 0) return { label: `Overdue · ${time}`, urgent: true };
  if (sameDay(d, now)) return { label: `Today, ${time}`, urgent: diffHrs <= 4 };
  if (sameDay(d, tomorrow)) return { label: `Tomorrow, ${time}`, urgent: false };
  return {
    label: `${d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })}, ${time}`,
    urgent: false,
  };
}

function RecentTransactionsCard({
  entries,
  loading,
}: {
  entries: LedgerEntryPopulated[];
  loading: boolean;
}) {
  return (
    <SectionCard
      title="Recent Transactions"
      subtitle="Latest ledger entries"
      action={
        <Link
          href="/ledger"
          className="inline-flex items-center gap-1 text-xs font-medium text-cine-primary hover:underline"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyBlock label="No transactions yet" />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((e) => {
            const isIncome = e.entryType === "INCOME";
            return (
              <li
                key={e._id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {e.category || "Uncategorised"}
                    </p>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatINR(e.amount)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(e.entryDate)}</span>
                    {e.projectId?.clientName ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="truncate">
                          {e.projectId.clientName}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    PROJECT_STATUS_COLORS[status] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: `${color}1A`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {status}
    </span>
  );
}

function formatCallTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (sameDay(d, today)) return `Today, ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })}, ${time}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[340px] rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
      <Skeleton className="h-[260px] rounded-xl" />
    </div>
  );
}
