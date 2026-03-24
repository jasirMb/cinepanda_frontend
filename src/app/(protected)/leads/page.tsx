"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { leadsKeys, useFollowupLeads, useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/tables/LeadsTable";
import { Button } from "@/components/ui/button";
import { type Lead, updateLeadStatus } from "@/lib/api/leads";
import { Input } from "@/components/ui/input";

type ToastVariant = "success" | "error";
type LeadCategory = "overdue" | "today" | "upcoming" | "unscheduled";

interface ToastState {
  open: boolean;
  message: string;
  variant: ToastVariant;
}

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

function categoryTone(category: LeadCategory) {
  switch (category) {
    case "overdue":
      return "border-red-200/80 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40";
    case "today":
      return "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30";
    case "upcoming":
      return "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30";
    default:
      return "border-slate-200/80 bg-white dark:border-slate-800/70 dark:bg-slate-900/60";
  }
}

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    variant: "success"
  });
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
      setToast({
        open: true,
        message: "Lead created successfully",
        variant: "success"
      });
      router.replace("/leads");
    } else if (updated === "1") {
      setToast({
        open: true,
        message: "Lead updated successfully",
        variant: "success"
      });
      router.replace("/leads");
    } else if (typeof error === "string" && error.trim().length > 0) {
      setToast({
        open: true,
        message: decodeURIComponent(error),
        variant: "error"
      });
      router.replace("/leads");
    }
  }, [router, searchParams]);

  function closeToast() {
    setToast((prev) => ({ ...prev, open: false }));
  }

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
        setToast({
          open: true,
          message: "Status updated",
          variant: "success"
        });
      },
      onError: () => {
        setToast({
          open: true,
          message: "Failed to update status",
          variant: "error"
        });
        setStatusValue(lead.status);
      }
    });

    return (
      <div
        className={`flex h-full flex-col justify-between rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${categoryTone(
          category
        )}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {humanize(lead.leadSource)}
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {lead.customerName}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{lead.place}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-50/10 dark:text-slate-100">
              {humanize(lead.status)}
            </span>
            <span className="rounded-full bg-cine-primary/10 px-3 py-1 text-xs font-semibold text-cine-primary">
              {humanize(lead.priorityType)}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <p>
            <span className="font-semibold">Next follow-up:</span>{" "}
            <span className="text-slate-900 dark:text-slate-50">
              {formatDateLabel(lead.nextCallTime)}
            </span>
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Requirement:</span>{" "}
            <span className="break-words">{lead.requirement || "Not provided"}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last updated {formatDateLabel(lead.lastUpdate)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/70">
            Contact: {lead.contactNumber}
          </span>
          <span className="rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/70">
            Created {new Date(lead.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <label className="text-slate-500">Status</label>
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              disabled={statusMutation.isPending}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending || statusValue === lead.status}
              onClick={() => statusMutation.mutate(statusValue)}
            >
              {statusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          <Link
            href={`/leads/new?edit=${lead._id}`}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cine-primary"
          >
            Edit
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = followupQuery.isLoading || leadsQuery.isLoading;
  const isError = followupQuery.isError || leadsQuery.isError;

  if (isLoading) {
    return (
      <p className="text-slate-700 dark:text-slate-300">Loading leads...</p>
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

      {viewMode === "table" && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder="Search name, place, contact"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            value={filters.priorityType}
            onChange={(e) => setFilters((prev) => ({ ...prev, priorityType: e.target.value }))}
          >
            {priorityTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            value={filters.leadSource}
            onChange={(e) => setFilters((prev) => ({ ...prev, leadSource: e.target.value }))}
          >
            {leadSourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            placeholder="Start date"
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            placeholder="End date"
          />
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 lg:col-span-2"
            value={filters.sort}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, sort: e.target.value as typeof prev.sort }))
            }
          >
            <option value="nextCallTime_asc">Next call (soonest)</option>
            <option value="nextCallTime_desc">Next call (latest)</option>
            <option value="createdAt_desc">Created (newest)</option>
            <option value="createdAt_asc">Created (oldest)</option>
            <option value="leadDate_desc">Lead date (newest)</option>
            <option value="leadDate_asc">Lead date (oldest)</option>
            <option value="lastUpdate_desc">Last update (newest)</option>
            <option value="lastUpdate_asc">Last update (oldest)</option>
          </select>
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

      {toast.open && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-sm dark:border-slate-700">
          <div
            className={
              toast.variant === "success"
                ? "border-l-4 border-emerald-500 pl-3"
                : "border-l-4 border-red-500 pl-3"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={
                  toast.variant === "success"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400"
                }
              >
                {toast.message}
              </p>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                onClick={closeToast}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
