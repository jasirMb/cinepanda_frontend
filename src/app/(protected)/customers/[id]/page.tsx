"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  FileText,
  FolderKanban,
  MapPin,
  Phone,
  ReceiptText,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { fetchCustomerOverview } from "@/lib/api/customers";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhone, telHref } from "@/lib/country-codes";

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const LEAD_BADGE: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  CLOSED_WON:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  CLOSED_LOST: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};
const QUOTE_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};
const PROJECT_BADGE: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  ONGOING: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  ON_HOLD: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const query = useQuery({
    queryKey: ["customer-overview", id],
    queryFn: () => fetchCustomerOverview(id),
    enabled: !!id,
    staleTime: 30_000,
  });
  const data = query.data;

  if (query.isLoading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (query.isError || !data) {
    return (
      <div className="max-w-5xl space-y-3">
        <BackLink />
        <p className="text-sm text-red-500">Customer not found.</p>
      </div>
    );
  }

  const { customer, leads, quotations, projects, totals } = data;

  return (
    <div className="max-w-5xl space-y-4">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cine-primary/10 text-base font-semibold text-cine-primary">
          {customer.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {customer.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />{" "}
              <a
                href={telHref(customer.countryCode, customer.phone)}
                className="hover:text-cine-primary"
              >
                {formatPhone(customer.countryCode, customer.phone)}
              </a>
            </span>
            {customer.place && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {customer.place}
              </span>
            )}
            {customer.email && <span>{customer.email}</span>}
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Quoted" value={inr(totals.quotedValue)} icon={<FileText className="h-4 w-4" />} />
        <Kpi label="Project value" value={inr(totals.projectValue)} icon={<FolderKanban className="h-4 w-4" />} />
        <Kpi label="Income received" value={inr(totals.income)} tone="emerald" icon={<Banknote className="h-4 w-4" />} />
        <Kpi
          label="Net (income − expense)"
          value={inr(totals.net)}
          tone={totals.net >= 0 ? "emerald" : "red"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Leads */}
      <Section title="Leads" icon={<UserPlus className="h-4 w-4" />} count={leads.length}>
        {leads.length === 0 ? (
          <Empty text="No leads linked to this customer." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {leads.map((l) => (
              <li key={l._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/leads`} className="font-medium text-slate-900 hover:text-cine-primary dark:text-slate-50">
                    {l.customerName}
                  </Link>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {[l.leadSource, l.requirement].filter(Boolean).join(" · ") || fmtDate(l.createdAt)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEAD_BADGE[l.status] ?? LEAD_BADGE.OPEN}`}>
                  {l.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Quotations */}
      <Section title="Quotations" icon={<ReceiptText className="h-4 w-4" />} count={quotations.length}>
        {quotations.length === 0 ? (
          <Empty text="No quotations yet." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {quotations.map((q) => (
              <li key={q._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/quotations/${q._id}`} className="font-medium text-slate-900 hover:text-cine-primary dark:text-slate-50">
                    Quotation · {fmtDate(q.quotationDate)}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {q.sectionCount} option{q.sectionCount === 1 ? "" : "s"}
                    {q.projectId ? " · project created" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {inr(q.value)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${QUOTE_BADGE[q.status]}`}>
                    {q.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Projects */}
      <Section title="Projects" icon={<FolderKanban className="h-4 w-4" />} count={projects.length}>
        {projects.length === 0 ? (
          <Empty text="No projects yet." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {projects.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/projects/${p._id}`} className="font-medium text-slate-900 hover:text-cine-primary dark:text-slate-50">
                    {p.clientName} — {p.serviceType}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {fmtDate(p.startDate)} → {fmtDate(p.expectedCompletionDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {inr(p.projectValue)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROJECT_BADGE[p.status] ?? PROJECT_BADGE.PLANNING}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/customers"
      className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-cine-primary dark:text-slate-400"
    >
      <ArrowLeft className="h-4 w-4" /> Back to customers
    </Link>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "slate" | "emerald" | "red";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "red"
        ? "text-red-600 dark:text-red-300"
        : "text-slate-900 dark:text-slate-50";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{text}</p>;
}
