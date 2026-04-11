"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { quotationsKeys, useQuotations } from "@/hooks/useQuotations";
import { useTemplates } from "@/hooks/useTemplates";
import { useCustomers } from "@/hooks/useCustomers";
import {
  createQuotation,
  deleteQuotation,
  updateQuotationStatus,
  type CreateQuotationPayload,
  type Quotation,
} from "@/lib/api/quotations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

type Step = "list" | "templates" | "customer" | "details" | "preview" | "creating";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

/* ────────────────────────────────────────────
   Page
   ──────────────────────────────────────────── */

export default function QuotationsPage() {
  const queryClient = useQueryClient();

  const quotationsQuery = useQuotations();
  const templatesQuery = useTemplates();
  const customersQuery = useCustomers();

  const quotations = quotationsQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── wizard state ──────────────────────────
  const [step, setStep] = useState<Step>("list");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "50% advance required. Balance before delivery."
  );
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [validUntil, setValidUntil] = useState("");

  // Derived
  const selectedTemplates = useMemo(
    () => templates.filter((t) => selectedTemplateIds.includes(t._id)),
    [templates, selectedTemplateIds]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.place.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ── mutations ─────────────────────────────
  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      resetWizard();
      toast.success("Quotation created successfully");
    },
    onError: () => {
      setStep("preview");
      toast.error("Failed to create quotation");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      toast.success("Quotation deleted");
    },
    onError: () => {
      toast.error("Failed to delete quotation");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Quotation["status"] }) =>
      updateQuotationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // ── wizard helpers ────────────────────────
  function resetWizard() {
    setStep("list");
    setSelectedTemplateIds([]);
    setSelectedCustomerId("");
    setCustomerSearch("");
    setNotes("");
    setTermsAndConditions("50% advance required. Balance before delivery.");
    setQuotationDate(new Date().toISOString().split("T")[0]);
    setValidUntil("");
  }

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleCreate() {
    const payload: CreateQuotationPayload = {
      customerId: selectedCustomerId,
      templateIds: selectedTemplateIds,
      notes: notes.trim() || undefined,
      termsAndConditions: termsAndConditions.trim() || undefined,
      quotationDate,
      validUntil: validUntil || undefined,
    };
    setStep("creating");
    createMutation.mutate(payload);
  }

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  // ── loading / error ───────────────────────
  if (quotationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (quotationsQuery.isError) {
    return <p className="text-red-400">Failed to load quotations.</p>;
  }

  // ── WIZARD STEPS ──────────────────────────

  // Step 1: Select templates
  if (step === "templates") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Create Quotation
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 1 of 3 — Select one or more templates as options for the
            customer
          </p>
        </div>

        {templatesQuery.isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading templates...
          </p>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No templates available.{" "}
              <Link href="/templates" className="text-cine-primary underline">
                Create a template first
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((tpl) => {
              const isSelected = selectedTemplateIds.includes(tpl._id);
              return (
                <button
                  key={tpl._id}
                  type="button"
                  onClick={() => toggleTemplate(tpl._id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? "border-cine-primary bg-cine-primary/5 ring-2 ring-cine-primary/30 dark:bg-cine-primary/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {tpl.name}
                      </p>
                      {tpl.description && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {INR(tpl.grandTotal)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tpl.groups.map((g) => (
                      <span
                        key={g.name}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                  {isSelected && (
                    <p className="mt-2 text-xs font-semibold text-cine-primary">
                      Selected as Option {selectedTemplateIds.indexOf(tpl._id) + 1}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={resetWizard}>
            Cancel
          </Button>
          <Button
            disabled={selectedTemplateIds.length === 0}
            onClick={() => setStep("customer")}
          >
            Next — Select Customer
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Select customer
  if (step === "customer") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Select Customer
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 2 of 3 — Choose who this quotation is for
          </p>
        </div>

        <Input
          placeholder="Search by name, phone, or place..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
        />

        {customersQuery.isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading customers...
          </p>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No customers found.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomerId === cust._id;
                return (
                  <label
                    key={cust._id}
                    className={`flex cursor-pointer items-center gap-4 px-6 py-3 transition ${
                      isSelected
                        ? "bg-cine-primary/5 dark:bg-cine-primary/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="customer"
                      checked={isSelected}
                      onChange={() => setSelectedCustomerId(cust._id)}
                      className="h-4 w-4 shrink-0 accent-cine-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          isSelected
                            ? "font-semibold text-slate-900 dark:text-slate-50"
                            : "font-medium text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {cust.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cust.place} · {cust.phone}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("templates")}>
            Back
          </Button>
          <Button
            disabled={!selectedCustomerId}
            onClick={() => setStep("details")}
          >
            Next — Add Details
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Notes, T&C, dates
  if (step === "details") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Quotation Details
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 3 of 3 — Add notes, terms, and dates
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Quotation Date
            </label>
            <DatePicker
              value={quotationDate}
              onChange={setQuotationDate}
              placeholder="Select quotation date"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Valid Until
            </label>
            <DatePicker
              value={validUntil}
              onChange={setValidUntil}
              placeholder="Select valid until date"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="e.g. Site visit done on 10 Mar. Room is 15×12 ft."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Terms & Conditions
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("customer")}>
            Back
          </Button>
          <Button onClick={() => setStep("preview")}>Preview Quotation</Button>
        </div>
      </div>
    );
  }

  // Preview — looks like a document you'd send to a customer
  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Preview Quotation
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review before sending to the customer
            </p>
          </div>
        </div>

        {/* Document-style preview */}
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900/80">
          {/* Header */}
          <div className="border-b border-slate-200 px-8 py-6 text-center dark:border-slate-800">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              CinePanda — Quotation
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Date: {new Date(quotationDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
              {validUntil &&
                ` · Valid Until: ${new Date(validUntil).toLocaleDateString("en-IN", { dateStyle: "long" })}`}
            </p>
          </div>

          {/* Customer */}
          <div className="border-b border-slate-200 px-8 py-4 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Customer
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {selectedCustomer?.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedCustomer?.place} · {selectedCustomer?.phone}
            </p>
            {notes && (
              <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">
                {notes}
              </p>
            )}
          </div>

          {/* Options (each template = 1 option) */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {selectedTemplates.map((tpl, si) => (
              <div key={tpl._id} className="px-8 py-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Option {si + 1}: {tpl.name}
                </h3>
                {tpl.description && (
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                    {tpl.description}
                  </p>
                )}

                {tpl.groups.map((group) => (
                  <div key={group.name} className="mb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {group.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Subtotal: {INR(group.subtotal)}
                      </p>
                    </div>
                    <table className="mt-1 w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="py-1 font-medium">Item</th>
                          <th className="py-1 font-medium text-center">Qty</th>
                          <th className="py-1 font-medium text-right">
                            Unit Price
                          </th>
                          <th className="py-1 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 dark:text-slate-300">
                        {group.productItems.map((item, i) => (
                          <tr key={i}>
                            <td className="py-1">{item.productName}</td>
                            <td className="py-1 text-center">{item.quantity}</td>
                            <td className="py-1 text-right">
                              {INR(item.unitPrice)}
                            </td>
                            <td className="py-1 text-right font-medium">
                              {INR(item.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Group-level manual items */}
                    {group.manualItems.length > 0 && (
                      <div className="mt-1 space-y-0.5 rounded bg-slate-50 p-2 text-xs dark:bg-slate-800/40">
                        {group.manualItems.map((m, mi) => (
                          <div key={mi} className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>
                              {m.type === "discount" ? "−" : "+"} {m.name}
                              {m.isPercentage ? ` (${m.amount}%)` : ""}
                            </span>
                            <span className={m.type === "discount" ? "text-red-500" : ""}>
                              {m.type === "discount" ? "−" : "+"}{INR(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Template-level adjustments (GST, discounts, etc.) */}
                {tpl.manualItems.length > 0 && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Adjustments
                    </p>
                    {tpl.manualItems.map((m, mi) => (
                      <div key={mi} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span>
                          {m.type === "discount" ? "−" : "+"} {m.name}
                          {m.isPercentage ? ` (${m.amount}%)` : ""}
                        </span>
                        <span className={`font-medium ${m.type === "discount" ? "text-red-500" : ""}`}>
                          {m.type === "discount" ? "−" : "+"}
                          {m.isPercentage ? `${m.amount}%` : INR(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-2 dark:border-slate-700">
                  <p className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Option {si + 1} Total: {INR(tpl.grandTotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* T&C */}
          {termsAndConditions && (
            <div className="border-t border-slate-200 px-8 py-4 dark:border-slate-800">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Terms & Conditions
              </p>
              <p className="mt-1 whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">
                {termsAndConditions}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("details")}>
            Back
          </Button>
          <Button onClick={handleCreate}>
            Confirm & Create Quotation
          </Button>
        </div>
      </div>
    );
  }

  // Creating state
  if (step === "creating") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-700 dark:text-slate-300">
          Creating quotation...
        </p>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Quotations
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage quotations and pricing for CinePanda projects.
          </p>
        </div>
        <Button onClick={() => setStep("templates")}>
          Create Quotation
        </Button>
      </div>

      {/* Quotation cards */}
      {quotations.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No quotations yet. Create one from your templates.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotations.map((q) => (
            <QuotationCard
              key={q._id}
              quotation={q}
              onDelete={handleDelete}
              onStatusChange={(id, status) =>
                statusMutation.mutate({ id, status })
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete quotation"
        description="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────
   Quotation Card
   ──────────────────────────────────────────── */

function QuotationCard({
  quotation,
  onDelete,
  onStatusChange,
}: {
  quotation: Quotation;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Quotation["status"]) => void;
}) {
  const statusColor = STATUS_COLORS[quotation.status] ?? STATUS_COLORS.DRAFT;
  const statusMap: Record<Quotation["status"], Quotation["status"][]> = {
    DRAFT: ["SENT"],
    SENT: ["APPROVED", "REJECTED"],
    APPROVED: [],
    REJECTED: [],
  };
  const nextStatuses = statusMap[quotation.status];

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-900/60">
      <Link href={`/quotations/${quotation._id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {quotation.customerId.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {quotation.customerId.place} · {quotation.customerId.phone}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}
          >
            {quotation.status}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {quotation.sections.map((sec, i) => (
            <span
              key={i}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            >
              Option {i + 1}: {sec.sectionName} — {INR(sec.grandTotal)}
            </span>
          ))}
        </div>

        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {new Date(quotation.quotationDate).toLocaleDateString()}
          {quotation.validUntil &&
            ` · Valid until ${new Date(quotation.validUntil).toLocaleDateString()}`}
        </div>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Link
          href={`/quotations/${quotation._id}`}
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-800 shadow-sm transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          View
        </Link>

        {nextStatuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusChange(quotation._id, s)}
            className="inline-flex items-center rounded-full border border-cine-primary/30 bg-cine-primary/5 px-3 py-1 font-semibold text-cine-primary transition hover:bg-cine-primary/10 dark:border-cine-primary/40 dark:bg-cine-primary/10"
          >
            Mark {s}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onDelete(quotation._id)}
          className="ml-auto inline-flex items-center rounded-full border border-red-200 bg-white px-3 py-1 font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
