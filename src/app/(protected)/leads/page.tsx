"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Phone,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import { leadsKeys, useFollowupLeads, useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/tables/LeadsTable";
import { Button } from "@/components/ui/button";
import { type Lead, updateLeadStatus } from "@/lib/api/leads";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";

type LeadCategory = "overdue" | "today" | "upcoming" | "unscheduled";

function humanize(value?: string) {
  if (!value) return "Not set";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateLabel(value?: string | null) {
  if (!value) return "No follow-up set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";
  return `${parsed.toLocaleDateString()} at ${parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function getCategory(lead: Lead): LeadCategory {
  if (lead.nextCallTime) {
    const next = new Date(lead.nextCallTime);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (next < startOfToday) return "overdue";
    if (next >= startOfToday && next <= endOfToday) return "today";
    return "upcoming";
  }
  return "unscheduled";
}

function priorityWeight(priority?: string) {
  switch (priority) {
    case "URGENT_BUILD":
      return 0;
    case "ENQUIRED":
      return 1;
    case "TAKES_TIME":
      return 2;
    default:
      return 3;
  }
}

function categoryStripe(category: LeadCategory) {
  switch (category) {
    case "overdue":
      return "bg-red-500";
    case "today":
      return "bg-amber-500";
    case "upcoming":
      return "bg-emerald-500";
    default:
      return "bg-slate-300 dark:bg-slate-600";
  }
}

function categoryLabel(category: LeadCategory) {
  switch (category) {
    case "overdue":
      return "Overdue";
    case "today":
      return "Due today";
    case "upcoming":
      return "Upcoming";
    default:
      return "Unscheduled";
  }
}

function categoryBadgeClass(category: LeadCategory) {
  switch (category) {
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "today":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "upcoming":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300";
  }
}

function statusBadgeClass(status?: string) {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case "CLOSED_WON":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "CLOSED_LOST":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "ON_HOLD":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "FOLLOW_UP":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200";
  }
}

function priorityBadgeClass(priority?: string) {
  switch (priority) {
    case "URGENT_BUILD":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "TAKES_TIME":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "ENQUIRED":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200";
  }
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function avatarColor(seed: string) {
  const palette = [
    "bg-cine-primary/15 text-cine-primary",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priorityType: "",
    leadSource: "",
    startDate: "",
    endDate: "",
    sort: "nextCallTime_asc" as
      | "createdAt_desc"
      | "createdAt_asc"
      | "leadDate_desc"
      | "leadDate_asc"
      | "lastUpdate_desc"
      | "lastUpdate_asc"
      | "nextCallTime_desc"
      | "nextCallTime_asc"
  });

  const todayDate = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  const statusOptions = [
    { label: "All statuses", value: "" },
    { label: "Open", value: "OPEN" },
    { label: "Closed Won", value: "CLOSED_WON" },
    { label: "Closed Lost", value: "CLOSED_LOST" },
    { label: "On Hold", value: "ON_HOLD" },
    { label: "Follow up", value: "FOLLOW_UP" }
  ];

  const priorityTypeOptions = [
    { label: "All priorities", value: "" },
    { label: "Enquired", value: "ENQUIRED" },
    { label: "Takes time", value: "TAKES_TIME" },
    { label: "Urgent building", value: "URGENT_BUILD" }
  ];

  const leadSourceOptions = [
    { label: "All sources", value: "" },
    { label: "Meta", value: "META" },
    { label: "Youtube", value: "YOUTUBE" },
    { label: "Walk-in", value: "WALK_IN" },
    { label: "Referral", value: "REFERRAL" },
    { label: "Other", value: "OTHER" }
  ];

  const followupQuery = useFollowupLeads({ date: todayDate });

  const leadsParams = useMemo(
    () => ({
      page: 1,
      limit: 50,
      search: filters.search || undefined,
      status: filters.status || undefined,
      priorityType: filters.priorityType || undefined,
      leadSource: filters.leadSource || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    }),
    [filters]
  );

  const leadsQuery = useLeads(leadsParams);

  useEffect(() => {
    const created = searchParams.get("created");
    const error = searchParams.get("error");
    const updated = searchParams.get("updated");

    if (created === "1") {
      toast.success("Lead created successfully");
      router.replace("/leads");
    } else if (updated === "1") {
      toast.success("Lead updated successfully");
      router.replace("/leads");
    } else if (typeof error === "string" && error.trim().length > 0) {
      toast.error(decodeURIComponent(error));
      router.replace("/leads");
    }
  }, [router, searchParams]);

  const attentionLeads = followupQuery.data?.data ?? [];
  const allLeadsRaw = leadsQuery.data?.data ?? [];
  const sortedAllLeads = useMemo(() => {
    const [field, dir] = filters.sort.split("_") as [keyof Lead | string, "asc" | "desc"];
    const factor = dir === "asc" ? 1 : -1;
    return [...allLeadsRaw].sort((a, b) => {
      const aVal = (a as any)[field];
      const bVal = (b as any)[field];

      const aDate = aVal ? new Date(aVal).getTime() : dir === "asc" ? Infinity : -Infinity;
      const bDate = bVal ? new Date(bVal).getTime() : dir === "asc" ? Infinity : -Infinity;

      return (aDate - bDate) * factor;
    });
  }, [allLeadsRaw, filters.sort]);

  const allLeads = sortedAllLeads;

  const stats = useMemo(() => {
    const total = allLeadsRaw.length;
    let open = 0;
    let won = 0;
    let lost = 0;
    let onHold = 0;
    let urgent = 0;
    let overdue = 0;
    let dueToday = 0;
    for (const lead of allLeadsRaw) {
      if (lead.status === "OPEN") open++;
      else if (lead.status === "CLOSED_WON") won++;
      else if (lead.status === "CLOSED_LOST") lost++;
      else if (lead.status === "ON_HOLD") onHold++;
      if (lead.priorityType === "URGENT_BUILD") urgent++;
      const cat = getCategory(lead);
      if (cat === "overdue") overdue++;
      else if (cat === "today") dueToday++;
    }
    const decided = won + lost;
    const conversion = decided > 0 ? Math.round((won / decided) * 100) : 0;
    return { total, open, won, lost, onHold, urgent, overdue, dueToday, conversion };
  }, [allLeadsRaw]);

  const attentionIds = useMemo(
    () => new Set(attentionLeads.map((lead) => lead._id)),
    [attentionLeads]
  );
  const leads = useMemo(
    () => allLeads.filter((lead) => !attentionIds.has(lead._id)),
    [allLeads, attentionIds]
  );
  const grouped = useMemo(() => {
    const buckets: Record<LeadCategory, Lead[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      unscheduled: []
    };

    leads.forEach((lead) => {
      const category = getCategory(lead);
      buckets[category].push(lead);
    });

    const byNextCall = (a: Lead, b: Lead) => {
      const aDate = a.nextCallTime ? new Date(a.nextCallTime).getTime() : Infinity;
      const bDate = b.nextCallTime ? new Date(b.nextCallTime).getTime() : Infinity;
      return aDate - bDate;
    };

    buckets.overdue.sort(byNextCall);
    buckets.today.sort(byNextCall);
    buckets.upcoming.sort(byNextCall);
    buckets.unscheduled.sort(
      (a, b) => priorityWeight(a.priorityType) - priorityWeight(b.priorityType)
    );

    return buckets;
  }, [leads]);

  function LeadCard({ lead }: { lead: Lead }) {
    const category = getCategory(lead);
    const [statusValue, setStatusValue] = useState(lead.status);
    const statusMutation = useMutation({
      mutationFn: (nextStatus: string) =>
        updateLeadStatus(lead._id, { status: nextStatus, statusDescription: lead.statusDescription }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: leadsKeys.all });
        toast.success("Status updated");
      },
      onError: () => {
        toast.error("Failed to update status");
        setStatusValue(lead.status);
      }
    });

    return (
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div
          className={`absolute left-0 top-0 h-full w-1 ${categoryStripe(category)}`}
          aria-hidden
        />

        <div className="flex flex-1 flex-col gap-3 p-4 pl-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                lead.customerName
              )}`}
            >
              {getInitials(lead.customerName)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                {lead.customerName}
              </h3>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.place}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="truncate">{humanize(lead.leadSource)}</span>
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryBadgeClass(
                category
              )}`}
            >
              {categoryLabel(category)}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
                lead.status
              )}`}
            >
              {humanize(lead.status)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${priorityBadgeClass(
                lead.priorityType
              )}`}
            >
              {humanize(lead.priorityType)}
            </span>
          </div>

          {/* Info rows */}
          <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{lead.contactNumber}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{formatDateLabel(lead.nextCallTime)}</span>
            </p>
            {lead.requirement && (
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                {lead.requirement}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Select
              value={statusValue || "__all__"}
              onValueChange={(v) =>
                setStatusValue(v === "__all__" ? "" : v)
              }
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem
                    key={opt.value || "__all__"}
                    value={opt.value || "__all__"}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={
                statusMutation.isPending || statusValue === lead.status
              }
              onClick={() => statusMutation.mutate(statusValue)}
            >
              {statusMutation.isPending ? "..." : "Save"}
            </Button>
            <Link
              href={`/leads/new?edit=${lead._id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = followupQuery.isLoading || leadsQuery.isLoading;
  const isError = followupQuery.isError || leadsQuery.isError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-red-400">
        Failed to load leads. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Leads
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage incoming leads from all CinePanda channels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Priority cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table view
          </Button>
          <Button asChild>
            <Link href="/leads/new">Add lead</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Users}
          label="Total Leads"
          value={stats.total}
          tone="slate"
        />
        <StatCard
          icon={Clock}
          label="Open"
          value={stats.open}
          tone="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Won"
          value={stats.won}
          tone="emerald"
        />
        <StatCard
          icon={XCircle}
          label="Lost"
          value={stats.lost}
          tone="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion"
          value={`${stats.conversion}%`}
          tone="violet"
          hint={`${stats.won} won / ${stats.lost} lost`}
        />
        <StatCard
          icon={AlertCircle}
          label="Needs Attention"
          value={stats.overdue + stats.dueToday}
          tone={stats.overdue > 0 ? "red" : "amber"}
          hint={`${stats.overdue} overdue · ${stats.dueToday} today`}
        />
      </div>

      {viewMode === "table" && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder="Search name, place, contact"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <Select value={filters.status || "__all__"} onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v === "__all__" ? "" : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.priorityType || "__all__"} onValueChange={(v) => setFilters((prev) => ({ ...prev, priorityType: v === "__all__" ? "" : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              {priorityTypeOptions.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.leadSource || "__all__"} onValueChange={(v) => setFilters((prev) => ({ ...prev, leadSource: v === "__all__" ? "" : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              {leadSourceOptions.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker
            value={filters.startDate}
            onChange={(v) => setFilters((prev) => ({ ...prev, startDate: v }))}
            placeholder="Start date"
          />
          <DatePicker
            value={filters.endDate}
            onChange={(v) => setFilters((prev) => ({ ...prev, endDate: v }))}
            placeholder="End date"
          />
          <Select value={filters.sort} onValueChange={(v) => setFilters((prev) => ({ ...prev, sort: v as typeof prev.sort }))}>
            <SelectTrigger className="lg:col-span-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nextCallTime_asc">Next call (soonest)</SelectItem>
              <SelectItem value="nextCallTime_desc">Next call (latest)</SelectItem>
              <SelectItem value="createdAt_desc">Created (newest)</SelectItem>
              <SelectItem value="createdAt_asc">Created (oldest)</SelectItem>
              <SelectItem value="leadDate_desc">Lead date (newest)</SelectItem>
              <SelectItem value="leadDate_asc">Lead date (oldest)</SelectItem>
              <SelectItem value="lastUpdate_desc">Last update (newest)</SelectItem>
              <SelectItem value="lastUpdate_asc">Last update (oldest)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="md:col-span-1 lg:col-span-1"
            onClick={() =>
              setFilters({
                search: "",
                status: "",
                priorityType: "",
                leadSource: "",
                startDate: "",
                endDate: "",
                sort: "nextCallTime_asc"
              })
            }
          >
            Reset filters
          </Button>
        </div>
      )}

      {viewMode === "table" ? (
        <LeadsTable leads={allLeads} />
      ) : (
        <div className="space-y-10">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Needs attention
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Overdue and due-today follow-ups are shown first.
                </p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                {attentionLeads.length} lead{attentionLeads.length === 1 ? "" : "s"}
              </span>
            </div>
            {attentionLeads.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Nothing urgent right now. Keep nurturing your leads!
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {attentionLeads.map((lead) => (
                  <LeadCard key={lead._id} lead={lead} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Upcoming follow-ups
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Ordered by the next call time so you can glide through the day.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                {grouped.upcoming.length} scheduled
              </span>
            </div>
            {grouped.upcoming.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No upcoming follow-ups scheduled.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {grouped.upcoming.map((lead) => (
                  <LeadCard key={lead._id} lead={lead} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Unscheduled
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Leads without a next call time, sorted by priority.
                </p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800/70 dark:text-slate-100">
                {grouped.unscheduled.length} waiting
              </span>
            </div>
            {grouped.unscheduled.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All leads have a follow-up plan. Nicely done.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {grouped.unscheduled.map((lead) => (
                  <LeadCard key={lead._id} lead={lead} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

    </div>
  );
}

type StatTone = "slate" | "blue" | "emerald" | "red" | "amber" | "violet";

const STAT_TONES: Record<StatTone, { icon: string; ring: string }> = {
  slate: {
    icon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-800",
  },
  blue: {
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
    ring: "ring-blue-100 dark:ring-blue-950/40",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    ring: "ring-emerald-100 dark:ring-emerald-950/40",
  },
  red: {
    icon: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300",
    ring: "ring-red-100 dark:ring-red-950/40",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    ring: "ring-amber-100 dark:ring-amber-950/40",
  },
  violet: {
    icon: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
    ring: "ring-violet-100 dark:ring-violet-950/40",
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: StatTone;
  hint?: string;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${t.icon} ${t.ring}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-xl font-bold leading-tight text-slate-900 dark:text-slate-50">
          {value}
        </p>
        {hint && (
          <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
