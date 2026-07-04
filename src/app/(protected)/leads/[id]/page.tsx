"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Building2,
  FileText,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Ruler,
  Sparkles,
  Tag,
  Thermometer,
  Trash2,
  Check,
  X,
  User,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";

import { leadsKeys } from "@/hooks/useLeads";
import {
  useLeadStatuses,
  useLeadTemperatures,
  useLeadPriorities,
  useBudgetRanges,
  useProjectStages,
  usePropertyTypes,
  usePropertyStatuses,
  useSystemTypes,
  useExpectedTimelines,
  useDesignApprovals,
  useAcousticPackages,
  useLostReasons,
  useDesignStatuses,
  usePresentationStatuses,
} from "@/hooks/useLeads";
import {
  fetchLead,
  updateLeadStatus,
  convertLeadToCustomer,
  convertLeadToProject,
  addLeadActivity,
  updateLeadActivity,
  deleteLeadActivity,
  type Lead,
  type LeadEnumOption,
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
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { DateTimePicker } from "@/components/ui/date-time-picker";

/* ── helpers ── */
function humanize(value?: string | null) {
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
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "long" });
}
function leadAge(leadDate?: string | null, createdAt?: string): string {
  const from = leadDate ? new Date(leadDate) : createdAt ? new Date(createdAt) : new Date();
  const days = Math.floor((Date.now() - from.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  if (days < 7) return `${days} days old`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} week${weeks > 1 ? "s" : ""} old`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months} month${months > 1 ? "s" : ""} old`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} old`;
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}
function fmtMoney(n?: number | null) {
  if (n == null) return "—";
  return "₹" + n.toLocaleString("en-IN");
}
function customerRef(lead: Lead): string | undefined {
  if (!lead.customerId) return undefined;
  return typeof lead.customerId === "object"
    ? lead.customerId._id
    : lead.customerId;
}
/** value → enum label (falls back to a humanized code). */
function labelOf(options: LeadEnumOption[] | undefined, value?: string | null) {
  if (!value) return "—";
  return options?.find((o) => o.value === value)?.label ?? humanize(value);
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

  // Enum label maps (cached; used to show friendly labels for stored codes).
  const temperatures = useLeadTemperatures().data;
  const priorities = useLeadPriorities().data;
  const budgets = useBudgetRanges().data;
  const stages = useProjectStages().data;
  const propTypes = usePropertyTypes().data;
  const propStatuses = usePropertyStatuses().data;
  const systemTypes = useSystemTypes().data;
  const timelines = useExpectedTimelines().data;
  const designApprovals = useDesignApprovals().data;
  const acousticPackages = useAcousticPackages().data;
  const lostReasons = useLostReasons().data;
  const designStatuses = useDesignStatuses().data;
  const presentationStatuses = usePresentationStatuses().data;

  const statusOptions =
    useLeadStatuses().data ?? [
      { value: "NEW_LEAD", label: "New Lead" },
      { value: "CONTACTED", label: "Contacted" },
      { value: "ON_HOLD", label: "On Hold" },
      { value: "CLOSED_WON", label: "Won" },
      { value: "CLOSED_LOST", label: "Lost" },
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
    if (lead) {
      setCPlace(lead.place ?? "");
      setCEmail(lead.email ?? "");
    }
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

  // Convert to project
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectValue, setProjectValue] = useState("");
  useEffect(() => {
    if (lead?.projectValue != null) setProjectValue(String(lead.projectValue));
  }, [lead]);

  const projectMutation = useMutation({
    mutationFn: () =>
      convertLeadToProject(leadId, { projectValue: Number(projectValue) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      setProjectOpen(false);
      toast.success(`Project created for "${res.project.clientName}"`);
      router.push(`/projects/${res.project._id}`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Failed to convert to project"),
  });

  // Add activity
  const [activityLabel, setActivityLabel] = useState("");
  const [activityDate, setActivityDate] = useState("");
  // index (into the stored array) of the activity being edited, or null
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDate, setEditDate] = useState("");

  const activityMutation = useMutation({
    mutationFn: () =>
      addLeadActivity(leadId, {
        label: activityLabel.trim(),
        at: activityDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.detail(leadId) });
      setActivityLabel("");
      setActivityDate("");
      toast.success("Activity added");
    },
    onError: () => toast.error("Failed to add activity"),
  });

  const editActivityMutation = useMutation({
    mutationFn: (vars: { index: number; label: string; at?: string | null }) =>
      updateLeadActivity(leadId, vars.index, { label: vars.label, at: vars.at }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.detail(leadId) });
      setEditIdx(null);
      toast.success("Activity updated");
    },
    onError: () => toast.error("Failed to update activity"),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (index: number) => deleteLeadActivity(leadId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.detail(leadId) });
      toast.success("Activity removed");
    },
    onError: () => toast.error("Failed to remove activity"),
  });

  // Keep each activity's original array index (edits/deletes target that), then
  // sort a copy newest-first for display.
  const sortedActivities = useMemo(
    () =>
      (lead?.activities ?? [])
        .map((a, idx) => ({ ...a, idx }))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [lead?.activities]
  );

  function startEdit(a: { idx: number; label: string; at: string }) {
    setEditIdx(a.idx);
    setEditLabel(a.label);
    setEditDate(a.at ? a.at.slice(0, 16) : "");
  }

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
  const isLost = lead.status === "CLOSED_LOST";
  const dims = [lead.roomLength, lead.roomWidth, lead.roomHeight];
  const hasDims = dims.some((d) => d != null);
  const roomUnit = lead.roomUnit ?? "ft";
  const unitToFt: Record<string, number> = { ft: 1, m: 3.280839895, cm: 0.032808399, mm: 0.0032808399 };
  const roomAreaSqFt =
    lead.roomLength != null && lead.roomWidth != null
      ? lead.roomLength * (unitToFt[roomUnit] ?? 1) * lead.roomWidth * (unitToFt[roomUnit] ?? 1)
      : null;

  return (
    <div className="max-w-5xl space-y-4">
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
              {lead.leadId && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {lead.leadId}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                {leadAge(lead.leadDate, lead.createdAt)}
              </span>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {lead.customerPrefix ? `${lead.customerPrefix} ` : ""}{lead.customerName}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ring-black/5 dark:ring-white/10 ${statusBadgeClass(
                  lead.status
                )}`}
              >
                {labelOf(statusOptions, lead.status)}
              </span>
              {lead.leadTemperature && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-inset ring-black/5 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-white/10">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        temperatures?.find((t) => t.value === lead.leadTemperature)
                          ?.color || "#94a3b8",
                    }}
                  />
                  {labelOf(temperatures, lead.leadTemperature)}
                </span>
              )}
              {lead.leadPriority && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-inset ring-black/5 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-white/10">
                  {labelOf(priorities, lead.leadPriority)}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {lead.place} · {humanize(lead.leadSource)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.leadScore != null && (
            <div className="flex items-center gap-2">
              <ScoreGauge value={lead.leadScore} />
              <span
                className="hidden text-xs font-medium sm:inline"
                style={{ color: scoreTier(lead.leadScore).color }}
              >
                {scoreTier(lead.leadScore).label}
              </span>
            </div>
          )}
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
        <Combobox
          options={[...statusOptions].sort((a, b) => a.label.localeCompare(b.label))}
          value={statusValue || "NEW_LEAD"}
          onChange={(v) => v && setStatusValue(v)}
          placeholder="Select status"
          className="w-48"
          disabled={statusMutation.isPending}
        />
        <Button
          size="sm"
          disabled={statusMutation.isPending || statusValue === lead.status}
          onClick={() => statusMutation.mutate(statusValue)}
        >
          {statusMutation.isPending ? "Saving…" : "Save status"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* Contact & source */}
          <Card title="Lead details">
            <Grid>
              <DetailItem icon={<Phone className="h-4 w-4" />} label="Contact">
                <a href={`tel:${lead.contactNumber}`} className="hover:text-cine-primary">
                  {lead.contactNumber || "—"}
                </a>
              </DetailItem>
              <DetailItem icon={<Phone className="h-4 w-4" />} label="Alternative number">
                {lead.alternativeNumber || "—"}
              </DetailItem>
              <DetailItem icon={<Mail className="h-4 w-4" />} label="Email">
                {lead.email || "—"}
              </DetailItem>
              <DetailItem icon={<User className="h-4 w-4" />} label="Lead owner">
                {lead.leadOwner || "—"}
              </DetailItem>
              <DetailItem icon={<MapPin className="h-4 w-4" />} label="Place">
                {lead.place}{lead.companyName ? ` · ${lead.companyName}` : ""}
              </DetailItem>
              <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Source">
                {humanize(lead.leadSource)}
              </DetailItem>
              <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Lead date">
                {fmtDate(lead.leadDate)}
              </DetailItem>
              <DetailItem icon={<CalendarClock className="h-4 w-4" />} label="Next call">
                {fmtDateTime(lead.nextCallTime)}
              </DetailItem>
              <DetailItem icon={<CalendarClock className="h-4 w-4" />} label="Follow-up reminder">
                {fmtDateTime(lead.followupReminder)}
              </DetailItem>
              <DetailItem icon={<Thermometer className="h-4 w-4" />} label="Stage">
                {labelOf(stages, lead.projectStage)}
              </DetailItem>
            </Grid>
          </Card>

          {/* Project & site */}
          {(lead.systemType ||
            lead.budgetRange ||
            lead.expectedTimeline ||
            lead.propertyType ||
            lead.propertyStatus ||
            lead.expectedPurchaseDate ||
            lead.siteAddress ||
            hasDims ||
            lead.dedicatedRoom != null ||
            lead.acousticPackage ||
            lead.designApproval ||
            lead.designDeliveryDate ||
            lead.viewedOn) && (
            <Card title="Project & site">
              <Grid>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="System type">
                  {labelOf(systemTypes, lead.systemType)}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Budget range">
                  {labelOf(budgets, lead.budgetRange)}
                </DetailItem>
                <DetailItem icon={<CalendarClock className="h-4 w-4" />} label="Expected timeline">
                  {labelOf(timelines, lead.expectedTimeline)}
                </DetailItem>
                <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Expected purchase">
                  {fmtDate(lead.expectedPurchaseDate)}
                </DetailItem>
                <DetailItem icon={<Building2 className="h-4 w-4" />} label="Property type">
                  {labelOf(propTypes, lead.propertyType)}
                </DetailItem>
                <DetailItem icon={<Building2 className="h-4 w-4" />} label="Property status">
                  {labelOf(propStatuses, lead.propertyStatus)}
                </DetailItem>
                {hasDims && (
                  <DetailItem icon={<Ruler className="h-4 w-4" />} label={`Room (L×W×H ${roomUnit})`}>
                    {dims.map((d) => d ?? "—").join(" × ")}
                    {roomAreaSqFt != null && (
                      <span className="text-slate-400">
                        {" "}
                        ({roomAreaSqFt.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft)
                      </span>
                    )}
                  </DetailItem>
                )}
                {lead.dedicatedRoom != null && (
                  <DetailItem icon={<Building2 className="h-4 w-4" />} label="Dedicated room">
                    {lead.dedicatedRoom ? "Yes" : "No"}
                  </DetailItem>
                )}
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Acoustic package">
                  {labelOf(acousticPackages, lead.acousticPackage)}
                </DetailItem>
                <DetailItem icon={<CheckCircle2 className="h-4 w-4" />} label="Design approval">
                  {labelOf(designApprovals, lead.designApproval)}
                </DetailItem>
                <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Design delivery">
                  {fmtDate(lead.designDeliveryDate)}
                </DetailItem>
                <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Viewed on">
                  {fmtDate(lead.viewedOn)}
                </DetailItem>
              </Grid>
              {lead.siteAddress && (
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Site address
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {lead.siteAddress}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Home theatre design & 3D */}
          {(lead.threeDDesignRequired != null ||
            lead.designStatus ||
            lead.designer ||
            lead.threeDDesignCost != null ||
            lead.previewLink ||
            lead.screenSize ||
            lead.projector ||
            lead.speakerLayout ||
            lead.theme ||
            lead.presentationStatus ||
            lead.acousticPackage ||
            lead.seatingCapacity != null ||
            (lead.designFiles?.length ?? 0) > 0 ||
            (lead.renderImages?.length ?? 0) > 0) && (
            <Card title="Home theatre design & 3D">
              <Grid>
                {lead.seatingCapacity != null && (
                  <DetailItem icon={<Building2 className="h-4 w-4" />} label="Seating capacity">
                    {lead.seatingCapacity}
                  </DetailItem>
                )}
                {lead.threeDDesignRequired != null && (
                  <DetailItem icon={<Sparkles className="h-4 w-4" />} label="3D design required">
                    {lead.threeDDesignRequired ? "Yes" : "No"}
                  </DetailItem>
                )}
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Design status">
                  {labelOf(designStatuses, lead.designStatus)}
                </DetailItem>
                <DetailItem icon={<User className="h-4 w-4" />} label="Designer">
                  {lead.designer || "—"}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="3D design cost">
                  {fmtMoney(lead.threeDDesignCost)}
                </DetailItem>
                <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Design delivery">
                  {fmtDate(lead.designDeliveryDate)}
                </DetailItem>
                <DetailItem icon={<CheckCircle2 className="h-4 w-4" />} label="Customer approval">
                  {labelOf(designApprovals, lead.designApproval)}
                </DetailItem>
                <DetailItem icon={<CheckCircle2 className="h-4 w-4" />} label="Presentation">
                  {labelOf(presentationStatuses, lead.presentationStatus)}
                </DetailItem>
                <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Viewed on">
                  {fmtDate(lead.viewedOn)}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Acoustic package">
                  {labelOf(acousticPackages, lead.acousticPackage)}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Screen size">
                  {lead.screenSize || "—"}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Projector">
                  {lead.projector || "—"}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Speaker layout">
                  {lead.speakerLayout || "—"}
                </DetailItem>
                <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Theme">
                  {lead.theme || "—"}
                </DetailItem>
                {lead.previewLink && (
                  <DetailItem icon={<Paperclip className="h-4 w-4" />} label="Preview link">
                    <a
                      href={lead.previewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cine-primary hover:underline"
                    >
                      Open preview
                    </a>
                  </DetailItem>
                )}
              </Grid>
              {((lead.designFiles?.length ?? 0) > 0 ||
                (lead.renderImages?.length ?? 0) > 0) && (
                <div className="mt-4 grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
                  {(lead.designFiles?.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Design files
                      </p>
                      {lead.designFiles!.map((a) => (
                        <FileLink key={a.fileUrl} fileName={a.fileName} fileUrl={a.fileUrl} />
                      ))}
                    </div>
                  )}
                  {(lead.renderImages?.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Render images
                      </p>
                      {lead.renderImages!.map((a) => (
                        <FileLink key={a.fileUrl} fileName={a.fileName} fileUrl={a.fileUrl} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* People */}
          {(lead.architectName ||
            lead.architectContact ||
            lead.architectCompany ||
            lead.architectNote ||
            lead.designerName ||
            lead.designerContact ||
            lead.designerCompany ||
            lead.designerNote) && (
            <Card title="Architect & designer">
              <Grid>
                <DetailItem icon={<User className="h-4 w-4" />} label="Architect">
                  {lead.architectPrefix ? `${lead.architectPrefix} ` : ""}{lead.architectName || "—"}
                </DetailItem>
                <DetailItem icon={<Phone className="h-4 w-4" />} label="Architect contact">
                  {lead.architectContact || "—"}
                </DetailItem>
                {lead.architectCompany && (
                  <DetailItem icon={<Building2 className="h-4 w-4" />} label="Architect company">
                    {lead.architectCompany}
                  </DetailItem>
                )}
                {lead.architectNote && (
                  <DetailItem icon={<FileText className="h-4 w-4" />} label="Architect note" className="sm:col-span-2">
                    <span className="whitespace-pre-wrap">{lead.architectNote}</span>
                  </DetailItem>
                )}
                <DetailItem icon={<User className="h-4 w-4" />} label="Interior designer">
                  {lead.designerPrefix ? `${lead.designerPrefix} ` : ""}{lead.designerName || "—"}
                </DetailItem>
                <DetailItem icon={<Phone className="h-4 w-4" />} label="Designer contact">
                  {lead.designerContact || "—"}
                </DetailItem>
                {lead.designerCompany && (
                  <DetailItem icon={<Building2 className="h-4 w-4" />} label="Designer company">
                    {lead.designerCompany}
                  </DetailItem>
                )}
                {lead.designerNote && (
                  <DetailItem icon={<FileText className="h-4 w-4" />} label="Designer note" className="sm:col-span-2">
                    <span className="whitespace-pre-wrap">{lead.designerNote}</span>
                  </DetailItem>
                )}
              </Grid>
            </Card>
          )}

          {/* Referral details */}
          {(lead.leadSource === "REFERENCE" || lead.leadSource === "REFERRAL") &&
            (lead.referralName ||
              lead.referralContact ||
              lead.referralAmount != null ||
              lead.referralCommissionPercent != null) && (
            <Card title="Referral details">
              <Grid>
                {(lead.referralName || lead.referralPrefix) && (
                  <DetailItem icon={<User className="h-4 w-4" />} label="Referred by">
                    {lead.referralPrefix ? `${lead.referralPrefix} ` : ""}{lead.referralName || "—"}
                  </DetailItem>
                )}
                {lead.referralContact && (
                  <DetailItem icon={<Phone className="h-4 w-4" />} label="Referral contact">
                    {lead.referralContact}
                  </DetailItem>
                )}
                {lead.referralAmount != null && (
                  <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Commission amount">
                    {fmtMoney(lead.referralAmount)}
                  </DetailItem>
                )}
                {lead.referralCommissionPercent != null && (
                  <DetailItem icon={<Sparkles className="h-4 w-4" />} label="Commission %">
                    {lead.referralCommissionPercent}%
                  </DetailItem>
                )}
                {lead.referralNote && (
                  <DetailItem icon={<FileText className="h-4 w-4" />} label="Referral note" className="sm:col-span-2">
                    <span className="whitespace-pre-wrap">{lead.referralNote}</span>
                  </DetailItem>
                )}
              </Grid>
            </Card>
          )}

          {/* Requirement & notes */}
          {(lead.requirement || lead.statusDescription || lead.internalNotes) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {lead.requirement && (
                <Card title="Requirement">
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {lead.requirement}
                  </p>
                </Card>
              )}
              {lead.statusDescription && (
                <Card title="Status notes">
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {lead.statusDescription}
                  </p>
                </Card>
              )}
              {lead.internalNotes && (
                <Card title="Internal notes">
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {lead.internalNotes}
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Tags */}
          {(lead.tags?.length ?? 0) > 0 && (
            <Card title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {lead.tags!.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Tag className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column — activity + attachments */}
        <div className="min-w-0 space-y-4">
          <Card title="Activity timeline">
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={activityLabel}
                  onChange={(e) => setActivityLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && activityLabel.trim()) activityMutation.mutate();
                  }}
                  placeholder="Add an activity…"
                  className="h-9"
                />
                <Button
                  size="sm"
                  disabled={!activityLabel.trim() || activityMutation.isPending}
                  onClick={() => activityMutation.mutate()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <DateTimePicker
                value={activityDate}
                onChange={(v) => setActivityDate(v)}
                placeholder="Date & time (defaults to now)"
              />
            </div>
            {sortedActivities.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ol>
                {sortedActivities.map((a, i) => (
                  <li key={a.idx} className="flex gap-3">
                    {/* Track column: dot + connecting line */}
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-cine-primary bg-white dark:bg-slate-900" />
                      {i < sortedActivities.length - 1 && (
                        <span className="my-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>
                    {/* Content */}
                    <div className={`min-w-0 flex-1 ${i < sortedActivities.length - 1 ? "pb-3" : ""}`}>
                      {editIdx === a.idx ? (
                        <div className="space-y-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8"
                            placeholder="Activity"
                          />
                          <DateTimePicker
                            value={editDate}
                            onChange={(v) => setEditDate(v)}
                            placeholder="Date & time"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7"
                              disabled={!editLabel.trim() || editActivityMutation.isPending}
                              onClick={() =>
                                editActivityMutation.mutate({
                                  index: a.idx,
                                  label: editLabel.trim(),
                                  at: editDate || a.at,
                                })
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={() => setEditIdx(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-100">
                              {a.label}
                            </p>
                            {a.note && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {a.note}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400">
                              {fmtDateTime(a.at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => startEdit(a)}
                              className="text-slate-400 hover:text-cine-primary"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Delete this activity?"))
                                  deleteActivityMutation.mutate(a.idx);
                              }}
                              className="text-slate-400 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {(lead.attachments?.length ?? 0) > 0 && (
            <Card title="Attachments">
              <div className="space-y-1.5">
                {lead.attachments!.map((a) => (
                  <a
                    key={a.fileUrl}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-cine-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{a.fileName}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {(lead.quoteSent ||
            lead.quoteValue != null ||
            lead.quoteDate ||
            lead.followUpDate ||
            (lead.quotations?.length ?? 0) > 0) && (
            <Card title="Quotation tracking">
              <div className="space-y-2">
                <SideRow label="Quote sent">{lead.quoteSent ? "Yes" : "No"}</SideRow>
                <SideRow label="Quote value">{fmtMoney(lead.quoteValue)}</SideRow>
                <SideRow label="Quote date">{fmtDate(lead.quoteDate)}</SideRow>
                <SideRow label="Follow-up date">{fmtDate(lead.followUpDate)}</SideRow>
              </div>
              {(lead.quotations?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  {lead.quotations!.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-slate-200 p-2.5 text-sm dark:border-slate-700"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Quotation {i + 1}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-slate-500 dark:text-slate-400">
                          Real:{" "}
                          <span className="text-slate-700 dark:text-slate-200">
                            {fmtMoney(q.realPrice)}
                          </span>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Offer:{" "}
                          <span className="text-slate-700 dark:text-slate-200">
                            {fmtMoney(q.offerPrice)}
                          </span>
                        </span>
                      </div>
                      {q.description && (
                        <p className="mt-1 text-slate-600 dark:text-slate-300">
                          {q.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {isLost && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                <XCircle className="h-4 w-4" /> Lost Reason
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {labelOf(lostReasons, lead.lostReason)}
              </p>
            </div>
          )}

          {isWon && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Won Details
              </h3>
              {lead.projectValue != null && (
                <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">
                  Project value: {fmtMoney(lead.projectValue)}
                </p>
              )}
              {lead.convertedProjectId ? (
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link href={`/projects/${lead.convertedProjectId}`}>
                    <FolderKanban className="h-4 w-4" /> View project
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="w-full" onClick={() => setProjectOpen(true)}>
                  <FolderKanban className="h-4 w-4" /> Convert to Project
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Convert-to-customer dialog */}
      <Dialog open={convertOpen} onClose={() => setConvertOpen(false)} className="max-w-md">
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-cine-primary" />
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
              <Input value={cPlace} onChange={(e) => setCPlace(e.target.value)} className="mt-1" />
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
              <Input value={cNotes} onChange={(e) => setCNotes(e.target.value)} className="mt-1" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={convertMutation.isPending} onClick={() => convertMutation.mutate()}>
              {convertMutation.isPending ? "Converting…" : "Convert"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Convert-to-project dialog */}
      <Dialog open={projectOpen} onClose={() => setProjectOpen(false)} className="max-w-md">
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-cine-primary" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Convert to project
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Creates a project linked to this lead (and its customer). The lead is
            marked Closed Won.
          </p>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Project value
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₹
              </span>
              <Input
                type="number"
                className="pl-7"
                value={projectValue}
                onChange={(e) => setProjectValue(e.target.value)}
                placeholder="Enter project value"
              />
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setProjectOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={projectMutation.isPending || !projectValue || Number(projectValue) < 0}
              onClick={() => projectMutation.mutate()}
            >
              {projectMutation.isPending ? "Converting…" : "Create project"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ── building blocks ── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Lead-score classification band. */
function scoreTier(n: number): { label: string; color: string } {
  if (n >= 90) return { label: "Excellent", color: "#10b981" };
  if (n >= 75) return { label: "High Potential", color: "#22c55e" };
  if (n >= 60) return { label: "Good", color: "#f59e0b" };
  if (n >= 40) return { label: "Average", color: "#f97316" };
  return { label: "Low Potential", color: "#ef4444" };
}

/** Compact circular lead-score gauge with the number centred inside. */
function ScoreGauge({ value }: { value: number }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  const color = scoreTier(value).color;
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
      title={`Lead score ${value}/100`}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>
  );
}
function isEmptyValue(children: React.ReactNode) {
  return children == null || children === "" || children === "—";
}

function DetailItem({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Hide fields that have no value (avoids rows of "—").
  if (isEmptyValue(children)) return null;
  return (
    <div className={`flex items-start gap-2.5${className ? ` ${className}` : ""}`}>
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
/** A file link row (design files / render images). */
function FileLink({ fileName, fileUrl }: { fileName: string; fileUrl: string }) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-cine-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      <Paperclip className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{fileName}</span>
    </a>
  );
}

/** Compact label : value row for the sidebar cards. */
function SideRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (isEmptyValue(children)) return null;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">{children}</span>
    </div>
  );
}
