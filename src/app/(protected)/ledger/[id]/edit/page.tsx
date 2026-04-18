"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ledgerKeys, useLedgerCategories, useLedgerEntry } from "@/hooks/useLedger";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import {
  updateLedgerEntry,
  type CreateLedgerPayload,
  type EntryType,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/api/ledger";
import type { ProjectPopulated } from "@/lib/api/projects";
import type { Customer } from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditLedgerEntryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  const entryQuery = useLedgerEntry(id);
  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.data ?? [];
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];

  const [form, setForm] = useState({
    entryType: "EXPENSE" as EntryType,
    category: "",
    amount: 0,
    description: "",
    entryDate: "",
    paymentMethod: "" as PaymentMethod | "",
    paymentStatus: "PAID" as PaymentStatus,
    projectId: "",
    customerId: "",
    invoiceRef: "",
  });

  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (entryQuery.data && !initialised) {
      const e = entryQuery.data;
      setForm({
        entryType: e.entryType,
        category: e.category,
        amount: e.amount,
        description: e.description,
        entryDate: e.entryDate ? e.entryDate.slice(0, 10) : "",
        paymentMethod: e.paymentMethod ?? "",
        paymentStatus: e.paymentStatus,
        projectId:
          typeof e.projectId === "object" && e.projectId
            ? e.projectId._id
            : "",
        customerId:
          typeof e.customerId === "object" && e.customerId
            ? e.customerId._id
            : "",
        invoiceRef: e.invoiceRef ?? "",
      });
      setInitialised(true);
    }
  }, [entryQuery.data, initialised]);

  const mutation = useMutation({
    mutationFn: (payload: typeof form) => {
      const cleaned: Partial<CreateLedgerPayload> = {
        ...payload,
        paymentMethod: payload.paymentMethod || undefined,
        projectId: payload.projectId || undefined,
        customerId: payload.customerId || undefined,
        invoiceRef: payload.invoiceRef || undefined,
      };
      return updateLedgerEntry(id, cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success("Entry updated");
      router.push("/ledger");
    },
    onError: () => toast.error("Failed to update entry"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category.trim() || !form.description.trim() || !form.entryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    mutation.mutate(form);
  }

  if (entryQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full max-w-2xl rounded-lg" />
      </div>
    );
  }

  if (entryQuery.isError) {
    return <p className="text-red-400">Failed to load entry.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Edit Ledger Entry
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Update this ledger entry.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        {/* Type toggle */}
        <Field label="Entry Type *">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(["INCOME", "EXPENSE"] as EntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  form.entryType === t
                    ? t === "INCOME"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
                onClick={() =>
                  setForm((f) =>
                    f.entryType === t ? f : { ...f, entryType: t, category: "" }
                  )
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category *">
            <CategorySelect
              entryType={form.entryType}
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            />
          </Field>
          <Field label="Amount (INR) *">
            <Input
              type="number"
              min={1}
              value={form.amount || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: Number(e.target.value) }))
              }
              required
            />
          </Field>
        </div>

        <Field label="Description *">
          <textarea
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Entry Date *">
            <DatePicker
              value={form.entryDate}
              onChange={(v) => setForm((f) => ({ ...f, entryDate: v }))}
            />
          </Field>
          <Field label="Invoice / Reference">
            <Input
              value={form.invoiceRef}
              onChange={(e) =>
                setForm((f) => ({ ...f, invoiceRef: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Payment Method">
            <Select
              value={form.paymentMethod || "NONE"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  paymentMethod: v === "NONE" ? "" : (v as PaymentMethod),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not specified</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment Status">
            <Select
              value={form.paymentStatus}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, paymentStatus: v as PaymentStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project (optional)">
            <Select
              value={form.projectId || "NONE"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, projectId: v === "NONE" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No project</SelectItem>
                {projects.map((p: ProjectPopulated) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.clientName} — {p.serviceType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Customer (optional)">
            <Select
              value={form.customerId || "NONE"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, customerId: v === "NONE" ? "" : v }))
              }
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
        </div>

        {/* Approval re-evaluation warning */}
        {form.entryType === "EXPENSE" && form.amount >= 10000 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            This expense entry will require approval (amount exceeds the
            threshold). Approval status may be re-evaluated on save.
          </div>
        )}

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

function CategorySelect({
  entryType,
  value,
  onChange,
}: {
  entryType: EntryType;
  value: string;
  onChange: (v: string) => void;
}) {
  const categoriesQuery = useLedgerCategories(entryType);
  const categories = categoriesQuery.data?.data ?? [];
  const known = categories.some((c) => c.value === value);
  const isEmpty =
    !categoriesQuery.isLoading &&
    !categoriesQuery.isError &&
    categories.length === 0;

  return (
    <div className="space-y-1">
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              categoriesQuery.isLoading
                ? "Loading categories..."
                : categoriesQuery.isError
                  ? "Failed to load categories"
                  : isEmpty
                    ? "No categories available"
                    : "Select category"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {value && !known && <SelectItem value={value}>{value}</SelectItem>}
          {categories.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categoriesQuery.isError && (
        <p className="text-xs text-red-500">
          Could not load categories from /api/ledger/categories.
        </p>
      )}
      {isEmpty && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No {entryType.toLowerCase()} categories returned. Seed them on the
          backend: <code>npm run populate-ledger-categories</code>
        </p>
      )}
    </div>
  );
}
