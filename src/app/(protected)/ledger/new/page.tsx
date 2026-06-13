"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ledgerKeys, useLedgerCategories } from "@/hooks/useLedger";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import { useVendors } from "@/hooks/useVendors";
import {
  createLedgerEntry,
  type CreateLedgerPayload,
  type EntryType,
  type PaymentMethod,
  type PaymentStatus,
  type RecurrenceFrequency,
} from "@/lib/api/ledger";
import type { ProjectPopulated } from "@/lib/api/projects";
import type { Customer } from "@/lib/api/customers";
import { LedgerLabourSession } from "@/components/labour/LedgerLabourSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Today's date as a YYYY-MM-DD string (local time). */
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export default function NewLedgerEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const preProjectId = searchParams.get("projectId") ?? "";
  const preCustomerId = searchParams.get("customerId") ?? "";
  const preEntryType =
    searchParams.get("entryType") === "INCOME" ? "INCOME" : "EXPENSE";
  const preCategory = searchParams.get("category") ?? "";

  // Heading reflects how you got here (Add my money / Take out vs a normal entry).
  const isOwnerIn = preCategory === "OWNER_CONTRIBUTION";
  const isOwnerOut = preCategory === "OWNER_WITHDRAWAL";
  const pageHeading = isOwnerIn
    ? "Add my money"
    : isOwnerOut
      ? "Take out money"
      : "New Ledger Entry";
  const pageSubheading = isOwnerIn
    ? "Record money you put into the business (not counted in profit)."
    : isOwnerOut
      ? "Record money you take out for personal use (not counted in profit)."
      : "Record a new income or expense entry.";

  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.data ?? [];
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];
  const accounts = usePaymentAccounts().data?.data ?? [];
  const vendors = useVendors().data?.data ?? [];

  const [form, setForm] = useState({
    entryType: preEntryType as EntryType,
    category: preCategory,
    amount: 0,
    description: "",
    entryDate: todayISO(),
    paymentMethod: "" as PaymentMethod | "",
    paymentAccountId: "",
    vendorId: "",
    itemType: "" as "GOODS" | "SERVICE" | "",
    paymentStatus: "PAID" as PaymentStatus,
    projectId: preProjectId,
    customerId: preCustomerId,
    invoiceRef: "",
    isRecurring: false,
    frequency: "MONTHLY" as RecurrenceFrequency,
    interval: 1,
    nextDueDate: "",
    endDate: "",
    // Optional extra charge/fee on top of this entry (recorded as a separate expense).
    feeMode: "percent" as "percent" | "amount",
    feeValue: "",
    feeCategory: "BANK_CHARGES" as "BANK_CHARGES" | "TAXES",
  });

  // Extra charge: enter a % of the amount OR a fixed ₹ amount. The fee in rupees:
  const feeAmount = useMemo(() => {
    const v = Number(form.feeValue);
    if (!(v > 0)) return 0;
    if (form.feeMode === "amount") return Math.round(v * 100) / 100;
    if (!(form.amount > 0)) return 0;
    return Math.round(((form.amount * v) / 100) * 100) / 100;
  }, [form.feeValue, form.feeMode, form.amount]);

  // The fee as a % of the entry amount, so the other unit is always shown.
  const feePctEquiv =
    form.amount > 0 && feeAmount > 0 ? (feeAmount / form.amount) * 100 : 0;

  const createMutation = useMutation({
    mutationFn: async ({
      main,
      fee,
    }: {
      main: CreateLedgerPayload;
      fee?: CreateLedgerPayload;
    }) => {
      await createLedgerEntry(main);
      if (fee) await createLedgerEntry(fee);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success(vars.fee ? "Entry + fee recorded" : "Ledger entry created");
      router.push("/ledger");
    },
    onError: () => toast.error("Failed to create entry"),
  });

  // "Paid through" options filtered to match the selected payment method.
  const accountType = accountTypeForMethod(form.paymentMethod);
  const visibleAccounts = accountType
    ? accounts.filter((a) => a.type === accountType)
    : accounts;
  const selectedAccount = accounts.find((a) => a._id === form.paymentAccountId);

  // Searchable-dropdown options for the long lists.
  const projectOptions = projects.map((p: ProjectPopulated) => ({
    value: p._id,
    label: p.clientName,
    hint: p.serviceType,
  }));
  const customerOptions = customers.map((c: Customer) => ({
    value: c._id,
    label: c.name,
    hint: c.place,
  }));
  const vendorOptions = vendors.map((v) => ({ value: v._id, label: v.name }));

  // When a project is chosen, the entry's customer is forced to that project's
  // customer (you can't pick a different one). Clear the project to change it.
  const selectedProject = projects.find((p) => p._id === form.projectId);
  const projectCustomerId = selectedProject?.customerId?._id ?? "";
  const customerLocked = Boolean(form.projectId && projectCustomerId);

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
    if (!form.paymentAccountId) {
      toast.error("Please choose the account it was paid through");
      return;
    }

    const payload: CreateLedgerPayload = {
      entryType: form.entryType,
      category: form.category,
      amount: form.amount,
      description: form.description,
      entryDate: form.entryDate,
      paymentStatus: form.paymentStatus,
    };
    if (form.paymentMethod) payload.paymentMethod = form.paymentMethod;
    if (form.paymentAccountId) payload.paymentAccountId = form.paymentAccountId;
    if (form.entryType === "EXPENSE") {
      if (form.vendorId) payload.vendorId = form.vendorId;
      if (form.itemType) payload.itemType = form.itemType;
    }
    if (form.projectId) payload.projectId = form.projectId;
    if (form.customerId) payload.customerId = form.customerId;
    if (form.invoiceRef) payload.invoiceRef = form.invoiceRef;
    if (form.isRecurring) {
      payload.isRecurring = true;
      payload.recurrenceRule = {
        frequency: form.frequency,
        interval: form.interval,
        nextDueDate: form.nextDueDate,
        ...(form.endDate ? { endDate: form.endDate } : {}),
      };
    }

    // Optional extra charge/fee → a separate operating EXPENSE on the same account.
    let fee: CreateLedgerPayload | undefined;
    if (feeAmount > 0) {
      fee = {
        entryType: "EXPENSE",
        category: form.feeCategory,
        amount: feeAmount,
        description: `${form.feeCategory === "TAXES" ? "Tax" : "Fee"} ${
          form.feeMode === "amount" ? `₹${feeAmount}` : `${form.feeValue}%`
        } on ${form.description.trim() || form.category}`,
        entryDate: form.entryDate,
        paymentStatus: form.paymentStatus,
        paymentAccountId: form.paymentAccountId,
      };
      if (form.paymentMethod) fee.paymentMethod = form.paymentMethod;
      if (form.projectId) fee.projectId = form.projectId;
      if (form.customerId) fee.customerId = form.customerId;
    }

    createMutation.mutate({ main: payload, fee });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {pageHeading}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {pageSubheading}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
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
              placeholder="0"
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
            placeholder="Description of the transaction"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Entry Date *">
            <DatePicker
              value={form.entryDate}
              onChange={(v) => setForm((f) => ({ ...f, entryDate: v }))}
              placeholder="Transaction date"
            />
          </Field>
          <Field label="Invoice / Reference">
            <Input
              value={form.invoiceRef}
              onChange={(e) =>
                setForm((f) => ({ ...f, invoiceRef: e.target.value }))
              }
              placeholder="INV-2026-001"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Payment Method">
            <Select
              value={form.paymentMethod || "NONE"}
              onValueChange={(v) => {
                // Ignore Radix's spurious onValueChange("") when the value has
                // no matching item yet (async lists), so it can't clear a choice.
                if (!v) return;
                const method =
                  v === "NONE" ? ("" as PaymentMethod | "") : (v as PaymentMethod);
                setForm((f) => {
                  const t = accountTypeForMethod(method);
                  const acc = accounts.find((a) => a._id === f.paymentAccountId);
                  // Drop the selected account if it no longer matches the method.
                  const keep = !f.paymentAccountId || !t || acc?.type === t;
                  return {
                    ...f,
                    paymentMethod: method,
                    paymentAccountId: keep ? f.paymentAccountId : "",
                  };
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not specified</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment Status">
            <Select
              value={form.paymentStatus}
              onValueChange={(v) =>
                v && setForm((f) => ({ ...f, paymentStatus: v as PaymentStatus }))
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

        {/* Paid through + goods/service */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Paid through (account) *">
            <Select
              value={form.paymentAccountId || "NONE"}
              onValueChange={(v) => {
                if (!v) return;
                if (v === "NONE") {
                  setForm((f) => ({ ...f, paymentAccountId: "" }));
                  return;
                }
                const acc = accounts.find((a) => a._id === v);
                setForm((f) => ({
                  ...f,
                  paymentAccountId: v,
                  paymentMethod: acc ? methodForType(acc.type) : f.paymentMethod,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not specified</SelectItem>
                {visibleAccounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name} — {a.type}
                  </SelectItem>
                ))}
                {visibleAccounts.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-slate-500">
                    No matching accounts. Add one under Payment Accounts.
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {accountDetail(selectedAccount)}
              </p>
            )}
          </Field>
          {form.entryType === "EXPENSE" && (
            <Field label="Goods or Service">
              <div className="flex gap-2">
                {(["GOODS", "SERVICE"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        itemType: f.itemType === opt ? "" : opt,
                      }))
                    }
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                      form.itemType === opt
                        ? "border-cine-primary bg-cine-primary/10 text-cine-primary"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt === "GOODS" ? "Goods" : "Service"}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>

        {form.entryType === "EXPENSE" && (
          <Field label="Vendor (optional)">
            <Combobox
              options={vendorOptions}
              value={form.vendorId}
              onChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}
              placeholder="Select vendor (e.g. KSEB)"
              searchPlaceholder="Search vendors…"
              clearable
              clearLabel="No vendor"
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project (optional)">
            <Combobox
              options={projectOptions}
              value={form.projectId}
              onChange={(v) =>
                setForm((f) => {
                  if (!v) return { ...f, projectId: "" };
                  const proj = projects.find((p) => p._id === v);
                  const cust = proj?.customerId?._id ?? "";
                  // Force the customer to the project's customer.
                  return { ...f, projectId: v, customerId: cust || f.customerId };
                })
              }
              placeholder="Select project"
              searchPlaceholder="Search projects…"
              clearable
              clearLabel="No project"
            />
          </Field>
          <Field label="Customer (optional)">
            <Combobox
              options={customerOptions}
              value={form.customerId}
              onChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
              placeholder="Select customer"
              searchPlaceholder="Search customers…"
              clearable
              clearLabel="No customer"
              disabled={customerLocked}
            />
            {customerLocked && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Set from the selected project. Clear the project to change it.
              </p>
            )}
          </Field>
        </div>

        {/* Labour-expense shortcut: log a work session for the project's labours */}
        {form.entryType === "EXPENSE" &&
          form.category === "LABOUR" &&
          form.projectId && (
            <LedgerLabourSession
              projectId={form.projectId}
              workDate={form.entryDate}
              amount={form.amount}
              paymentAccountId={form.paymentAccountId}
              onLogged={() => router.push("/ledger")}
            />
          )}

        {/* Extra charge / fee (optional) */}
        <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Extra charge / fee (optional)
          </p>
          <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            A <strong>%</strong> of the amount or a fixed <strong>₹</strong> amount.
            Recorded as a separate expense on the same account.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Charge">
              <div className="flex gap-2">
                <div className="flex h-9 shrink-0 items-center rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
                  {(["percent", "amount"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, feeMode: m }))}
                      className={`h-full rounded px-2.5 text-sm font-semibold transition ${
                        form.feeMode === m
                          ? "bg-cine-primary text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                    >
                      {m === "percent" ? "%" : "₹"}
                    </button>
                  ))}
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.feeValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, feeValue: e.target.value }))
                    }
                    placeholder={form.feeMode === "percent" ? "e.g. 2" : "e.g. 40"}
                  />
                </div>
              </div>
            </Field>
            <Field label="Charge type">
              <Select
                value={form.feeCategory}
                onValueChange={(v) =>
                  v &&
                  setForm((f) => ({
                    ...f,
                    feeCategory: v as "BANK_CHARGES" | "TAXES",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_CHARGES">Bank / card charge</SelectItem>
                  <SelectItem value="TAXES">Tax</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {feeAmount > 0 && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Fee:{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                ₹{feeAmount.toLocaleString("en-IN")}
              </span>
              {feePctEquiv > 0 ? ` (${feePctEquiv.toFixed(2)}% of the amount)` : ""}{" "}
              — added as a separate{" "}
              {form.feeCategory === "TAXES" ? "Taxes" : "Bank Charges"} expense.
            </p>
          )}
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) =>
                setForm((f) => ({ ...f, isRecurring: e.target.checked }))
              }
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-cine-primary peer-checked:after:translate-x-full dark:bg-slate-600" />
          </label>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Recurring entry
          </span>
        </div>

        {form.isRecurring && (
          <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Frequency *">
                <Select
                  value={form.frequency}
                  onValueChange={(v) =>
                    v &&
                    setForm((f) => ({
                      ...f,
                      frequency: v as RecurrenceFrequency,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Interval">
                <Input
                  type="number"
                  min={1}
                  value={form.interval}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      interval: Math.max(1, Number(e.target.value)),
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Next Due Date *">
                <DatePicker
                  value={form.nextDueDate}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, nextDueDate: v }))
                  }
                  placeholder="Next due date"
                />
              </Field>
              <Field label="End Date (optional)">
                <DatePicker
                  value={form.endDate}
                  onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
                  placeholder="End date"
                />
              </Field>
            </div>
          </div>
        )}

        {/* Info about approval */}
        {form.entryType === "EXPENSE" && form.amount >= 10000 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            This expense entry will require approval (amount exceeds the
            threshold).
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Entry"}
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

function methodForType(type: string): PaymentMethod {
  switch (type) {
    case "BANK":
      return "BANK_TRANSFER";
    case "CASH":
      return "CASH";
    case "UPI":
      return "UPI";
    case "CARD":
      return "CARD";
    default:
      return "OTHER";
  }
}

// Which account type a payment method maps to (for filtering "Paid through").
// null = no filter (show all accounts).
function accountTypeForMethod(method: string): string | null {
  switch (method) {
    case "BANK_TRANSFER":
    case "CHEQUE":
      return "BANK";
    case "CASH":
      return "CASH";
    case "UPI":
      return "UPI";
    case "CARD":
      return "CARD";
    default:
      return null;
  }
}

// Detail line shown for the selected paid-through account (bank vs UPI etc).
function accountDetail(a: {
  type: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  upiApp?: string;
  cardNetwork?: string;
  cardLast4?: string;
  notes?: string;
}): string {
  if (a.type === "BANK")
    return (
      [
        a.bankName,
        a.accountNumber ? `A/C ${a.accountNumber}` : "",
        a.ifsc ? `IFSC ${a.ifsc}` : "",
      ]
        .filter(Boolean)
        .join(" · ") || "Bank account"
    );
  if (a.type === "UPI")
    return [a.upiApp, a.upiId].filter(Boolean).join(" · ") || "UPI";
  if (a.type === "CARD")
    return (
      [a.cardNetwork, a.cardLast4 ? `••${a.cardLast4}` : ""]
        .filter(Boolean)
        .join(" · ") || "Card"
    );
  if (a.type === "CASH") return "Cash";
  return a.notes || "Other";
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

  const options = categories.map((c) => ({ value: c.value, label: c.label }));
  if (value && !known) options.unshift({ value, label: value });

  return (
    <div className="space-y-1">
      <Combobox
        options={options}
        value={value}
        onChange={(v) => onChange(v)}
        disabled={categoriesQuery.isLoading}
        searchPlaceholder="Search categories…"
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
