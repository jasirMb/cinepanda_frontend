"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPin,
  Lock,
  Pencil,
  Phone,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import { leadsKeys, useLeads, useLeadStatuses, useLeadSources, usePriorityTypes } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/tables/LeadsTable";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  type Lead,
  updateLeadStatus,
  convertLeadToCustomer,
  deleteLead,
} from "@/lib/api/leads";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";

type LeadCategory = "overdue" | "today" | "upcoming" | "unscheduled";

function humanize(value?: string | null) {
  if (!value) return "Not set";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const IST = "Asia/Kolkata";

function formatDateLabel(value?: string | null) {
  if (!value) return "No follow-up set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";
  return parsed.toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getISTDayBounds() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowUTC = Date.now();
  const istNow = new Date(nowUTC + IST_OFFSET_MS);
  const midnight = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  return {
    startOfToday: new Date(midnight - IST_OFFSET_MS),
    endOfToday: new Date(midnight - IST_OFFSET_MS + 24 * 60 * 60 * 1000 - 1),
  };
}

function getCategory(lead: Lead): LeadCategory {
  if (lead.nextCallTime) {
    const next = new Date(lead.nextCallTime);
    const { startOfToday, endOfToday } = getISTDayBounds();
    if (next < startOfToday) return "overdue";
    if (next >= startOfToday && next <= endOfToday) return "today";
    return "upcoming";
  }
  return "unscheduled";
}

function priorityWeight(priority?: string | null) {
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
    case "NEW_LEAD":
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

function priorityBadgeClass(priority?: string | null) {
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

function leadAge(leadDate?: string | null, createdAt?: string): string {
  const from = leadDate ? new Date(leadDate) : createdAt ? new Date(createdAt) : new Date();
  const days = Math.floor((Date.now() - from.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
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
    "from-violet-500 to-fuchsia-500",
    "from-sky-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-cyan-500 to-blue-500",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // View mode lives in the URL (?view=list&list=table) rather than in component
  // state, so opening a lead and coming back returns to the view you left —
  // local state would remount as "cards" every time.
  const viewMode: "cards" | "list" =
    searchParams.get("view") === "list" ? "list" : "cards";
  const listMode: "grid" | "table" =
    searchParams.get("list") === "table" ? "table" : "grid";

  function setViewParam(key: string, value: string, fallback: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === fallback) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : "/leads", { scroll: false });
  }
  const setViewMode = (v: "cards" | "list") => setViewParam("view", v, "cards");
  const setListMode = (v: "grid" | "table") => setViewParam("list", v, "grid");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const CARDS_SECTION_LIMIT = 8;
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      toast.success("Lead moved to trash");
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error ?? "Failed to delete lead");
    },
  });

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }
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

  // Debounced search — type freely, the query only updates after a short pause.
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const statusEnum = useLeadStatuses().data ?? [];
  const statusOptions = [{ label: "All statuses", value: "" }, ...statusEnum];

  const priorityEnum = usePriorityTypes().data ?? [];
  const priorityTypeOptions = [{ label: "All priorities", value: "" }, ...priorityEnum];

  const sourceEnum = useLeadSources().data ?? [];
  const leadSourceOptions = [{ label: "All sources", value: "" }, ...sourceEnum];

  const LIST_LIMIT = 20;
  const [listPage, setListPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => { setListPage(1); }, [filters]);

  // Cards view: fetch page 1 + page 2 in parallel (100 each) → up to 200 leads
  const cardsBase = useMemo(
    () => ({
      limit: 100,
      search: filters.search || undefined,
      status: filters.status || undefined,
      priorityType: filters.priorityType || undefined,
      leadSource: filters.leadSource || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    }),
    [filters]
  );
  const cardsPage1Params = useMemo(() => ({ ...cardsBase, page: 1 }), [cardsBase]);
  const cardsPage2Params = useMemo(() => ({ ...cardsBase, page: 2 }), [cardsBase]);

  const leadsQuery  = useLeads(cardsPage1Params);
  const leadsQuery2 = useLeads(cardsPage2Params);

  // List view: real backend pagination
  const listParams = useMemo(
    () => ({
      page: listPage,
      limit: LIST_LIMIT,
      search: filters.search || undefined,
      status: filters.status || undefined,
      priorityType: filters.priorityType || undefined,
      leadSource: filters.leadSource || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    }),
    [filters, listPage]
  );

  const listQuery = useLeads(listParams);

  useEffect(() => {
    const created = searchParams.get("created");
    const error = searchParams.get("error");
    const updated = searchParams.get("updated");

    // Strip only the one-shot toast flags — keep view/list so clearing the
    // notice doesn't bounce the user back to the default cards view.
    const clearFlags = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("created");
      params.delete("updated");
      params.delete("error");
      const qs = params.toString();
      router.replace(qs ? `/leads?${qs}` : "/leads", { scroll: false });
    };

    if (created === "1") {
      toast.success("Lead created successfully");
      clearFlags();
    } else if (updated === "1") {
      toast.success("Lead updated successfully");
      clearFlags();
    } else if (typeof error === "string" && error.trim().length > 0) {
      toast.error(decodeURIComponent(error));
      clearFlags();
    }
  }, [router, searchParams]);

  const cardsTotal = leadsQuery.data?.pagination?.total ?? 0;
  const allLeadsRaw = useMemo(
    () => [...(leadsQuery.data?.data ?? []), ...(leadsQuery2.data?.data ?? [])],
    [leadsQuery.data, leadsQuery2.data]
  );
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
      if (lead.status === "CLOSED_WON") won++;
      else if (lead.status === "CLOSED_LOST") lost++;
      else if (lead.status === "ON_HOLD") onHold++;
      else open++; // any active pipeline status (New Lead, Contacted, …)
      if (lead.priorityType === "URGENT_BUILD") urgent++;
      const cat = getCategory(lead);
      if (cat === "overdue") overdue++;
      else if (cat === "today") dueToday++;
    }
    const decided = won + lost;
    const conversion = decided > 0 ? Math.round((won / decided) * 100) : 0;
    return { total, open, won, lost, onHold, urgent, overdue, dueToday, conversion };
  }, [allLeadsRaw]);

  // Categorise EVERY lead purely by its schedule (not priority), so leads of
  // any priority type (Takes Time included) appear in the right section.
  const grouped = useMemo(() => {
    const buckets: Record<LeadCategory, Lead[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      unscheduled: []
    };

    // Only leads that still need action — a Closed Won/Lost lead is resolved and
    // shouldn't sit in Needs attention / Upcoming / Unscheduled.
    allLeads
      .filter(
        (lead) =>
          lead.status !== "CLOSED_WON" && lead.status !== "CLOSED_LOST"
      )
      .forEach((lead) => {
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
  }, [allLeads]);

  // "Needs attention" = overdue + due-today (any priority), most overdue first.
  const attentionLeads = useMemo(
    () => [...grouped.overdue, ...grouped.today],
    [grouped]
  );

  // Won leads that still need a customer (not yet linked/converted).
  const toConvertLeads = useMemo(
    () => allLeads.filter((l) => l.status === "CLOSED_WON" && !l.customerId),
    [allLeads]
  );

  function LeadCard({ lead, compact = false }: { lead: Lead; compact?: boolean }) {
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

    const [convertOpen, setConvertOpen] = useState(false);
    const [cPlace, setCPlace] = useState(lead.place ?? "");
    const [cEmail, setCEmail] = useState("");
    const [cNotes, setCNotes] = useState("");
    const convertMutation = useMutation({
      mutationFn: () =>
        convertLeadToCustomer(lead._id, {
          place: cPlace.trim() || undefined,
          email: cEmail.trim() || undefined,
          notes: cNotes.trim() || undefined,
        }),
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: leadsKeys.all });
        setConvertOpen(false);
        toast.success(
          res.merged
            ? `Linked to existing customer "${res.customer.name}"`
            : `Customer "${res.customer.name}" created`
        );
      },
      onError: (e: any) =>
        toast.error(e?.response?.data?.error ?? "Failed to convert"),
    });

    return (
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        {!compact && (
          <div
            className={`absolute left-0 top-0 h-full w-1 ${categoryStripe(category)}`}
            aria-hidden
          />
        )}

        <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-3" : "gap-3 p-4 pl-5"}`}>
          {/* Header */}
          <div className="flex items-start gap-2.5">
            <div
              className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${compact ? "h-8 w-8 text-[11px]" : "h-11 w-11 text-sm"} ${avatarColor(lead.customerName)}`}
            >
              {getInitials(lead.customerName)}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/leads/${lead._id}`}
                className={`block truncate font-semibold text-slate-900 hover:text-cine-primary dark:text-slate-50 ${compact ? "text-sm" : "text-base"}`}
              >
                {lead.customerName}
              </Link>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.place}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="truncate">{humanize(lead.leadSource)}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="shrink-0 font-medium text-slate-400 dark:text-slate-500">
                  {leadAge(lead.leadDate, lead.createdAt)}
                </span>
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
          <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{lead.contactNumber}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="text-slate-400">Next call:</span>
              <span>{formatDateLabel(lead.nextCallTime)}</span>
            </p>
            {!compact && lead.requirement && (
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                {lead.requirement}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className={`mt-auto flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 ${compact ? "pt-2" : "pt-3"}`}>
            <Select
              value={statusValue || "__all__"}
              onValueChange={(v) => setStatusValue(v === "__all__" ? "" : v)}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="h-7 flex-1 min-w-0 px-2 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              title="Save status"
              aria-label="Save status"
              disabled={statusMutation.isPending || statusValue === lead.status}
              onClick={() => statusMutation.mutate(statusValue)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <Link
              href={`/leads/${lead._id}`}
              title="View lead"
              aria-label="View lead"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/leads/new?edit=${lead._id}`}
              title="Edit lead"
              aria-label="Edit lead"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            {lead.locked ? (
              lead.lockHref ? (
                <Link
                  href={lead.lockHref}
                  title={`${lead.lockReason ?? "Locked"} — open it`}
                  aria-label={`${lead.lockReason ?? "Locked"} — open it`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <Lock className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span
                  title={lead.lockReason ?? "Linked — can't be deleted"}
                  aria-label={lead.lockReason ?? "Locked"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <Lock className="h-3.5 w-3.5" />
                </span>
              )
            ) : (
              <button
                type="button"
                title="Delete lead"
                onClick={() => handleDelete(lead._id)}
                aria-label="Delete lead"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Won lead → customer */}
          {lead.status === "CLOSED_WON" &&
            (() => {
              const customerId =
                lead.customerId && typeof lead.customerId === "object"
                  ? lead.customerId._id
                  : (lead.customerId as string | null | undefined);
              return customerId ? (
                <Link
                  href={`/customers/${customerId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cine-primary hover:underline"
                >
                  <UserCheck className="h-3.5 w-3.5" /> View customer
                </Link>
              ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 self-start text-xs"
                onClick={() => setConvertOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" /> Convert to customer
              </Button>
              );
            })()}
        </div>

        {/* Convert dialog */}
        <Dialog
          open={convertOpen}
          onClose={() => setConvertOpen(false)}
          className="w-full max-w-md"
        >
          <div className="space-y-3 p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Convert to customer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Creates or links a customer for{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {lead.customerName}
              </span>{" "}
              · {lead.contactNumber}. An existing customer with the same name &amp;
              phone is reused (no duplicate).
            </p>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Place *
              <Input
                value={cPlace}
                onChange={(e) => setCPlace(e.target.value)}
                placeholder="Customer place"
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Email
              <Input
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notes
              <Input
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                className="mt-1"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConvertOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={convertMutation.isPending}
                onClick={() => {
                  if (!cPlace.trim()) {
                    toast.error("Place is required");
                    return;
                  }
                  convertMutation.mutate();
                }}
              >
                {convertMutation.isPending ? "Converting…" : "Convert"}
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  const isLoading = leadsQuery.isLoading || leadsQuery2.isLoading;
  const isError = leadsQuery.isError;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Leads
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage incoming leads from all Cinepanda channels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-cine-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Priority cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-cine-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Leads list
            </button>
          </div>
          <Button asChild>
            <Link href="/leads/new">Add lead</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
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

      {viewMode === "list" && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder="Search name, place, contact, requirement"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Combobox
            options={[...statusOptions].sort((a, b) => a.label.localeCompare(b.label))}
            value={filters.status}
            onChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
            placeholder="All statuses"
            clearable
            clearLabel="All statuses"
          />
          <Combobox
            options={[...priorityTypeOptions].sort((a, b) => a.label.localeCompare(b.label))}
            value={filters.priorityType}
            onChange={(v) => setFilters((prev) => ({ ...prev, priorityType: v }))}
            placeholder="All priorities"
            clearable
            clearLabel="All priorities"
          />
          <Combobox
            options={[...leadSourceOptions].sort((a, b) => a.label.localeCompare(b.label))}
            value={filters.leadSource}
            onChange={(v) => setFilters((prev) => ({ ...prev, leadSource: v }))}
            placeholder="All sources"
            clearable
            clearLabel="All sources"
          />
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

      {viewMode === "list" ? (() => {
        const listLeads = listQuery.data?.data ?? [];
        const listTotal = listQuery.data?.pagination?.total ?? 0;
        const totalPages = Math.ceil(listTotal / LIST_LIMIT);

        return (
        <div className="space-y-3">
          {/* Grid / Table sub-toggle */}
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {listQuery.isFetching
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                : `${listTotal} lead${listTotal === 1 ? "" : "s"}`}
            </p>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setListMode("grid")}
                title="Grid view"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  listMode === "grid"
                    ? "bg-cine-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setListMode("table")}
                title="Table view"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  listMode === "table"
                    ? "bg-cine-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          </div>

          {listQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : listLeads.length === 0 && !listQuery.isFetching ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              No leads found. Try adjusting your filters.
            </div>
          ) : (
            <div className={`relative transition-opacity duration-200 ${listQuery.isFetching ? "pointer-events-none opacity-50" : "opacity-100"}`}>
              {listQuery.isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-md dark:border-slate-700 dark:bg-slate-900">
                    <Loader2 className="h-4 w-4 animate-spin text-cine-primary" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Updating…</span>
                  </div>
                </div>
              )}
              {listMode === "table" ? (
                <LeadsTable leads={listLeads} onDelete={handleDelete} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {listLeads.map((lead) => (
                    <LeadCard key={lead._id} lead={lead} compact />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {listPage} of {totalPages} · {listTotal} total
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={listPage <= 1}
                  onClick={() => setListPage(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={listPage <= 1}
                  onClick={() => setListPage((p) => p - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (listPage <= 3) {
                    page = i + 1;
                  } else if (listPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = listPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setListPage(page)}
                      className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-medium transition ${
                        page === listPage
                          ? "border-cine-primary bg-cine-primary text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={listPage >= totalPages}
                  onClick={() => setListPage((p) => p + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  ›
                </button>
                <button
                  type="button"
                  disabled={listPage >= totalPages}
                  onClick={() => setListPage(totalPages)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
        );
      })() : (
        <div className="space-y-10">
          {attentionLeads.length > 0 && (
            <SectionCards
              sectionKey="attention"
              leads={attentionLeads}
              title="Needs attention"
              subtitle="Overdue and due-today follow-ups are shown first."
              badge={`${attentionLeads.length} lead${attentionLeads.length === 1 ? "" : "s"}`}
              badgeClass="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
              expanded={!!expandedSections["attention"]}
              onToggle={() => toggleSection("attention")}
              limit={CARDS_SECTION_LIMIT}
              LeadCard={LeadCard}
            />
          )}

          {grouped.upcoming.length > 0 && (
            <SectionCards
              sectionKey="upcoming"
              leads={grouped.upcoming}
              title="Upcoming follow-ups"
              subtitle="Ordered by the next call time so you can glide through the day."
              badge={`${grouped.upcoming.length} scheduled`}
              badgeClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
              expanded={!!expandedSections["upcoming"]}
              onToggle={() => toggleSection("upcoming")}
              limit={CARDS_SECTION_LIMIT}
              LeadCard={LeadCard}
            />
          )}

          {grouped.unscheduled.length > 0 && (
            <SectionCards
              sectionKey="unscheduled"
              leads={grouped.unscheduled}
              title="Unscheduled"
              subtitle="Leads without a next call time, sorted by priority."
              badge={`${grouped.unscheduled.length} waiting`}
              badgeClass="bg-slate-200 text-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
              expanded={!!expandedSections["unscheduled"]}
              onToggle={() => toggleSection("unscheduled")}
              limit={CARDS_SECTION_LIMIT}
              LeadCard={LeadCard}
            />
          )}

          {toConvertLeads.length > 0 && (
            <SectionCards
              sectionKey="toconvert"
              leads={toConvertLeads}
              title="To convert"
              subtitle="Won leads not yet linked to a customer."
              badge={`${toConvertLeads.length} to convert`}
              badgeClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
              expanded={!!expandedSections["toconvert"]}
              onToggle={() => toggleSection("toconvert")}
              limit={CARDS_SECTION_LIMIT}
              LeadCard={LeadCard}
            />
          )}

          {attentionLeads.length === 0 &&
            grouped.upcoming.length === 0 &&
            grouped.unscheduled.length === 0 &&
            toConvertLeads.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                No leads to show. Add a lead or adjust your filters.
              </div>
            )}

          {cardsTotal > 200 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <span className="text-base">⚠️</span>
              <span>
                Showing 200 of <strong>{cardsTotal}</strong> leads. Switch to{" "}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                  onClick={() => setViewMode("list")}
                >
                  Leads list
                </button>{" "}
                to browse all leads with full pagination.
              </span>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete lead"
        description="This lead will be moved to the Trash. You can restore it later from the Trash page."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function SectionCards({
  leads,
  title,
  subtitle,
  badge,
  badgeClass,
  expanded,
  onToggle,
  limit,
  LeadCard,
}: {
  sectionKey: string;
  leads: Lead[];
  title: string;
  subtitle: string;
  badge: string;
  badgeClass: string;
  expanded: boolean;
  onToggle: () => void;
  limit: number;
  LeadCard: React.ComponentType<{ lead: Lead }>;
}) {
  const visible = expanded ? leads : leads.slice(0, limit);
  const hidden = leads.length - limit;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {badge}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visible.map((lead) => (
          <LeadCard key={lead._id} lead={lead} />
        ))}
      </div>
      {leads.length > limit && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </section>
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
