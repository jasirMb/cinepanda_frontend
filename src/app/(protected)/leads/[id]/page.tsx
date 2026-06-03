"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
  UserCheck,
  UserPlus,
} from "lucide-react";

import { leadsKeys } from "@/hooks/useLeads";
import { useLeadStatuses } from "@/hooks/useLeads";
import {
  fetchLead,
  updateLeadStatus,
  convertLeadToCustomer,
  type Lead,
} from "@/lib/api/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

/* ── helpers ── */
function humanize(value?: string) {
  if (!value) return "Not set";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];
function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
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
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "long" });
}
function fmtDateTime(iso?: string) {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function customerRef(lead: Lead): string | undefined {
  if (!lead.customerId) return undefined;
  return typeof lead.customerId === "object"
    ? lead.customerId._id
    : lead.customerId;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const leadId = params.id as string;

  const leadQuery = useQuery<Lead>({
    queryKey: leadsKeys.detail(leadId),
    queryFn: () => fetchLead(leadId),
    enabled: !!leadId,
  });
  const lead = leadQuery.data;

  const statusOptions =
    useLeadStatuses().data ?? [
      { value: "OPEN", label: "Open" },
      { value: "FOLLOW_UP", label: "Follow up" },
      { value: "ON_HOLD", label: "On hold" },
      { value: "CLOSED_WON", label: "Closed won" },
      { value: "CLOSED_LOST", label: "Closed lost" },
    ];

  const [statusValue, setStatusValue] = useState("");
  useEffect(() => {
    if (lead) setStatusValue(lead.status);
  }, [lead]);

  const statusMutation = useMutation({
    mutationFn: (next: string) =>
      updateLeadStatus(leadId, {
        status: next,
        statusDescription: lead?.statusDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
      if (lead) setStatusValue(lead.status);
    },
  });

  // Convert to customer
  const [convertOpen, setConvertOpen] = useState(false);
  const [cPlace, setCPlace] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cNotes, setCNotes] = useState("");
  useEffect(() => {
    if (lead) setCPlace(lead.place ?? "");
  }, [lead]);

  const convertMutation = useMutation({
    mutationFn: () =>
      convertLeadToCustomer(leadId, {
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

  if (leadQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (leadQuery.isError || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">
          Failed to load lead. It may have been deleted.
        </p>
        <Button variant="outline" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" /> Back to leads
          </Link>
        </Button>
      </div>
    );
  }

  const custId = customerRef(lead);
  const isWon = lead.status === "CLOSED_WON";

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white shadow-sm ${gradientFor(
              lead.customerName
            )}`}
          >
            {getInitials(lead.customerName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {lead.customerName}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(
                  lead.status
                )}`}
              >
                {humanize(lead.status)}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityBadgeClass(
                  lead.priorityType
                )}`}
              >
                {humanize(lead.priorityType)}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {lead.place} · {humanize(lead.leadSource)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          {isWon &&
            (custId ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/customers/${custId}`}>
                  <UserCheck className="h-4 w-4" /> View customer
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConvertOpen(true)}>
                <UserPlus className="h-4 w-4" /> Convert to customer
              </Button>
            ))}
          <Button size="sm" asChild>
            <Link href={`/leads/new?edit=${lead._id}`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Status management */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Update status
        </span>
        <Select
          value={statusValue || "OPEN"}
          onValueChange={(v) => v && setStatusValue(v)}
          disabled={statusMutation.isPending}
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={statusMutation.isPending || statusValue === lead.status}
          onClick={() => statusMutation.mutate(statusValue)}
        >
          {statusMutation.isPending ? "Saving…" : "Save status"}
        </Button>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50">
          Lead details
        </h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <DetailItem icon={<Phone className="h-4 w-4" />} label="Contact">
            <a href={`tel:${lead.contactNumber}`} className="hover:text-cine-primary">
              {lead.contactNumber || "—"}
            </a>
          </DetailItem>
          <DetailItem icon={<Phone className="h-4 w-4" />} label="Alternative number">
            {lead.alternativeNumber || "—"}
          </DetailItem>
          <DetailItem icon={<MapPin className="h-4 w-4" />} label="Place">
            {lead.place || "—"}
          </DetailItem>
          <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Source">
            {humanize(lead.leadSource)}
          </DetailItem>
          <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Lead date">
            {fmtDate(lead.leadDate)}
          </DetailItem>
          <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Last update">
            {fmtDate(lead.lastUpdate)}
          </DetailItem>
          <DetailItem
            icon={<CalendarClock className="h-4 w-4" />}
            label="Next call"
          >
            {fmtDateTime(lead.nextCallTime)}
          </DetailItem>
          <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Priority">
            {humanize(lead.priorityType)}
          </DetailItem>
        </div>
      </div>

      {/* Requirement & notes */}
      {(lead.requirement || lead.statusDescription) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {lead.requirement && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                Requirement
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {lead.requirement}
              </p>
            </div>
          )}
          {lead.statusDescription && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                Status notes
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {lead.statusDescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> Created{" "}
          {new Date(lead.createdAt).toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> Updated{" "}
          {new Date(lead.updatedAt).toLocaleString()}
        </span>
      </div>

      {/* Convert dialog */}
      <Dialog open={convertOpen} onClose={() => setConvertOpen(false)} className="max-w-md">
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-cine-primary" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Convert to customer
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Creates a customer from this lead (or links to an existing one with
            the same name + phone).
          </p>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Place
              <Input
                value={cPlace}
                onChange={(e) => setCPlace(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Email (optional)
              <Input
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Notes (optional)
              <Input
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                className="mt-1"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending ? "Converting…" : "Convert"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="text-sm text-slate-800 dark:text-slate-100">{children}</p>
      </div>
    </div>
  );
}
