"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectsKeys } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { createProject, type CreateProjectPayload } from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/lib/api/customers";

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

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project created successfully");
      router.push("/projects");
    },
    onError: () => toast.error("Failed to create project"),
  });

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((c: Customer) => c._id === customerId);
    setForm((f) => ({
      ...f,
      customerId: customerId === "NONE" ? "" : customerId,
      clientName:
        customerId !== "NONE" && customer ? customer.name : f.clientName,
    }));
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
        {/* Customer selector */}
        <Field label="Customer (optional)">
          <Select
            value={form.customerId || "NONE"}
            onValueChange={handleCustomerChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No customer</SelectItem>
              {customers.map((c: Customer) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name} — {c.place}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
