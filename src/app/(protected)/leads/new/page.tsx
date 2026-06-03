"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import {
  leadsKeys,
  useLeadSources,
  usePriorityTypes,
  useLeadStatuses,
} from "@/hooks/useLeads";
import {
  createLead,
  fetchLead,
  updateLead,
  type CreateLeadPayload,
} from "@/lib/api/leads";

type Option = { label: string; value: string };

// Fallbacks used only until the live enum lists load (values match the backend
// seed). The actual options come from the backend enum endpoints — see below.
const DEFAULT_LEAD_SOURCES: Option[] = [
  { label: "Meta", value: "META" },
  { label: "YouTube", value: "YOUTUBE" },
  { label: "Reference", value: "REFERENCE" },
  { label: "Walk-in", value: "WALKIN" },
  { label: "Other", value: "OTHER" },
];

const DEFAULT_PRIORITY_TYPES: Option[] = [
  { label: "Enquired", value: "ENQUIRED" },
  { label: "Takes Time", value: "TAKES_TIME" },
  { label: "Urgent Build", value: "URGENT_BUILD" },
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
  alternativeNumber: "",
  leadSource: "",
  leadDate: "",
  lastUpdate: "",
  priorityType: "",
  requirement: "",
  statusDescription: "",
  status: "OPEN",
  nextCallTime: null,
};

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [formValues, setFormValues] =
    useState<CreateLeadPayload>(initialFormValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Options come from the backend enums so they always match accepted values.
  const leadSourceOptions = useLeadSources().data ?? DEFAULT_LEAD_SOURCES;
  const priorityTypeOptions = usePriorityTypes().data ?? DEFAULT_PRIORITY_TYPES;
  const statusOptions = useLeadStatuses().data ?? DEFAULT_STATUSES;

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
      let message = "Failed to create lead. Please try again.";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response?.data?.error === "string"
      ) {
        message = (error as any).response.data.error;
      }
      toast.error(message);
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
    onError: () => {
      toast.error("Failed to update lead. Please try again.");
    },
  });

  const hasValidationErrors = useMemo(
    () => Object.keys(formErrors).length > 0,
    [formErrors]
  );

  useEffect(() => {
    if (leadQuery.data) {
      const lead = leadQuery.data;
      setFormValues({
        customerName: lead.customerName ?? "",
        place: lead.place ?? "",
        contactNumber: lead.contactNumber ?? "",
        alternativeNumber: lead.alternativeNumber ?? "",
        leadSource: lead.leadSource ?? "",
        leadDate: lead.leadDate ? lead.leadDate.slice(0, 10) : "",
        lastUpdate: lead.lastUpdate ? lead.lastUpdate.slice(0, 10) : "",
        priorityType: lead.priorityType ?? "",
        requirement: lead.requirement ?? "",
        statusDescription: lead.statusDescription ?? "",
        status: lead.status ?? "OPEN",
        nextCallTime: lead.nextCallTime
          ? lead.nextCallTime.slice(0, 16)
          : null,
      });
    }
  }, [leadQuery.data]);

  function validate(values: CreateLeadPayload) {
    const errors: Record<string, string> = {};

    if (!values.customerName.trim())
      errors.customerName = "Customer name is required.";
    if (!values.place.trim()) errors.place = "Place is required.";
    if (!values.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required.";
    } else if (!/^[0-9+\-\s()]{6,}$/.test(values.contactNumber.trim())) {
      errors.contactNumber = "Enter a valid phone number.";
    }
    if (
      values.alternativeNumber &&
      values.alternativeNumber.trim() !== "" &&
      !/^[0-9+\-\s()]{6,}$/.test(values.alternativeNumber.trim())
    ) {
      errors.alternativeNumber = "Enter a valid phone number.";
    }
    if (!values.leadSource.trim())
      errors.leadSource = "Lead source is required.";
    if (!values.leadDate) errors.leadDate = "Lead date is required.";
    if (!values.lastUpdate) errors.lastUpdate = "Last update date is required.";
    if (!values.priorityType.trim())
      errors.priorityType = "Priority type is required.";
    if (!values.status?.trim()) errors.status = "Status is required.";
    if (!values.requirement.trim())
      errors.requirement = "Requirement is required.";
    if (!values.statusDescription.trim())
      errors.statusDescription = "Status description is required.";

    return errors;
  }

  function handleChange(field: keyof CreateLeadPayload, value: string): void {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized: CreateLeadPayload = {
      ...formValues,
      status: (formValues.status || "OPEN").trim(),
      nextCallTime:
        typeof formValues.nextCallTime === "string" &&
        formValues.nextCallTime.trim() === ""
          ? null
          : formValues.nextCallTime,
      alternativeNumber:
        typeof formValues.alternativeNumber === "string" &&
        formValues.alternativeNumber.trim() === ""
          ? null
          : formValues.alternativeNumber?.trim(),
    };

    const nextErrors = validate(normalized);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isEditMode) {
      updateMutation.mutate(normalized);
    } else {
      createMutation.mutate(normalized);
    }
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
        <div className="max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Loading lead details...
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer Name *" error={formErrors.customerName}>
              <Input
                value={formValues.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="Full name"
              />
            </Field>
            <Field label="Place *" error={formErrors.place}>
              <Input
                value={formValues.place}
                onChange={(e) => handleChange("place", e.target.value)}
                placeholder="City / Area"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact Number *" error={formErrors.contactNumber}>
              <Input
                value={formValues.contactNumber}
                onChange={(e) => handleChange("contactNumber", e.target.value)}
                placeholder="+91 9XXXX XXXXX"
              />
            </Field>
            <Field
              label="Alternative Number"
              error={formErrors.alternativeNumber}
            >
              <Input
                value={formValues.alternativeNumber ?? ""}
                onChange={(e) =>
                  handleChange("alternativeNumber", e.target.value)
                }
                placeholder="Optional backup number"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lead Source *" error={formErrors.leadSource}>
              <Select
                value={formValues.leadSource || undefined}
                onValueChange={(v) => v && handleChange("leadSource", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Next Call Time">
              <DateTimePicker
                value={formValues.nextCallTime ?? ""}
                onChange={(v) => handleChange("nextCallTime", v)}
                placeholder="Pick next call date & time"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lead Date *" error={formErrors.leadDate}>
              <DatePicker
                value={formValues.leadDate}
                onChange={(v) => handleChange("leadDate", v)}
                placeholder="Select lead date"
              />
            </Field>
            <Field label="Last Update *" error={formErrors.lastUpdate}>
              <DatePicker
                value={formValues.lastUpdate}
                onChange={(v) => handleChange("lastUpdate", v)}
                placeholder="Select last update"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Priority Type *" error={formErrors.priorityType}>
              <Select
                value={formValues.priorityType || undefined}
                onValueChange={(v) => v && handleChange("priorityType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status *" error={formErrors.status}>
              <Select
                value={formValues.status || undefined}
                onValueChange={(v) => v && handleChange("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Requirement *" error={formErrors.requirement}>
            <textarea
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
              rows={3}
              value={formValues.requirement}
              onChange={(e) => handleChange("requirement", e.target.value)}
              placeholder="What does the lead need?"
            />
          </Field>

          <Field
            label="Status Description *"
            error={formErrors.statusDescription}
          >
            <textarea
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
              rows={3}
              value={formValues.statusDescription}
              onChange={(e) =>
                handleChange("statusDescription", e.target.value)
              }
              placeholder="Notes about the current status"
            />
          </Field>

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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
