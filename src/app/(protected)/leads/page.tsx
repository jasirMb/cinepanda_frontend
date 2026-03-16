"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/tables/LeadsTable";
import { Button } from "@/components/ui/button";
import { type Lead } from "@/lib/api/leads";

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
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    variant: "success"
  });
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const { data, isLoading, isError } = useLeads({ page: 1, limit: 20 });

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

  const leads = data?.data ?? [];

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

  const attentionLeads = [...grouped.overdue, ...grouped.today];

  function LeadCard({ lead }: { lead: Lead }) {
    const category = getCategory(lead);
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

      {viewMode === "table" ? (
        <LeadsTable leads={leads} />
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
