"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ArrowRight } from "lucide-react";

import { ledgerKeys } from "@/hooks/useLedger";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import {
  createLedgerEntry,
  createLedgerTransfer,
  type CreateLedgerPayload,
  type TransferPayload,
} from "@/lib/api/ledger";
import type { PaymentAccount } from "@/lib/api/payment-accounts";
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

// Account-type categories for the "pay from" source (credit cards excluded — you
// can't pay a card bill with another credit card).
const FROM_TYPES = [
  { value: "BANK", label: "Bank" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Debit card" },
  { value: "OTHER", label: "Other" },
] as const;

type FromType = "" | (typeof FROM_TYPES)[number]["value"];

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function inr(n: number): string {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

export default function PayCardBillPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const accounts = usePaymentAccounts().data?.data ?? [];

  const [form, setForm] = useState({
    cardId: "",
    fromType: "" as FromType,
    fromAccountId: "",
    amount: 0,
    entryDate: todayISO(),
    description: "",
    // Optional charge/tax on the payment (e.g. a bill-pay or convenience fee).
    feeMode: "percent" as "percent" | "amount",
    feeValue: "",
    feeCategory: "BANK_CHARGES" as "BANK_CHARGES" | "TAXES",
  });

  // Credit cards you can pay a bill for; money can come from any non-credit-card
  // account (bank / cash / UPI / debit card).
  const creditCards = useMemo(
    () => accounts.filter((a) => a.type === "CARD" && a.cardType === "CREDIT"),
    [accounts]
  );
  const sourceAccounts = useMemo(
    () => accounts.filter((a) => !(a.type === "CARD" && a.cardType === "CREDIT")),
    [accounts]
  );
  // "Pay from" accounts, filtered to the chosen type category.
  const visibleSources = useMemo(
    () =>
      form.fromType
        ? sourceAccounts.filter((a) => a.type === form.fromType)
        : sourceAccounts,
    [sourceAccounts, form.fromType]
  );

  const card = accounts.find((a) => a._id === form.cardId);
  // Credit cards store a negative balance (money owed).
  const cardBalance = card?.balance ?? 0;
  const cardSpent = -cardBalance;
  const cardAvail =
    card?.creditLimit != null ? card.creditLimit + cardBalance : null;
  const availAfter =
    cardAvail != null ? cardAvail + (form.amount || 0) : null;

  // Charge: a % of the payment amount OR a fixed ₹ amount.
  const feeAmount = useMemo(() => {
    const v = Number(form.feeValue);
    if (!(v > 0)) return 0;
    if (form.feeMode === "amount") return Math.round(v * 100) / 100;
    if (!(form.amount > 0)) return 0;
    return Math.round(((form.amount * v) / 100) * 100) / 100;
  }, [form.feeValue, form.feeMode, form.amount]);
  const feePctEquiv =
    form.amount > 0 && feeAmount > 0 ? (feeAmount / form.amount) * 100 : 0;

  const payMutation = useMutation({
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
      toast.success(
        vars.fee ? "Card bill payment + fee recorded" : "Card bill payment recorded"
      );
      router.push("/payment-accounts");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to record payment";
      toast.error(message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cardId) {
      toast.error("Choose the credit card to pay");
      return;
    }
    if (!form.fromAccountId) {
      toast.error("Choose the account to pay from");
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

    const from = accounts.find((a) => a._id === form.fromAccountId);
    const transfer: TransferPayload = {
      // A transfer records money OUT of the source and INTO the card, which
      // lowers what's owed on the card and raises its available credit.
      fromAccountId: form.fromAccountId,
      toAccountId: form.cardId,
      amount: form.amount,
      entryDate: form.entryDate,
      description:
        form.description.trim() ||
        `Credit card bill payment — ${card?.name ?? "card"}${
          from ? ` from ${from.name}` : ""
        }`,
    };

    // Optional charge/tax → a separate expense on the paying account.
    let fee: CreateLedgerPayload | undefined;
    if (feeAmount > 0) {
      fee = {
        entryType: "EXPENSE",
        category: form.feeCategory,
        amount: feeAmount,
        description: `${form.feeCategory === "TAXES" ? "Tax" : "Fee"} ${
          form.feeMode === "amount" ? `₹${feeAmount}` : `${form.feeValue}%`
        } on card bill payment${card ? ` — ${card.name}` : ""}`,
        entryDate: form.entryDate,
        paymentStatus: "PAID",
        paymentAccountId: form.fromAccountId,
      };
    }

    payMutation.mutate({ transfer, fee });
  }

  const overpay = cardSpent > 0 && form.amount > cardSpent;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
          <CreditCard className="h-5 w-5 text-cine-primary" />
          Pay Credit Card Bill
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Pay a credit card bill from a bank / cash / UPI account. The paying
          account&apos;s balance goes down and the card&apos;s available credit
          goes up. This is a transfer and does <strong>not</strong> affect
          profit or loss.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        {/* Pay-from type → account */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pay from — type *">
            <Select
              value={form.fromType || "NONE"}
              onValueChange={(v) => {
                if (!v) return;
                const t = (v === "NONE" ? "" : v) as FromType;
                setForm((f) => {
                  const acc = accounts.find((a) => a._id === f.fromAccountId);
                  const keep = !f.fromAccountId || !t || acc?.type === t;
                  return {
                    ...f,
                    fromType: t,
                    fromAccountId: keep ? f.fromAccountId : "",
                  };
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bank / UPI / Cash…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">All types</SelectItem>
                {FROM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pay from — account *">
            <AccountSelect
              accounts={visibleSources}
              value={form.fromAccountId}
              exclude={form.cardId}
              placeholder="Select account"
              onChange={(v) => {
                const acc = accounts.find((a) => a._id === v);
                setForm((f) => ({
                  ...f,
                  fromAccountId: v,
                  fromType: acc ? (acc.type as FromType) : f.fromType,
                }));
              }}
            />
          </Field>
        </div>

        {/* Card to pay */}
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
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
          <div className="hidden justify-center pb-2 sm:flex">
            <ArrowRight className="h-5 w-5 text-slate-400" />
          </div>
          <Field label="Credit card (bill to pay) *">
            <AccountSelect
              accounts={creditCards}
              value={form.cardId}
              exclude={form.fromAccountId}
              placeholder="Select credit card"
              onChange={(v) => setForm((f) => ({ ...f, cardId: v }))}
            />
          </Field>
        </div>

        {creditCards.length === 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            No credit cards yet. Add one under Payment Accounts (type Card →
            Credit).
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date *">
            <DatePicker
              value={form.entryDate}
              onChange={(v) => setForm((f) => ({ ...f, entryDate: v }))}
              placeholder="Payment date"
            />
          </Field>
          <Field label="Note (optional)">
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g. February statement"
            />
          </Field>
        </div>

        {card && (
          <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3 text-sm dark:border-violet-900/50 dark:bg-violet-950/20">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-slate-500 dark:text-slate-400">
                Spent now:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {inr(cardSpent)}
                </span>
              </span>
              {cardAvail != null && (
                <span className="text-slate-500 dark:text-slate-400">
                  Available:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {inr(cardAvail)}
                  </span>
                  {form.amount > 0 && availAfter != null && (
                    <>
                      {" → "}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {inr(availAfter)}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
            {overpay && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                You&apos;re paying more than the ₹
                {cardSpent.toLocaleString("en-IN")} spent — the extra becomes a
                credit balance on the card.
              </p>
            )}
          </div>
        )}

        {/* Extra charge / fee (optional) */}
        <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Extra charge / tax (optional)
          </p>
          <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            A <strong>%</strong> of the amount or a fixed <strong>₹</strong> — e.g.
            a bill-pay or convenience charge. Recorded as a separate expense on
            the paying account.
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
              expense on the paying account.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={payMutation.isPending || creditCards.length === 0}
          >
            {payMutation.isPending ? "Recording..." : "Pay Bill"}
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
            No accounts available.
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
