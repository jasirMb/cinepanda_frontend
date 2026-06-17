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

// Comprehensive list of countries with country codes and emoji flags
const COUNTRY_CODE_OPTIONS: Option[] = [
  // Asia
  { label: "🇮🇳 India (+91)", value: "+91" },
  { label: "🇨🇳 China (+86)", value: "+86" },
  { label: "🇯🇵 Japan (+81)", value: "+81" },
  { label: "🇰🇷 South Korea (+82)", value: "+82" },
  { label: "🇲🇾 Malaysia (+60)", value: "+60" },
  { label: "🇸🇬 Singapore (+65)", value: "+65" },
  { label: "🇹🇭 Thailand (+66)", value: "+66" },
  { label: "🇮🇩 Indonesia (+62)", value: "+62" },
  { label: "🇵🇭 Philippines (+63)", value: "+63" },
  { label: "🇻🇳 Vietnam (+84)", value: "+84" },
  { label: "🇧🇩 Bangladesh (+880)", value: "+880" },
  { label: "🇵🇰 Pakistan (+92)", value: "+92" },
  { label: "🇱🇰 Sri Lanka (+94)", value: "+94" },
  { label: "🇦🇪 UAE (+971)", value: "+971" },
  { label: "🇶🇦 Qatar (+974)", value: "+974" },
  { label: "🇸🇦 Saudi Arabia (+966)", value: "+966" },
  { label: "🇰🇼 Kuwait (+965)", value: "+965" },
  { label: "🇧🇭 Bahrain (+973)", value: "+973" },
  { label: "🇴🇲 Oman (+968)", value: "+968" },
  { label: "🇮🇱 Israel (+972)", value: "+972" },
  { label: "🇹🇷 Turkey (+90)", value: "+90" },
  // Africa
  { label: "🇲🇦 Morocco (+212)", value: "+212" },
  { label: "🇪🇬 Egypt (+20)", value: "+20" },
  { label: "🇳🇬 Nigeria (+234)", value: "+234" },
  { label: "🇿🇦 South Africa (+27)", value: "+27" },
  { label: "🇰🇪 Kenya (+254)", value: "+254" },
  { label: "🇺🇬 Uganda (+256)", value: "+256" },
  { label: "🇹🇿 Tanzania (+255)", value: "+255" },
  { label: "🇬🇭 Ghana (+233)", value: "+233" },
  { label: "🇨🇲 Cameroon (+237)", value: "+237" },
  { label: "🇪🇹 Ethiopia (+251)", value: "+251" },
  { label: "🇹🇳 Tunisia (+216)", value: "+216" },
  { label: "🇩🇿 Algeria (+213)", value: "+213" },
  { label: "🇨🇬 Congo (+242)", value: "+242" },
  { label: "🇦🇴 Angola (+244)", value: "+244" },
  { label: "🇲🇿 Mozambique (+258)", value: "+258" },
  { label: "🇿🇲 Zambia (+260)", value: "+260" },
  { label: "🇿🇼 Zimbabwe (+263)", value: "+263" },
  { label: "🇸🇩 Sudan (+249)", value: "+249" },
  // Europe
  { label: "🇬🇧 UK (+44)", value: "+44" },
  { label: "🇫🇷 France (+33)", value: "+33" },
  { label: "🇮🇹 Italy (+39)", value: "+39" },
  { label: "🇩🇪 Germany (+49)", value: "+49" },
  { label: "🇪🇸 Spain (+34)", value: "+34" },
  { label: "🇳🇱 Netherlands (+31)", value: "+31" },
  { label: "🇧🇪 Belgium (+32)", value: "+32" },
  { label: "🇨🇭 Switzerland (+41)", value: "+41" },
  { label: "🇦🇹 Austria (+43)", value: "+43" },
  { label: "🇩🇰 Denmark (+45)", value: "+45" },
  { label: "🇸🇪 Sweden (+46)", value: "+46" },
  { label: "🇳🇴 Norway (+47)", value: "+47" },
  { label: "🇵🇱 Poland (+48)", value: "+48" },
  { label: "🇫🇮 Finland (+358)", value: "+358" },
  { label: "🇮🇪 Ireland (+353)", value: "+353" },
  { label: "🇬🇷 Greece (+30)", value: "+30" },
  { label: "🇭🇺 Hungary (+36)", value: "+36" },
  { label: "🇷🇴 Romania (+40)", value: "+40" },
  { label: "🇨🇿 Czech Republic (+420)", value: "+420" },
  { label: "🇷🇺 Russia (+7)", value: "+7" },
  { label: "🇺🇦 Ukraine (+380)", value: "+380" },
  { label: "🇧🇬 Bulgaria (+359)", value: "+359" },
  { label: "🇭🇷 Croatia (+385)", value: "+385" },
  { label: "🇲🇰 North Macedonia (+389)", value: "+389" },
  // Americas
  { label: "🇺🇸 USA (+1)", value: "+1" },
  { label: "🇨🇦 Canada (+1)", value: "+1" },
  { label: "🇲🇽 Mexico (+52)", value: "+52" },
  { label: "🇧🇷 Brazil (+55)", value: "+55" },
  { label: "🇨🇱 Chile (+56)", value: "+56" },
  { label: "🇨🇴 Colombia (+57)", value: "+57" },
  { label: "🇦🇷 Argentina (+54)", value: "+54" },
  { label: "🇵🇪 Peru (+51)", value: "+51" },
  { label: "🇻🇪 Venezuela (+58)", value: "+58" },
  { label: "🇧🇴 Bolivia (+591)", value: "+591" },
  { label: "🇬🇾 Guyana (+592)", value: "+592" },
  { label: "🇪🇨 Ecuador (+593)", value: "+593" },
  { label: "🇵🇾 Paraguay (+595)", value: "+595" },
  { label: "🇺🇾 Uruguay (+598)", value: "+598" },
  { label: "🇧🇸 Bahamas (+1-242)", value: "+1-242" },
  { label: "🇧🇧 Barbados (+1-246)", value: "+1-246" },
  { label: "🇹🇹 Trinidad and Tobago (+1-868)", value: "+1-868" },
  // Oceania
  { label: "🇦🇺 Australia (+61)", value: "+61" },
  { label: "🇳🇿 New Zealand (+64)", value: "+64" },
  { label: "🇵🇬 Papua New Guinea (+675)", value: "+675" },
  { label: "🇫🇯 Fiji (+679)", value: "+679" },
  { label: "🇹🇻 Tuvalu (+688)", value: "+688" },
];

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
  contactCountryCode: "+91",
  alternativeNumber: "",
  alternativeCountryCode: "+91",
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
        contactCountryCode: lead.contactCountryCode ?? "+91",
        alternativeNumber: lead.alternativeNumber ?? "",
        alternativeCountryCode: lead.alternativeCountryCode ?? "+91",
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
    
    // Validate contact number and country code
    if (!values.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required.";
    } else if (!/^[0-9\-\s()]{6,}$/.test(values.contactNumber.trim())) {
      errors.contactNumber = "Enter a valid phone number (digits only).";
    }
    if (!values.contactCountryCode?.trim()) {
      errors.contactCountryCode = "Country code is required.";
    }
    
    // Validate alternative number if provided
    if (
      values.alternativeNumber &&
      values.alternativeNumber.trim() !== ""
    ) {
      if (!/^[0-9\-\s()]{6,}$/.test(values.alternativeNumber.trim())) {
        errors.alternativeNumber = "Enter a valid phone number (digits only).";
      }
      if (!values.alternativeCountryCode?.trim()) {
        errors.alternativeCountryCode = "Country code is required if alternative number is provided.";
      }
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
    // Strip spaces from phone number fields (handles iPhone format: +91 12345 67890)
    let cleanedValue = value;
    if ((field === 'contactNumber' || field === 'alternativeNumber') && value) {
      cleanedValue = value.replace(/\s+/g, ''); // Remove all whitespace
    }
    
    setFormValues((prev) => ({ ...prev, [field]: cleanedValue }));
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
      contactCountryCode: formValues.contactCountryCode || "+91",
      // Strip spaces from phone numbers (handles iPhone paste format)
      contactNumber: formValues.contactNumber?.replace(/\s+/g, '') || '',
      nextCallTime:
        typeof formValues.nextCallTime === "string" &&
        formValues.nextCallTime.trim() === ""
          ? null
          : formValues.nextCallTime,
      alternativeNumber:
        typeof formValues.alternativeNumber === "string" &&
        formValues.alternativeNumber.trim() === ""
          ? null
          : formValues.alternativeNumber?.trim().replace(/\s+/g, ''),
      alternativeCountryCode:
        typeof formValues.alternativeNumber === "string" &&
        formValues.alternativeNumber.trim() === ""
          ? null
          : formValues.alternativeCountryCode,
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

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <Field label="Country Code *" error={formErrors.contactCountryCode}>
                  <Select
                    value={formValues.contactCountryCode || undefined}
                    onValueChange={(v) => v && handleChange("contactCountryCode", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Contact Number *" error={formErrors.contactNumber}>
                  <Input
                    value={formValues.contactNumber}
                    onChange={(e) => handleChange("contactNumber", e.target.value)}
                    placeholder="9XXXX XXXXX"
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <Field label="Alt Country Code" error={formErrors.alternativeCountryCode}>
                  <Select
                    value={formValues.alternativeCountryCode || undefined}
                    onValueChange={(v) => v && handleChange("alternativeCountryCode", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-3">
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
            </div>
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

// Export country codes so they can be used in other components if needed
export { COUNTRY_CODE_OPTIONS };
