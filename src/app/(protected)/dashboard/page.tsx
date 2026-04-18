"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  IndianRupee,
  Phone,
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

import { useProjectsOverview } from "@/hooks/useDashboard";
import { useLedger, useLedgerSummary } from "@/hooks/useLedger";
import { useFollowupLeads } from "@/hooks/useLeads";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/lib/api/leads";
import type {
  CategorySummary,
  LedgerEntryPopulated,
} from "@/lib/api/ledger";

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

const STATUS_COLORS = {
  planning: "#3b82f6",
  ongoing: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
} as const;

const EXPENSE_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

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

export default function DashboardPage() {
  const overviewQuery = useProjectsOverview();
  const summaryQuery = useLedgerSummary();

  const sixMonthsAgo = useMemo(() => startOfSixMonthsAgo(), []);
  const today = useMemo(() => new Date(), []);
  const ledgerQuery = useLedger({
    startDate: toIsoDate(sixMonthsAgo),
    endDate: toIsoDate(today),
  });

  const followupQuery = useFollowupLeads({
    date: toIsoDate(today),
    period: "week",
  });

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

  const statusData = useMemo(
    () => [
      {
        name: "Planning",
        value: data?.planningProjects ?? 0,
        color: STATUS_COLORS.planning,
      },
      {
        name: "Ongoing",
        value: data?.ongoingProjects ?? 0,
        color: STATUS_COLORS.ongoing,
      },
      {
        name: "Completed",
        value: data?.completedProjects ?? 0,
        color: STATUS_COLORS.completed,
      },
      {
        name: "Cancelled",
        value: data?.cancelledProjects ?? 0,
        color: STATUS_COLORS.cancelled,
      },
    ],
    [data]
  );

  const hasStatusData = statusData.some((s) => s.value > 0);

  const expenseByCategory = useMemo(() => {
    const byCategory: CategorySummary[] =
      summaryQuery.data?.data.byCategory ?? [];
    return byCategory
      .filter((c) => c._id.entryType === "EXPENSE")
      .map((c) => ({
        name: c._id.category || "Uncategorised",
        value: c.total,
        count: c.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [summaryQuery.data?.data.byCategory]);

  const upcomingLeads: Lead[] = followupQuery.data?.data ?? [];

  if (overviewQuery.isLoading) {
    return <DashboardSkeleton />;
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Dashboard
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            High-level overview of CinePanda projects and financials.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <Activity className="h-3.5 w-3.5 text-cine-primary" />
          Live data
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Project Value"
          value={formatINR(data?.totalProjectValue ?? 0)}
          icon={<Briefcase className="h-5 w-5" />}
          tone="primary"
          hint={`${data?.totalProjects ?? 0} projects`}
        />
        <KpiCard
          label="Total Income"
          value={formatINR(totalIncome)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="success"
          hint="All collections"
        />
        <KpiCard
          label="Total Expense"
          value={formatINR(totalExpense)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          tone="danger"
          hint="All outflows"
        />
        <KpiCard
          label="Net Profit"
          value={formatINR(netProfit)}
          icon={
            netProfit >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          tone={netProfit >= 0 ? "success" : "danger"}
          hint={`${profitMargin}% margin`}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Income vs Expense"
          subtitle="Last 6 months"
        >
          {ledgerQuery.isLoading ? (
            <Skeleton className="h-[280px] rounded-lg" />
          ) : hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlySeries}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
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
                <Bar
                  dataKey="income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Income"
                />
                <Bar
                  dataKey="expense"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Expense"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No ledger activity in last 6 months" />
          )}
        </ChartCard>

        <ChartCard
          title="Project Status"
          subtitle={`${data?.totalProjects ?? 0} total`}
          icon={<PieIcon className="h-4 w-4" />}
        >
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No projects yet" />
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Net Profit Trend"
          subtitle="Income minus expense, monthly"
        >
          {ledgerQuery.isLoading ? (
            <Skeleton className="h-[260px] rounded-lg" />
          ) : hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={monthlySeries}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3076A1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3076A1" stopOpacity={0.05} />
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
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3076A1"
                  strokeWidth={2.5}
                  fill="url(#profitFill)"
                  name="Profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No ledger activity yet" />
          )}
        </ChartCard>

        <div className="grid grid-cols-1 gap-4">
          <PendingPaymentsCard
            pending={data?.totalPending ?? 0}
            projectValue={data?.totalProjectValue ?? 0}
          />
          <ProjectMixCard
            planning={data?.planningProjects ?? 0}
            ongoing={data?.ongoingProjects ?? 0}
            completed={data?.completedProjects ?? 0}
            cancelled={data?.cancelledProjects ?? 0}
          />
        </div>
      </div>

      {/* Charts row 3: Expense by Category + Upcoming Leads */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Expense by Category"
          subtitle="Top spending categories"
        >
          {summaryQuery.isLoading ? (
            <Skeleton className="h-[280px] rounded-lg" />
          ) : expenseByCategory.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={expenseByCategory}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  stroke="currentColor"
                  className="text-slate-500"
                  tickFormatter={(v) => formatINRCompact(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="currentColor"
                  className="text-slate-500"
                  width={130}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatINR(Number(value))}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Expense">
                  {expenseByCategory.map((_, i) => (
                    <Cell
                      key={i}
                      fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No expenses recorded yet" />
          )}
        </ChartCard>

        <UpcomingLeadsCard
          leads={upcomingLeads}
          loading={followupQuery.isLoading}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 8,
  color: "#f8fafc",
  fontSize: 12,
  padding: "8px 12px",
};

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

function KpiCard({
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
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {value}
          </p>
          {hint ? (
            <p className={`mt-1 text-xs font-medium ${t.text}`}>{hint}</p>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${t.bg} ${t.text} ${t.ring}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 ${
        className ?? ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
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
        {icon ? (
          <div className="text-slate-400 dark:text-slate-500">{icon}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500">
      <PieIcon className="mb-2 h-8 w-8 opacity-60" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function PendingPaymentsCard({
  pending,
  projectValue,
}: {
  pending: number;
  projectValue: number;
}) {
  const pct =
    projectValue > 0 ? Math.min(100, Math.round((pending / projectValue) * 100)) : 0;
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-500/20 dark:from-amber-500/10 dark:to-slate-900/60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Pending Payments
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {formatINR(pending)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {pct}% of total project value
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
          <Wallet className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/20">
        <div
          className="h-full rounded-full bg-amber-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ProjectMixCard({
  planning,
  ongoing,
  completed,
  cancelled,
}: {
  planning: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}) {
  const rows: {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: Tone;
  }[] = [
    {
      label: "Planning",
      value: planning,
      icon: <Clock className="h-4 w-4" />,
      tone: "primary",
    },
    {
      label: "Ongoing",
      value: ongoing,
      icon: <Activity className="h-4 w-4" />,
      tone: "warning",
    },
    {
      label: "Completed",
      value: completed,
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: "success",
    },
    {
      label: "Cancelled",
      value: cancelled,
      icon: <XCircle className="h-4 w-4" />,
      tone: "danger",
    },
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Project Mix
        </h3>
        <IndianRupee className="h-4 w-4 text-slate-400" />
      </div>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const t = TONES[row.tone];
          return (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${t.bg} ${t.text}`}
                >
                  {row.icon}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {row.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {row.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Upcoming Leads
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Follow-ups in the next 7 days
          </p>
        </div>
        <Link
          href="/leads"
          className="text-xs font-medium text-cine-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <CalendarDays className="mb-2 h-7 w-7 opacity-60" />
          <p className="text-sm">No follow-ups scheduled</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sorted.slice(0, 6).map((lead) => {
            const tone = PRIORITY_TONE[lead.priorityType] ?? "neutral";
            const t = TONES[tone];
            return (
              <li
                key={lead._id}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${t.bg} ${t.text}`}
                >
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {lead.customerName}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${t.bg} ${t.text}`}
                    >
                      {lead.priorityType}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {lead.nextCallTime ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatCallTime(lead.nextCallTime)}
                      </span>
                    ) : null}
                    {lead.contactNumber ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.contactNumber}
                      </span>
                    ) : null}
                    {lead.place ? (
                      <span className="truncate">{lead.place}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[320px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[300px] rounded-xl lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[320px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    </div>
  );
}
