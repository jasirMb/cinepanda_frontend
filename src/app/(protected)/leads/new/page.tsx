"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PhoneField } from "@/components/ui/phone-field";
import { cn } from "@/lib/utils";
import {
  isValidPhoneForCountry,
  expectedPhoneLength,
} from "@/lib/country-codes";
import { uploadFile } from "@/lib/api/files";
import {
  leadsKeys,
  useLeadSources,
  useLeadStatuses,
  useProjectStages,
  useLeadTemperatures,
  useBudgetRanges,
  usePropertyTypes,
  usePropertyStatuses,
  useSystemTypes,
  useLeadPriorities,
  useExpectedTimelines,
  useDesignApprovals,
  useAcousticPackages,
  useLostReasons,
  useDesignStatuses,
  usePresentationStatuses,
} from "@/hooks/useLeads";
import {
  createLead,
  fetchLead,
  updateLead,
  type CreateLeadPayload,
  type LeadAttachment,
} from "@/lib/api/leads";

type Option = { label: string; value: string };

const DEFAULT_LEAD_SOURCES: Option[] = [
  { label: "Meta", value: "META" },
  { label: "YouTube", value: "YOUTUBE" },
  { label: "Reference", value: "REFERENCE" },
  { label: "Walk-in", value: "WALKIN" },
  { label: "Other", value: "OTHER" },
];

const DEFAULT_STATUSES: Option[] = [
  { label: "Open", value: "OPEN" },
  { label: "Closed Won", value: "CLOSED_WON" },
  { label: "Closed Lost", value: "CLOSED_LOST" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Follow Up", value: "FOLLOW_UP" },
];

const initialFormValues: CreateLeadPayload = {
  customerName: "",
  place: "",
  contactNumber: "",
  contactCountryCode: "+91",
  alternativeNumber: "",
  alternativeCountryCode: "+91",
  leadSource: "",
  priorityType: "",
  requirement: "",
  statusDescription: "",
  status: "OPEN",
  nextCallTime: null,
  // extended
  leadOwner: "",
  email: "",
  projectStage: "",
  leadTemperature: "",
  budgetRange: "",
  expectedPurchaseDate: null,
  propertyType: "",
  propertyStatus: "",
  systemType: "",
  roomLength: null,
  roomWidth: null,
  roomHeight: null,
  siteAddress: "",
  architectName: "",
  architectContact: "",
  architectCountryCode: "+91",
  designerName: "",
  designerContact: "",
  designerCountryCode: "+91",
  followupReminder: null,
  leadPriority: "",
  quoteSent: false,
  quoteValue: null,
  quoteDate: null,
  followUpDate: null,
  tags: [],
  internalNotes: "",
  attachments: [],
  // project scoping / design
  expectedTimeline: "",
  dedicatedRoom: null,
  designDeliveryDate: null,
  designApproval: "",
  acousticPackage: "",
  viewedOn: null,
  // home theatre design & 3D
  seatingCapacity: null,
  threeDDesignRequired: null,
  designStatus: "",
  designer: "",
  threeDDesignCost: null,
  previewLink: "",
  screenSize: "",
  projector: "",
  speakerLayout: "",
  theme: "",
  presentationStatus: "",
  designFiles: [],
  renderImages: [],
  // outcome
  lostReason: "",
  projectValue: null,
};

/** Mirrors the backend lead-score formula so the gauge updates live as you type. */
function computeLeadScore(v: CreateLeadPayload): number {
  let s = 0;
  if (v.leadTemperature === "HOT") s += 30;
  else if (v.leadTemperature === "WARM") s += 18;
  else if (v.leadTemperature === "COLD") s += 6;
  const budget: Record<string, number> = {
    UNDER_1L: 5, "1L_3L": 10, "3L_5L": 16, "5L_10L": 22, "10L_25L": 28, ABOVE_25L: 32,
  };
  s += budget[v.budgetRange ?? ""] ?? 0;
  if (v.quoteSent) s += 15;
  if (v.nextCallTime || v.followUpDate) s += 8;
  if (v.threeDDesignRequired) s += 5;
  const keys: (keyof CreateLeadPayload)[] = [
    "email", "siteAddress", "projectStage", "propertyType", "expectedTimeline", "systemType", "designStatus",
  ];
  const filled = keys.filter((k) => {
    const x = v[k];
    return x != null && x !== "";
  }).length;
  s += Math.min(filled * 3, 20);
  if (v.status === "CLOSED_WON") return 100;
  if (v.status === "CLOSED_LOST") s = Math.min(s, 20);
  return Math.max(0, Math.min(100, Math.round(s)));
}

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [formValues, setFormValues] =
    useState<CreateLeadPayload>(initialFormValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dropdown options (from the backend enums so values always match).
  const leadSourceOptions = useLeadSources().data ?? DEFAULT_LEAD_SOURCES;
  const statusOptions = useLeadStatuses().data ?? DEFAULT_STATUSES;
  const projectStageOptions = useProjectStages().data ?? [];
  const temperatureOptions = useLeadTemperatures().data ?? [];
  const budgetRangeOptions = useBudgetRanges().data ?? [];
  const propertyTypeOptions = usePropertyTypes().data ?? [];
  const propertyStatusOptions = usePropertyStatuses().data ?? [];
  const systemTypeOptions = useSystemTypes().data ?? [];
  const leadPriorityOptions = useLeadPriorities().data ?? [];
  const expectedTimelineOptions = useExpectedTimelines().data ?? [];
  const designApprovalOptions = useDesignApprovals().data ?? [];
  const acousticPackageOptions = useAcousticPackages().data ?? [];
  const lostReasonOptions = useLostReasons().data ?? [];
  const designStatusOptions = useDesignStatuses().data ?? [];
  const presentationStatusOptions = usePresentationStatuses().data ?? [];

  const liveScore = useMemo(() => computeLeadScore(formValues), [formValues]);

  const leadQuery = useQuery({
    queryKey: leadsKeys.detail(editId as string),
    queryFn: () => fetchLead(editId as string),
    enabled: isEditMode,
  });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      toast.success("Lead created");
      router.push("/leads?created=1");
    },
    onError: (error: unknown) => {
      toast.error(extractError(error, "Failed to create lead. Please try again."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) =>
      updateLead(editId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      toast.success("Lead updated");
      router.push("/leads?updated=1");
    },
    onError: (error: unknown) => {
      toast.error(extractError(error, "Failed to update lead. Please try again."));
    },
  });

  const hasValidationErrors = useMemo(
    () => Object.keys(formErrors).length > 0,
    [formErrors]
  );

  const sortedActivities = useMemo(
    () =>
      [...(leadQuery.data?.activities ?? [])].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
      ),
    [leadQuery.data?.activities]
  );

  useEffect(() => {
    if (leadQuery.data) {
      const lead = leadQuery.data;
      setFormValues({
        customerName: lead.customerName ?? "",
        place: lead.place ?? "",
        contactNumber: lead.contactNumber ?? "",
        contactCountryCode: lead.contactCountryCode ?? "+91",
        alternativeNumber: lead.alternativeNumber ?? "",
        alternativeCountryCode: lead.alternativeCountryCode ?? "+91",
        leadSource: lead.leadSource ?? "",
        priorityType: lead.priorityType ?? "",
        requirement: lead.requirement ?? "",
        statusDescription: lead.statusDescription ?? "",
        status: lead.status ?? "OPEN",
        nextCallTime: lead.nextCallTime ? lead.nextCallTime.slice(0, 16) : null,
        leadOwner: lead.leadOwner ?? "",
        email: lead.email ?? "",
        projectStage: lead.projectStage ?? "",
        leadTemperature: lead.leadTemperature ?? "",
        budgetRange: lead.budgetRange ?? "",
        expectedPurchaseDate: lead.expectedPurchaseDate
          ? lead.expectedPurchaseDate.slice(0, 10)
          : null,
        propertyType: lead.propertyType ?? "",
        propertyStatus: lead.propertyStatus ?? "",
        systemType: lead.systemType ?? "",
        roomLength: lead.roomLength ?? null,
        roomWidth: lead.roomWidth ?? null,
        roomHeight: lead.roomHeight ?? null,
        siteAddress: lead.siteAddress ?? "",
        architectName: lead.architectName ?? "",
        architectContact: lead.architectContact ?? "",
        architectCountryCode: lead.architectCountryCode ?? "+91",
        designerName: lead.designerName ?? "",
        designerContact: lead.designerContact ?? "",
        designerCountryCode: lead.designerCountryCode ?? "+91",
        followupReminder: lead.followupReminder
          ? lead.followupReminder.slice(0, 16)
          : null,
        leadPriority: lead.leadPriority ?? "",
        quoteSent: lead.quoteSent ?? false,
        quoteValue: lead.quoteValue ?? null,
        quoteDate: lead.quoteDate ? lead.quoteDate.slice(0, 10) : null,
        followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : null,
        tags: lead.tags ?? [],
        internalNotes: lead.internalNotes ?? "",
        attachments: lead.attachments ?? [],
        expectedTimeline: lead.expectedTimeline ?? "",
        dedicatedRoom: lead.dedicatedRoom ?? null,
        designDeliveryDate: lead.designDeliveryDate
          ? lead.designDeliveryDate.slice(0, 10)
          : null,
        designApproval: lead.designApproval ?? "",
        acousticPackage: lead.acousticPackage ?? "",
        viewedOn: lead.viewedOn ? lead.viewedOn.slice(0, 10) : null,
        seatingCapacity: lead.seatingCapacity ?? null,
        threeDDesignRequired: lead.threeDDesignRequired ?? null,
        designStatus: lead.designStatus ?? "",
        designer: lead.designer ?? "",
        threeDDesignCost: lead.threeDDesignCost ?? null,
        previewLink: lead.previewLink ?? "",
        screenSize: lead.screenSize ?? "",
        projector: lead.projector ?? "",
        speakerLayout: lead.speakerLayout ?? "",
        theme: lead.theme ?? "",
        presentationStatus: lead.presentationStatus ?? "",
        designFiles: lead.designFiles ?? [],
        renderImages: lead.renderImages ?? [],
        lostReason: lead.lostReason ?? "",
        projectValue: lead.projectValue ?? null,
      });
    }
  }, [leadQuery.data]);

  function validate(values: CreateLeadPayload) {
    const errors: Record<string, string> = {};

    if (!values.customerName.trim())
      errors.customerName = "Customer name is required.";
    if (!values.place.trim()) errors.place = "Place is required.";

    // Required contact number + country-code validation
    if (!values.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required.";
    } else if (!isValidPhoneForCountry(values.contactNumber, values.contactCountryCode)) {
      errors.contactNumber = `${values.contactCountryCode || "+91"} numbers must be ${expectedPhoneLength(values.contactCountryCode)}.`;
    }

    // Optional phone numbers — validate length only when filled in.
    const optionalPhone = (
      num: string | null | undefined,
      cc: string | null | undefined,
      field: string
    ) => {
      if (num && num.trim()) {
        if (!isValidPhoneForCountry(num, cc)) {
          errors[field] = `${cc || "+91"} numbers must be ${expectedPhoneLength(cc)}.`;
        }
      }
    };
    optionalPhone(values.alternativeNumber, values.alternativeCountryCode, "alternativeNumber");
    optionalPhone(values.architectContact, values.architectCountryCode, "architectContact");
    optionalPhone(values.designerContact, values.designerCountryCode, "designerContact");

    if (values.email && values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      errors.email = "Enter a valid email address.";

    if (!values.leadSource.trim()) errors.leadSource = "Lead source is required.";
    if (!values.status?.trim()) errors.status = "Status is required.";
    if (!values.requirement.trim())
      errors.requirement = "Requirement details are required.";

    return errors;
  }

  function setField<K extends keyof CreateLeadPayload>(
    field: K,
    value: CreateLeadPayload[K]
  ): void {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }

  // Phone numbers strip whitespace as you type.
  function setPhone(field: keyof CreateLeadPayload, value: string): void {
    setField(field, value.replace(/\s+/g, "") as CreateLeadPayload[typeof field]);
  }

  function setNumber(field: keyof CreateLeadPayload, raw: string): void {
    const parsed = raw.trim() === "" ? null : Number(raw);
    setField(field, (Number.isNaN(parsed as number) ? null : parsed) as CreateLeadPayload[typeof field]);
  }

  function addTag(): void {
    const t = tagDraft.trim();
    if (!t) return;
    if (!(formValues.tags ?? []).includes(t)) {
      setField("tags", [...(formValues.tags ?? []), t]);
    }
    setTagDraft("");
  }

  function removeTag(tag: string): void {
    setField("tags", (formValues.tags ?? []).filter((t) => t !== tag));
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: LeadAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB and was skipped.`);
          continue;
        }
        const up = await uploadFile(file, "misc");
        uploaded.push({ fileName: up.fileName, fileUrl: up.fileUrl });
      }
      if (uploaded.length) {
        setField("attachments", [...(formValues.attachments ?? []), ...uploaded]);
        toast.success(`${uploaded.length} file(s) uploaded`);
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(url: string): void {
    setField("attachments", (formValues.attachments ?? []).filter((a) => a.fileUrl !== url));
  }

  // Generic uploader for the design file / render-image lists.
  async function uploadInto(
    field: "designFiles" | "renderImages",
    files: FileList | null
  ): Promise<void> {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: LeadAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB and was skipped.`);
          continue;
        }
        const up = await uploadFile(file, "misc");
        uploaded.push({ fileName: up.fileName, fileUrl: up.fileUrl });
      }
      if (uploaded.length) {
        setField(field, [...(formValues[field] ?? []), ...uploaded]);
        toast.success(`${uploaded.length} file(s) uploaded`);
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function removeFrom(field: "designFiles" | "renderImages", url: string): void {
    setField(field, (formValues[field] ?? []).filter((a) => a.fileUrl !== url));
  }

  // wa.me / mailto links for "Send Design To Customer" (work from current values).
  const waNumber = `${formValues.contactCountryCode ?? ""}${formValues.contactNumber ?? ""}`.replace(/\D/g, "");
  const waMessage = encodeURIComponent(
    `Hi ${formValues.customerName || "there"}, here is your home theatre design preview: ${formValues.previewLink || ""}`
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : undefined;
  const mailHref = formValues.email
    ? `mailto:${formValues.email}?subject=${encodeURIComponent("Your Home Theatre Design")}&body=${waMessage}`
    : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const blankToNull = (v?: string | null) =>
      v && v.trim() !== "" ? v.trim() : null;

    const normalized: CreateLeadPayload = {
      ...formValues,
      status: (formValues.status || "OPEN").trim(),
      contactCountryCode: formValues.contactCountryCode || "+91",
      contactNumber: (formValues.contactNumber || "").replace(/\s+/g, ""),
      alternativeNumber: blankToNull(formValues.alternativeNumber),
      alternativeCountryCode: blankToNull(formValues.alternativeNumber)
        ? formValues.alternativeCountryCode
        : null,
      architectContact: blankToNull(formValues.architectContact),
      designerContact: blankToNull(formValues.designerContact),
      leadOwner: blankToNull(formValues.leadOwner),
      email: blankToNull(formValues.email),
      siteAddress: blankToNull(formValues.siteAddress),
      architectName: blankToNull(formValues.architectName),
      designerName: blankToNull(formValues.designerName),
      internalNotes: blankToNull(formValues.internalNotes),
      statusDescription: formValues.statusDescription ?? "",
      // Empty-string enum selections must become null (not "") to pass validation.
      projectStage: blankToNull(formValues.projectStage),
      leadTemperature: blankToNull(formValues.leadTemperature),
      budgetRange: blankToNull(formValues.budgetRange),
      propertyType: blankToNull(formValues.propertyType),
      propertyStatus: blankToNull(formValues.propertyStatus),
      systemType: blankToNull(formValues.systemType),
      leadPriority: blankToNull(formValues.leadPriority),
      priorityType: blankToNull(formValues.priorityType) ?? undefined,
      nextCallTime: blankToNull(formValues.nextCallTime),
      followupReminder: blankToNull(formValues.followupReminder),
      expectedPurchaseDate: blankToNull(formValues.expectedPurchaseDate),
      quoteDate: blankToNull(formValues.quoteDate),
      followUpDate: blankToNull(formValues.followUpDate),
      // project scoping / design
      expectedTimeline: blankToNull(formValues.expectedTimeline),
      designApproval: blankToNull(formValues.designApproval),
      acousticPackage: blankToNull(formValues.acousticPackage),
      designDeliveryDate: blankToNull(formValues.designDeliveryDate),
      viewedOn: blankToNull(formValues.viewedOn),
      // home theatre design & 3D
      designStatus: blankToNull(formValues.designStatus),
      presentationStatus: blankToNull(formValues.presentationStatus),
      designer: blankToNull(formValues.designer),
      previewLink: blankToNull(formValues.previewLink),
      screenSize: blankToNull(formValues.screenSize),
      projector: blankToNull(formValues.projector),
      speakerLayout: blankToNull(formValues.speakerLayout),
      theme: blankToNull(formValues.theme),
      // outcome — only keep lostReason / projectValue relevant to the status
      lostReason:
        formValues.status === "CLOSED_LOST"
          ? blankToNull(formValues.lostReason)
          : null,
      projectValue:
        formValues.status === "CLOSED_WON" ? formValues.projectValue ?? null : null,
    };

    const nextErrors = validate(normalized);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    if (isEditMode) updateMutation.mutate(normalized);
    else createMutation.mutate(normalized);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {isEditMode ? "Edit Lead" : "New Lead"}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isEditMode
            ? "Update lead details and follow-up plan."
            : "Capture a new business lead."}
        </p>
      </div>

      {isEditMode && leadQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Loading lead details...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* ── Left column: main fields ───────────────────────────── */}
            <div className="min-w-0 space-y-4 lg:col-span-2">
              <SectionCard title="Contact">
                <Rows cols={2}>
                  <Field label="Customer Name *" error={formErrors.customerName}>
                    <Input
                      value={formValues.customerName}
                      onChange={(e) => setField("customerName", e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Place / City *" error={formErrors.place}>
                    <Input
                      value={formValues.place}
                      onChange={(e) => setField("place", e.target.value)}
                      placeholder="City / Area"
                    />
                  </Field>
                  <Field label="Lead Owner">
                    <Input
                      value={formValues.leadOwner ?? ""}
                      onChange={(e) => setField("leadOwner", e.target.value)}
                      placeholder="Owner name"
                    />
                  </Field>
                  <Field label="Email" error={formErrors.email}>
                    <Input
                      type="email"
                      value={formValues.email ?? ""}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="Email address"
                    />
                  </Field>
                  <Field label="Contact Number *" error={formErrors.contactNumber}>
                    <PhoneField
                      countryCode={formValues.contactCountryCode}
                      number={formValues.contactNumber}
                      onCountryCodeChange={(c) => setField("contactCountryCode", c)}
                      onNumberChange={(n) => setPhone("contactNumber", n)}
                      placeholder="9XXXX XXXXX"
                    />
                  </Field>
                  <Field label="Alternative Number" error={formErrors.alternativeNumber}>
                    <PhoneField
                      countryCode={formValues.alternativeCountryCode}
                      number={formValues.alternativeNumber ?? ""}
                      onCountryCodeChange={(c) => setField("alternativeCountryCode", c)}
                      onNumberChange={(n) => setPhone("alternativeNumber", n)}
                      placeholder="Optional backup number"
                    />
                  </Field>
                </Rows>
              </SectionCard>

              <SectionCard title="Lead & project">
                <Rows cols={2}>
                  <Field label="Lead Source *" error={formErrors.leadSource}>
                    <EnumSelect
                      value={formValues.leadSource}
                      onChange={(v) => setField("leadSource", v)}
                      options={leadSourceOptions}
                      placeholder="Select lead source"
                    />
                  </Field>
                  <Field label="Project Stage">
                    <EnumSelect
                      value={formValues.projectStage ?? ""}
                      onChange={(v) => setField("projectStage", v)}
                      options={projectStageOptions}
                      placeholder="Select project stage"
                    />
                  </Field>
                  <Field label="Lead Temperature">
                    <Segmented
                      value={formValues.leadTemperature ?? ""}
                      onChange={(v) => setField("leadTemperature", v)}
                      options={temperatureOptions}
                    />
                  </Field>
                  <Field label="Budget Range">
                    <EnumSelect
                      value={formValues.budgetRange ?? ""}
                      onChange={(v) => setField("budgetRange", v)}
                      options={budgetRangeOptions}
                      placeholder="Select budget range"
                    />
                  </Field>
                  <Field label="Expected Purchase Date">
                    <DatePicker
                      value={formValues.expectedPurchaseDate ?? ""}
                      onChange={(v) => setField("expectedPurchaseDate", v || null)}
                      placeholder="Select expected date"
                    />
                  </Field>
                  <Field label="Expected Timeline">
                    <EnumSelect
                      value={formValues.expectedTimeline ?? ""}
                      onChange={(v) => setField("expectedTimeline", v)}
                      options={expectedTimelineOptions}
                      placeholder="Select timeline"
                    />
                  </Field>
                  <Field label="Property Type">
                    <EnumSelect
                      value={formValues.propertyType ?? ""}
                      onChange={(v) => setField("propertyType", v)}
                      options={propertyTypeOptions}
                      placeholder="Select property type"
                    />
                  </Field>
                  <Field label="Property Status">
                    <EnumSelect
                      value={formValues.propertyStatus ?? ""}
                      onChange={(v) => setField("propertyStatus", v)}
                      options={propertyStatusOptions}
                      placeholder="Select property status"
                    />
                  </Field>
                  <Field label="Project Type">
                    <EnumSelect
                      value={formValues.systemType ?? ""}
                      onChange={(v) => setField("systemType", v)}
                      options={systemTypeOptions}
                      placeholder="Select project type"
                    />
                  </Field>
                </Rows>
              </SectionCard>

              <SectionCard title="Room Details">
                <Rows cols={2}>
                  <Field label="Length (ft)">
                    <Input type="number" value={formValues.roomLength ?? ""} onChange={(e) => setNumber("roomLength", e.target.value)} placeholder="Length" />
                  </Field>
                  <Field label="Width (ft)">
                    <Input type="number" value={formValues.roomWidth ?? ""} onChange={(e) => setNumber("roomWidth", e.target.value)} placeholder="Width" />
                  </Field>
                  <Field label="Height (ft)">
                    <Input type="number" value={formValues.roomHeight ?? ""} onChange={(e) => setNumber("roomHeight", e.target.value)} placeholder="Height" />
                  </Field>
                  <Field label="Seating Capacity">
                    <Input type="number" value={formValues.seatingCapacity ?? ""} onChange={(e) => setNumber("seatingCapacity", e.target.value)} placeholder="No. of seats" />
                  </Field>
                  <Field label="Dedicated Room">
                    <YesNo value={formValues.dedicatedRoom ?? null} onChange={(v) => setField("dedicatedRoom", v)} />
                  </Field>
                </Rows>
              </SectionCard>

              <SectionCard title="Home Theatre Design & 3D Visualization">
                <Rows cols={2}>
                  <Field label="3D Design Required">
                    <YesNo value={formValues.threeDDesignRequired ?? null} onChange={(v) => setField("threeDDesignRequired", v)} />
                  </Field>
                  <Field label="Design Status">
                    <EnumSelect value={formValues.designStatus ?? ""} onChange={(v) => setField("designStatus", v)} options={designStatusOptions} placeholder="Select design status" />
                  </Field>
                  <Field label="Designer">
                    <Input value={formValues.designer ?? ""} onChange={(e) => setField("designer", e.target.value)} placeholder="Designer name" />
                  </Field>
                  <Field label="3D Design Cost">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                      <Input type="number" className="pl-7" value={formValues.threeDDesignCost ?? ""} onChange={(e) => setNumber("threeDDesignCost", e.target.value)} placeholder="Design cost" />
                    </div>
                  </Field>
                  <Field label="Design Delivery Date">
                    <DatePicker value={formValues.designDeliveryDate ?? ""} onChange={(v) => setField("designDeliveryDate", v || null)} placeholder="Select date" />
                  </Field>
                  <Field label="Customer Approval">
                    <EnumSelect value={formValues.designApproval ?? ""} onChange={(v) => setField("designApproval", v)} options={designApprovalOptions} placeholder="Select approval status" />
                  </Field>
                  <Field label="Preview Link">
                    <Input value={formValues.previewLink ?? ""} onChange={(e) => setField("previewLink", e.target.value)} placeholder="https://…" />
                  </Field>
                  <Field label="Presentation Status">
                    <EnumSelect value={formValues.presentationStatus ?? ""} onChange={(v) => setField("presentationStatus", v)} options={presentationStatusOptions} placeholder="Select status" />
                  </Field>
                  <Field label="Viewed On">
                    <DatePicker value={formValues.viewedOn ?? ""} onChange={(v) => setField("viewedOn", v || null)} placeholder="Select date" />
                  </Field>
                </Rows>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FileList
                    label="Design Files"
                    files={formValues.designFiles ?? []}
                    onUpload={(f) => uploadInto("designFiles", f)}
                    onRemove={(u) => removeFrom("designFiles", u)}
                    disabled={uploading}
                  />
                  <FileList
                    label="Render Images"
                    files={formValues.renderImages ?? []}
                    onUpload={(f) => uploadInto("renderImages", f)}
                    onRemove={(u) => removeFrom("renderImages", u)}
                    disabled={uploading}
                  />
                </div>

                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-cine-primary">
                  Design Information
                </p>
                <Rows cols={2}>
                  <Field label="Screen Size">
                    <Input value={formValues.screenSize ?? ""} onChange={(e) => setField("screenSize", e.target.value)} placeholder={'e.g. 150"'} />
                  </Field>
                  <Field label="Projector">
                    <Input value={formValues.projector ?? ""} onChange={(e) => setField("projector", e.target.value)} placeholder="e.g. BenQ W5850" />
                  </Field>
                  <Field label="Speaker Layout">
                    <Input value={formValues.speakerLayout ?? ""} onChange={(e) => setField("speakerLayout", e.target.value)} placeholder="e.g. 7.2.4 Atmos" />
                  </Field>
                  <Field label="Theme">
                    <Input value={formValues.theme ?? ""} onChange={(e) => setField("theme", e.target.value)} placeholder="e.g. Modern Cinema" />
                  </Field>
                  <Field label="Acoustic Package">
                    <EnumSelect value={formValues.acousticPackage ?? ""} onChange={(v) => setField("acousticPackage", v)} options={acousticPackageOptions} placeholder="Select package" />
                  </Field>
                </Rows>

                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Send Design To Customer
                </p>
                <div className="flex flex-wrap gap-2">
                  <SendButton href={waHref} label="WhatsApp" />
                  <SendButton href={mailHref} label="Email" />
                  <SendButton label="Generate PDF" />
                  <SendButton label="Generate Link" />
                  <SendButton label="Share Presentation" />
                </div>
              </SectionCard>

              <SectionCard title="Requirement & site">
                <div className="space-y-4">
                  <Field label="Requirement / System Type *" error={formErrors.requirement}>
                    <Textarea
                      value={formValues.requirement}
                      onChange={(e) => setField("requirement", e.target.value)}
                      placeholder="What does the lead need?"
                    />
                  </Field>
                  <Field label="Site Address">
                    <Textarea
                      value={formValues.siteAddress ?? ""}
                      onChange={(e) => setField("siteAddress", e.target.value)}
                      placeholder="Full site / installation address"
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Scheduling & status">
                <Rows cols={2}>
                  <Field label="Next Call Time">
                    <DateTimePicker
                      value={formValues.nextCallTime ?? ""}
                      onChange={(v) => setField("nextCallTime", v || null)}
                      placeholder="Pick next call date & time"
                    />
                  </Field>
                  <Field label="Follow-up Reminder">
                    <DateTimePicker
                      value={formValues.followupReminder ?? ""}
                      onChange={(v) => setField("followupReminder", v || null)}
                      placeholder="Set follow-up reminder"
                    />
                  </Field>
                  <Field label="Lead Priority">
                    <EnumSelect
                      value={formValues.leadPriority ?? ""}
                      onChange={(v) => setField("leadPriority", v)}
                      options={leadPriorityOptions}
                      placeholder="Select priority"
                    />
                  </Field>
                  <Field label="Status *" error={formErrors.status}>
                    <EnumSelect
                      value={formValues.status ?? ""}
                      onChange={(v) => setField("status", v)}
                      options={statusOptions}
                      placeholder="Select status"
                    />
                  </Field>
                  <Field label="Lead Score (auto)">
                    <ScoreGauge value={liveScore} />
                  </Field>
                </Rows>
                <div className="mt-4">
                  <Field label="Status Description">
                    <Textarea
                      value={formValues.statusDescription ?? ""}
                      onChange={(e) => setField("statusDescription", e.target.value)}
                      placeholder="Notes about the current status"
                    />
                  </Field>
                </div>
              </SectionCard>

            </div>

            {/* ── Right sidebar ──────────────────────────────────────── */}
            <div className="min-w-0 space-y-4">
              <SectionCard title="Lead Activities">
                {isEditMode && sortedActivities.length > 0 ? (
                  <ol className="space-y-3">
                    {sortedActivities.map((a, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cine-primary" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800 dark:text-slate-100">
                            {a.label}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(a.at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-400">
                    {isEditMode
                      ? "No activity yet."
                      : "Activity will be tracked once the lead is created."}
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Attachments">
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFiles(e.dataTransfer.files);
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-6 text-center transition-colors",
                      dragOver
                        ? "border-cine-primary bg-cine-primary/5"
                        : "border-slate-300 hover:border-cine-primary/60 dark:border-slate-700"
                    )}
                  >
                    <Upload className="h-5 w-5 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {uploading ? (
                        "Uploading…"
                      ) : (
                        <>
                          <span className="font-medium text-cine-primary">
                            Browse files
                          </span>{" "}
                          or drag &amp; drop
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Images, PDF, docs, 3D/CAD, zip, video · max 10MB each
                    </p>
                  </div>
                  {(formValues.attachments ?? []).map((a) => (
                    <div
                      key={a.fileUrl}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-cine-primary hover:underline"
                      >
                        {a.fileName}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.fileUrl)}
                        className="shrink-0 text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Quotation Tracking">
                <div className="space-y-3">
                  <Field label="Quote Sent?">
                    <YesNo
                      value={formValues.quoteSent ?? false}
                      onChange={(v) => setField("quoteSent", v === true)}
                    />
                  </Field>
                  <Field label="Quote Value">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={formValues.quoteValue ?? ""}
                        onChange={(e) => setNumber("quoteValue", e.target.value)}
                        placeholder="Enter quote value"
                      />
                    </div>
                  </Field>
                  <Field label="Quote Date">
                    <DatePicker
                      value={formValues.quoteDate ?? ""}
                      onChange={(v) => setField("quoteDate", v || null)}
                      placeholder="Select date"
                    />
                  </Field>
                  <Field label="Follow Up Date">
                    <DatePicker
                      value={formValues.followUpDate ?? ""}
                      onChange={(v) => setField("followUpDate", v || null)}
                      placeholder="Select date"
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Architect & designer">
                <Rows cols={1}>
                  <Field label="Architect Name">
                    <Input
                      value={formValues.architectName ?? ""}
                      onChange={(e) => setField("architectName", e.target.value)}
                      placeholder="Architect name"
                    />
                  </Field>
                  <Field label="Architect Contact" error={formErrors.architectContact}>
                    <PhoneField
                      countryCode={formValues.architectCountryCode}
                      number={formValues.architectContact ?? ""}
                      onCountryCodeChange={(c) => setField("architectCountryCode", c)}
                      onNumberChange={(n) => setPhone("architectContact", n)}
                      placeholder="Architect contact number"
                    />
                  </Field>
                  <Field label="Interior Designer Name">
                    <Input
                      value={formValues.designerName ?? ""}
                      onChange={(e) => setField("designerName", e.target.value)}
                      placeholder="Interior designer name"
                    />
                  </Field>
                  <Field label="Interior Designer Contact" error={formErrors.designerContact}>
                    <PhoneField
                      countryCode={formValues.designerCountryCode}
                      number={formValues.designerContact ?? ""}
                      onCountryCodeChange={(c) => setField("designerCountryCode", c)}
                      onNumberChange={(n) => setPhone("designerContact", n)}
                      placeholder="Interior designer contact"
                    />
                  </Field>
                </Rows>
              </SectionCard>

              <SectionCard title="Tags & notes">
                <Rows cols={1}>
                  <Field label="Tags / Labels">
                    <div className="space-y-2">
                      <Input
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Type a tag and press Enter"
                      />
                      {(formValues.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(formValues.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Internal Notes">
                    <Textarea
                      value={formValues.internalNotes ?? ""}
                      onChange={(e) => setField("internalNotes", e.target.value)}
                      placeholder="Add internal notes..."
                    />
                  </Field>
                </Rows>
              </SectionCard>

              {formValues.status === "CLOSED_LOST" && (
                <SectionCard title="Lost Reason" tone="lost">
                  <Field label="Reason">
                    <EnumSelect
                      value={formValues.lostReason ?? ""}
                      onChange={(v) => setField("lostReason", v)}
                      options={lostReasonOptions}
                      placeholder="Select reason"
                    />
                  </Field>
                  <p className="mt-2 text-[11px] text-slate-400">
                    (Visible when status is Lost)
                  </p>
                </SectionCard>
              )}

              {formValues.status === "CLOSED_WON" && (
                <SectionCard title="Won Details" tone="won">
                  <Field label="Project Value">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={formValues.projectValue ?? ""}
                        onChange={(e) => setNumber("projectValue", e.target.value)}
                        placeholder="Enter project value"
                      />
                    </div>
                  </Field>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Save the lead, then use Convert to Project on the lead page.
                  </p>
                </SectionCard>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fields marked * are required.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/leads")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={hasValidationErrors || isSaving}>
                {isEditMode
                  ? updateMutation.isPending
                    ? "Updating..."
                    : "Update Lead"
                  : createMutation.isPending
                    ? "Creating..."
                    : "Create Lead"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── small building blocks ──────────────────────────────────────────────── */

function extractError(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response?.data?.error === "string"
  ) {
    return (error as any).response.data.error;
  }
  return fallback;
}

/** Bordered, titled card. `tone` tints the border for Lost / Won sections. */
function SectionCard({
  title,
  tone,
  children,
}: {
  title?: string;
  tone?: "lost" | "won";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900/60",
        tone === "lost"
          ? "border-red-200 dark:border-red-900/40"
          : tone === "won"
            ? "border-emerald-200 dark:border-emerald-900/40"
            : "border-slate-200 dark:border-slate-800"
      )}
    >
      {title && (
        <p
          className={cn(
            "mb-3 text-xs font-semibold uppercase tracking-wide",
            tone === "lost"
              ? "text-red-600 dark:text-red-300"
              : tone === "won"
                ? "text-emerald-600 dark:text-emerald-300"
                : "text-slate-500 dark:text-slate-400"
          )}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/** Upload control + list for the design-file / render-image fields. */
function FileList({
  label,
  files,
  onUpload,
  onRemove,
  disabled,
}: {
  label: string;
  files: { fileName: string; fileUrl: string }[];
  onUpload: (f: FileList | null) => void;
  onRemove: (url: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <label
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-cine-primary/60 dark:border-slate-700",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <Upload className="h-4 w-4" /> Upload files
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </label>
      <p className="mt-1 text-[11px] text-slate-400">3D/CAD, images, zip, video · max 10MB each</p>
      {files.map((a) => (
        <div
          key={a.fileUrl}
          className="mt-1 flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
        >
          <a
            href={a.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-cine-primary hover:underline"
          >
            {a.fileName}
          </a>
          <button
            type="button"
            onClick={() => onRemove(a.fileUrl)}
            className="shrink-0 text-slate-400 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** A "Send Design To Customer" button — a link when href is set, else a disabled placeholder. */
function SendButton({ href, label }: { href?: string; label: string }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 opacity-60 dark:border-slate-700"
    >
      {label}
    </button>
  );
}

/** Circular lead-score gauge (0–100), colour-coded. */
function ScoreGauge({ value }: { value: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex h-10 items-center gap-2">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value}
        <span className="text-xs text-slate-400"> / 100</span>
      </span>
    </div>
  );
}

/** Responsive grid of fields inside a section. */
function Rows({ cols = 2, children }: { cols?: 1 | 2; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        cols === 2 && "sm:grid-cols-2"
      )}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={cn(
        "flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
        props.className
      )}
    />
  );
}

function EnumSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Inline segmented selector with a coloured dot per option (Hot / Warm / Cold). */
function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm",
              active
                ? "border-cine-primary bg-cine-primary/10 text-slate-900 dark:text-slate-50"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: opt.color || "#94a3b8" }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Two-button Yes / No toggle. */
function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[
        { label: "Yes", v: true },
        { label: "No", v: false },
      ].map((opt) => {
        const active = value === opt.v;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              "h-10 flex-1 rounded-md border text-sm",
              active
                ? "border-cine-primary bg-cine-primary/10 font-medium text-slate-900 dark:text-slate-50"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
