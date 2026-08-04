"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectsKeys } from "@/hooks/useProjects";
import { useCustomers, customersKeys } from "@/hooks/useCustomers";
import { createProject, type CreateProjectPayload } from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneField } from "@/components/ui/phone-field";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { createCustomer, type Customer } from "@/lib/api/customers";
import { DEFAULT_COUNTRY_CODE } from "@/lib/country-codes";

const EMPTY_FORM: CreateProjectPayload = {
  clientName: "",
  serviceType: "",
  projectValue: 0,
  description: "",
  notes: "",
  customerId: "",
  startDate: "",
  expectedCompletionDate: "",
};

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];

  const [form, setForm] = useState<CreateProjectPayload>({ ...EMPTY_FORM });

  // Inline "create customer" mini-form, so you don't have to leave the page.
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    place: "",
    email: "",
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project created successfully");
      router.push("/projects");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (created: Customer) => {
      // Add to the cached list immediately so the picker shows it, then refetch.
      queryClient.setQueryData(
        customersKeys.list(),
        (old: { data?: Customer[] } | undefined) =>
          old ? { ...old, data: [created, ...(old.data ?? [])] } : old
      );
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
      // Select the new customer + prefill the client name.
      setForm((f) => ({ ...f, customerId: created._id, clientName: created.name }));
      setShowNewCustomer(false);
      setNewCustomer({
        name: "",
        phone: "",
        countryCode: DEFAULT_COUNTRY_CODE,
        place: "",
        email: "",
      });
      toast.success("Customer created");
    },
    onError: () => toast.error("Failed to create customer"),
  });

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((c: Customer) => c._id === customerId);
    setForm((f) => ({
      ...f,
      customerId,
      clientName: customer ? customer.name : f.clientName,
    }));
  }

  function handleCreateCustomer() {
    if (
      !newCustomer.name.trim() ||
      !newCustomer.place.trim() ||
      !/^\d{5,15}$/.test(newCustomer.phone.trim())
    ) {
      toast.error("Name, place and a valid phone are required");
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim(),
      countryCode: newCustomer.countryCode,
      place: newCustomer.place.trim(),
      ...(newCustomer.email.trim() ? { email: newCustomer.email.trim() } : {}),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.clientName.trim() ||
      !form.serviceType.trim() ||
      !form.startDate ||
      !form.expectedCompletionDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    const payload = { ...form };
    if (!payload.customerId) delete payload.customerId;
    if (!payload.description) delete payload.description;
    if (!payload.notes) delete payload.notes;
    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          New Project
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Create a new installation project.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        {/* Customer selector + inline create */}
        <Field label="Customer (optional)">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Combobox
                options={customers.map((c: Customer) => ({
                  value: c._id,
                  label: c.name,
                  hint: c.place,
                }))}
                value={form.customerId}
                onChange={handleCustomerChange}
                placeholder="Select customer"
                searchPlaceholder="Search customers…"
                clearable
                clearLabel="No customer"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewCustomer((s) => !s)}
            >
              {showNewCustomer ? "Close" : "+ New"}
            </Button>
          </div>

          {showNewCustomer && (
            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                New customer
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Name *"
                />
                <PhoneField
                  countryCode={newCustomer.countryCode}
                  number={newCustomer.phone}
                  onCountryCodeChange={(code) =>
                    setNewCustomer((c) => ({ ...c, countryCode: code }))
                  }
                  onNumberChange={(n) =>
                    setNewCustomer((c) => ({ ...c, phone: n }))
                  }
                  placeholder="Phone *"
                />
                <Input
                  value={newCustomer.place}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, place: e.target.value }))
                  }
                  placeholder="Place *"
                />
                <Input
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, email: e.target.value }))
                  }
                  placeholder="Email (optional)"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCustomer}
                  disabled={createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending
                    ? "Saving…"
                    : "Save customer"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewCustomer(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Field>

        <Field label="Client Name *">
          <Input
            value={form.clientName}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientName: e.target.value }))
            }
            placeholder="Client name"
            required
          />
        </Field>

        <Field label="Service Type *">
          <Input
            value={form.serviceType}
            onChange={(e) =>
              setForm((f) => ({ ...f, serviceType: e.target.value }))
            }
            placeholder="e.g. HOME_THEATER"
            required
          />
        </Field>

        <Field label="Project Value (INR) *">
          <Input
            type="number"
            min={0}
            value={form.projectValue || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                projectValue: Number(e.target.value),
              }))
            }
            placeholder="0"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Start Date *">
            <DatePicker
              value={form.startDate}
              onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
              placeholder="Start date"
            />
          </Field>
          <Field label="Expected Completion *">
            <DatePicker
              value={form.expectedCompletionDate}
              onChange={(v) =>
                setForm((f) => ({ ...f, expectedCompletionDate: v }))
              }
              placeholder="Completion date"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
            rows={3}
            value={form.description ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Project description"
          />
        </Field>

        <Field label="Notes">
          <textarea
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            placeholder="Additional notes"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
