"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectsKeys, useProject } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { updateProject } from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/lib/api/customers";

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectQuery = useProject(id);
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];

  const [form, setForm] = useState({
    clientName: "",
    serviceType: "",
    projectValue: 0,
    description: "",
    notes: "",
    customerId: "",
    startDate: "",
    expectedCompletionDate: "",
  });

  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (projectQuery.data && !initialised) {
      const p = projectQuery.data;
      setForm({
        clientName: p.clientName,
        serviceType: p.serviceType,
        projectValue: p.projectValue,
        description: p.description ?? "",
        notes: p.notes ?? "",
        customerId:
          typeof p.customerId === "object" && p.customerId
            ? p.customerId._id
            : "",
        startDate: p.startDate ? p.startDate.slice(0, 10) : "",
        expectedCompletionDate: p.expectedCompletionDate
          ? p.expectedCompletionDate.slice(0, 10)
          : "",
      });
      setInitialised(true);
    }
  }, [projectQuery.data, initialised]);

  const mutation = useMutation({
    mutationFn: (payload: typeof form) => updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project updated");
      router.push(`/projects/${id}`);
    },
    onError: () => toast.error("Failed to update project"),
  });

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
    mutation.mutate(form);
  }

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full max-w-2xl rounded-lg" />
      </div>
    );
  }

  if (projectQuery.isError) {
    return <p className="text-red-400">Failed to load project.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Edit Project
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Update project details for {projectQuery.data?.clientName}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        <Field label="Customer (optional)">
          <Select
            value={form.customerId || "NONE"}
            onValueChange={(v) => {
              const cust = customers.find((c: Customer) => c._id === v);
              setForm((f) => ({
                ...f,
                customerId: v === "NONE" ? "" : v,
                clientName:
                  v !== "NONE" && cust ? cust.name : f.clientName,
              }));
            }}
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
            required
          />
        </Field>

        <Field label="Service Type *">
          <Input
            value={form.serviceType}
            onChange={(e) =>
              setForm((f) => ({ ...f, serviceType: e.target.value }))
            }
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
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Start Date *">
            <DatePicker
              value={form.startDate}
              onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
            />
          </Field>
          <Field label="Expected Completion *">
            <DatePicker
              value={form.expectedCompletionDate}
              onChange={(v) =>
                setForm((f) => ({ ...f, expectedCompletionDate: v }))
              }
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </Field>

        <Field label="Notes">
          <textarea
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
            rows={2}
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
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
