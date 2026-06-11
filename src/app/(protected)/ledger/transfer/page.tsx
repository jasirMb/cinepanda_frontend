"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowLeftRight } from "lucide-react";

import { ledgerKeys } from "@/hooks/useLedger";
import { useProjects } from "@/hooks/useProjects";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import {
  createLedgerEntry,
  createLedgerTransfer,
  type CreateLedgerPayload,
  type TransferPayload,
} from "@/lib/api/ledger";
import type { ProjectPopulated } from "@/lib/api/projects";
import type { PaymentAccount } from "@/lib/api/payment-accounts";
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

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export default function LedgerTransferPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const accounts = usePaymentAccounts().data?.data ?? [];
  const projects = useProjects().data?.data ?? [];

  const [form, setForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: 0,
    entryDate: todayISO(),
    description: "",
    projectId: "",
    // Optional charge/tax on the transfer (e.g. a card or bill-pay fee).
    feeMode: "percent" as "percent" | "amount",
    feeValue: "",
    feeCategory: "BANK_CHARGES" as "BANK_CHARGES" | "TAXES",
  });

  const fromAccount = accounts.find((a) => a._id === form.fromAccountId);
  const toAccount = accounts.find((a) => a._id === form.toAccountId);

  // Charge: a % of the transfer amount OR a fixed ₹ amount.
  const feeAmount = useMemo(() => {
    const v = Number(form.feeValue);
    if (!(v > 0)) return 0;
    if (form.feeMode === "amount") return Math.round(v * 100) / 100;
    if (!(form.amount > 0)) return 0;
    return Math.round(((form.amount * v) / 100) * 100) / 100;
  }, [form.feeValue, form.feeMode, form.amount]);
  const feePctEquiv =
    form.amount > 0 && feeAmount > 0 ? (feeAmount / form.amount) * 100 : 0;

  const transferMutation = useMutation({
    mutationFn: async ({
      transfer,
      fee,
    }: {
      transfer: TransferPayload;
      fee?: CreateLedgerPayload;
    }) => {
      await createLedgerTransfer(transfer);
      if (fee) await createLedgerEntry(fee);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success(vars.fee ? "Transfer + fee recorded" : "Transfer recorded");
      router.push("/ledger");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to record transfer";
      toast.error(message);
    },
  });

  const projectOptions = projects.map((p: ProjectPopulated) => ({
    value: p._id,
    label: p.clientName,
    hint: p.serviceType,
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fromAccountId || !form.toAccountId) {
      toast.error("Choose both a source and destination account");
      return;
    }
    if (form.fromAccountId === form.toAccountId) {
      toast.error("Source and destination must be different accounts");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!form.entryDate) {
      toast.error("Pick a date");
      return;
    }

    const payload: TransferPayload = {
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount: form.amount,
      entryDate: form.entryDate,
    };
    const desc =
      form.description.trim() ||
      (fromAccount && toAccount
        ? `Transfer from ${fromAccount.name} to ${toAccount.name}`
        : "");
    if (desc) payload.description = desc;
    if (form.projectId) payload.projectId = form.projectId;

    // Optional charge/tax on the transfer → a separate expense on the FROM account.
    let fee: CreateLedgerPayload | undefined;
    if (feeAmount > 0) {
      fee = {
        entryType: "EXPENSE",
        category: form.feeCategory,
        amount: feeAmount,
        description: `${form.feeCategory === "TAXES" ? "Tax" : "Fee"} ${
          form.feeMode === "amount" ? `₹${feeAmount}` : `${form.feeValue}%`
        } on transfer${fromAccount ? ` from ${fromAccount.name}` : ""}${
          toAccount ? ` to ${toAccount.name}` : ""
        }`,
        entryDate: form.entryDate,
        paymentStatus: "PAID",
        paymentAccountId: form.fromAccountId,
      };
      if (form.projectId) fee.projectId = form.projectId;
    }

    transferMutation.mutate({ transfer: payload, fee });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
          <ArrowLeftRight className="h-5 w-5 text-cine-primary" />
          Transfer Between Accounts
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Move money between your own accounts (e.g. credit card → project cash).
          This records both sides and does <strong>not</strong> affect profit or
          loss.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        {/* From → To */}
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Field label="From (money leaves) *">
            <AccountSelect
              accounts={accounts}
              value={form.fromAccountId}
              exclude={form.toAccountId}
              placeholder="Source account"
              onChange={(v) => setForm((f) => ({ ...f, fromAccountId: v }))}
            />
          </Field>
          <div className="hidden justify-center pb-2 sm:flex">
            <ArrowRight className="h-5 w-5 text-slate-400" />
          </div>
          <Field label="To (money arrives) *">
            <AccountSelect
              accounts={accounts}
              value={form.toAccountId}
              exclude={form.fromAccountId}
              placeholder="Destination account"
              onChange={(v) => setForm((f) => ({ ...f, toAccountId: v }))}
            />
          </Field>
        </div>

        {accounts.length < 2 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            You need at least two payment accounts to record a transfer. Add them
            under Payment Accounts.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Field label="Date *">
            <DatePicker
              value={form.entryDate}
              onChange={(v) => setForm((f) => ({ ...f, entryDate: v }))}
              placeholder="Transfer date"
            />
          </Field>
        </div>

        <Field label="Note (optional)">
          <Input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="e.g. Topping up project cash from my credit card"
          />
        </Field>

        <Field label="Link to project (optional)">
          <Combobox
            options={projectOptions}
            value={form.projectId}
            onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
            placeholder="No project"
            searchPlaceholder="Search projects…"
            clearable
            clearLabel="No project"
          />
        </Field>

        {/* Extra charge / fee on the transfer (optional) */}
        <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Extra charge / fee (optional)
          </p>
          <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            A <strong>%</strong> of the amount or a fixed <strong>₹</strong> — e.g.
            a transfer or bill-pay charge. Recorded as a separate expense on the
            “from” account.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              — separate {form.feeCategory === "TAXES" ? "Taxes" : "Bank Charges"}{" "}
              expense on {fromAccount ? fromAccount.name : "the from account"}.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={transferMutation.isPending || accounts.length < 2}
          >
            {transferMutation.isPending ? "Recording..." : "Record Transfer"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function AccountSelect({
  accounts,
  value,
  exclude,
  placeholder,
  onChange,
}: {
  accounts: PaymentAccount[];
  value: string;
  exclude?: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const options = accounts.filter((a) => a._id !== exclude);
  return (
    <Select value={value || undefined} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((a) => (
          <SelectItem key={a._id} value={a._id}>
            {a.name} — {a.type}
          </SelectItem>
        ))}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-slate-500">
            No other accounts available.
          </div>
        )}
      </SelectContent>
    </Select>
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
