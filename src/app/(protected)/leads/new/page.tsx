"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { leadsKeys } from "@/hooks/useLeads";
import {
  createLead,
  fetchLead,
  updateLead,
  type CreateLeadPayload
} from "@/lib/api/leads";

type Option = { label: string; value: string };

const leadSourceOptions: Option[] = [
  { label: "Meta", value: "META" },
  { label: "Youtube", value: "YOUTUBE" },
  { label: "Walk-in", value: "WALK_IN" },
  { label: "Referral", value: "REFERRAL" },
  { label: "Other", value: "OTHER" }
];

const priorityTypeOptions: Option[] = [
  { label: "Enquired", value: "ENQUIRED" },
  { label: "Takes time", value: "TAKES_TIME" },
  { label: "Urgent building", value: "URGENT_BUILD" }
];

const statusOptions: Option[] = [
  { label: "Open", value: "OPEN" },
  { label: "Closed Won", value: "CLOSED_WON" },
  { label: "Closed Lost", value: "CLOSED_LOST" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Follow up", value: "FOLLOW_UP" }
];

const initialFormValues: CreateLeadPayload = {
  customerName: "",
  place: "",
  contactNumber: "",
  leadSource: "",
  leadDate: "",
  lastUpdate: "",
  priorityType: "",
  requirement: "",
  statusDescription: "",
  status: "OPEN",
  nextCallTime: null
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

  const leadQuery = useQuery({
    queryKey: ["lead", editId],
    queryFn: () => fetchLead(editId as string),
    enabled: isEditMode
  });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
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
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => updateLead(editId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      router.push("/leads?updated=1");
    },
    onError: () => {
      toast.error("Failed to update lead. Please try again.");
    }
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
        leadSource: lead.leadSource ?? "",
        leadDate: lead.leadDate ? lead.leadDate.slice(0, 10) : "",
        lastUpdate: lead.lastUpdate ? lead.lastUpdate.slice(0, 10) : "",
        priorityType: lead.priorityType ?? "",
        requirement: lead.requirement ?? "",
        statusDescription: lead.statusDescription ?? "",
        status: lead.status ?? "OPEN",
        nextCallTime: lead.nextCallTime
          ? lead.nextCallTime.slice(0, 16)
          : null
      });
    }
  }, [leadQuery.data]);

  function validate(values: CreateLeadPayload) {
    const errors: Record<string, string> = {};

    if (!values.customerName.trim()) errors.customerName = "Customer name is required.";
    if (!values.place.trim()) errors.place = "Place is required.";

    if (!values.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required.";
    } else if (!/^[0-9+\-\s()]{6,}$/.test(values.contactNumber.trim())) {
      errors.contactNumber = "Enter a valid phone number.";
    }

    if (!values.leadSource.trim()) errors.leadSource = "Lead source is required.";
    if (!values.leadDate) errors.leadDate = "Lead date is required.";
    if (!values.lastUpdate) errors.lastUpdate = "Last update date is required.";
    if (!values.priorityType.trim()) errors.priorityType = "Priority type is required.";
    if (!values.status?.trim()) errors.status = "Status is required.";
    if (!values.requirement.trim()) errors.requirement = "Requirement is required.";
    if (!values.statusDescription.trim())
      errors.statusDescription = "Status description is required.";

    return errors;
  }

  function handleChange(field: keyof CreateLeadPayload, value: string): void {
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }));

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
        typeof formValues.nextCallTime === "string" && formValues.nextCallTime.trim() === ""
          ? null
          : formValues.nextCallTime
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {isEditMode ? "Edit lead" : "Add lead"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEditMode
              ? "Update lead details and follow-up plan."
              : "Create a new lead."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/leads">Back to leads</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {isEditMode && leadQuery.isLoading && (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Loading lead details...
          </p>
        )}
        <form className="space-y-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Customer name *
              </label>
              <Input
                value={formValues.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
              />
              {formErrors.customerName && (
                <p className="text-xs text-red-500">{formErrors.customerName}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Place *
              </label>
              <Input value={formValues.place} onChange={(e) => handleChange("place", e.target.value)} />
              {formErrors.place && (
                <p className="text-xs text-red-500">{formErrors.place}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Contact number *
              </label>
              <Input
                value={formValues.contactNumber}
                onChange={(e) => handleChange("contactNumber", e.target.value)}
              />
              {formErrors.contactNumber && (
                <p className="text-xs text-red-500">{formErrors.contactNumber}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Lead source *
              </label>
              <Select value={formValues.leadSource || undefined} onValueChange={(v) => handleChange("leadSource", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.leadSource && (
                <p className="text-xs text-red-500">{formErrors.leadSource}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Lead date *
              </label>
              <DatePicker value={formValues.leadDate} onChange={(v) => handleChange("leadDate", v)} placeholder="Select lead date" />
              {formErrors.leadDate && <p className="text-xs text-red-500">{formErrors.leadDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Last update *
              </label>
              <DatePicker value={formValues.lastUpdate} onChange={(v) => handleChange("lastUpdate", v)} placeholder="Select last update" />
              {formErrors.lastUpdate && <p className="text-xs text-red-500">{formErrors.lastUpdate}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Priority type *
              </label>
              <Select value={formValues.priorityType || undefined} onValueChange={(v) => handleChange("priorityType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.priorityType && (
                <p className="text-xs text-red-500">{formErrors.priorityType}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Status *
              </label>
              <Select value={formValues.status || undefined} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.status && (
                <p className="text-xs text-red-500">{formErrors.status}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Next call time
              </label>
              <Input
                type="datetime-local"
                value={formValues.nextCallTime ?? ""}
                onChange={(e) => handleChange("nextCallTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Requirement *
            </label>
            <textarea
              className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={formValues.requirement}
              onChange={(e) => handleChange("requirement", e.target.value)}
            />
            {formErrors.requirement && (
              <p className="text-xs text-red-500">{formErrors.requirement}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Status description *
            </label>
            <textarea
              className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={formValues.statusDescription}
              onChange={(e) => handleChange("statusDescription", e.target.value)}
            />
            {formErrors.statusDescription && (
              <p className="text-xs text-red-500">{formErrors.statusDescription}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Fields marked * are required.
            </div>
            <Button type="submit" disabled={hasValidationErrors || isSaving}>
              {isEditMode
                ? updateMutation.isPending
                  ? "Updating..."
                  : "Update lead"
                : createMutation.isPending
                ? "Creating..."
                : "Create lead"}
            </Button>
          </div>
        </form>
      </div>

    </div>
  );
}
