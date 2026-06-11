"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CreditCard,
  Eye,
  Landmark,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { paymentAccountsKeys, usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import {
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  PAYMENT_ACCOUNT_TYPES,
  UPI_APPS,
  type PaymentAccount,
  type PaymentAccountPayload,
  type PaymentAccountType,
} from "@/lib/api/payment-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const EMPTY = {
  name: "",
  type: "BANK" as PaymentAccountType,
  openingBalance: "",
  bankName: "",
  accountNumber: "",
  accountHolderName: "",
  ifsc: "",
  branch: "",
  upiId: "",
  upiApp: "",
  cardNetwork: "",
  cardLast4: "",
  notes: "",
};

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

// Per-account-type colour + icon, so each card reads at a glance.
const TYPE_THEME: Record<
  string,
  { chip: string; bar: string; icon: typeof Banknote }
> = {
  BANK: {
    chip: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    bar: "bg-sky-500",
    icon: Landmark,
  },
  CASH: {
    chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    bar: "bg-emerald-500",
    icon: Banknote,
  },
  CARD: {
    chip: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    bar: "bg-violet-500",
    icon: CreditCard,
  },
  UPI: {
    chip: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    bar: "bg-indigo-500",
    icon: Smartphone,
  },
  OTHER: {
    chip: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    bar: "bg-slate-400",
    icon: Wallet,
  },
};

export default function PaymentAccountsPage() {
  const queryClient = useQueryClient();
  const query = usePaymentAccounts();
  const accounts = query.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<PaymentAccount | null>(null);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  const createMutation = useMutation({
    mutationFn: createPaymentAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAccountsKeys.all });
      reset();
      toast.success("Account added");
    },
    onError: () => toast.error("Failed to add account"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PaymentAccountPayload> }) =>
      updatePaymentAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAccountsKeys.all });
      reset();
      toast.success("Account updated");
    },
    onError: () => toast.error("Failed to update account"),
  });
  const deleteMutation = useMutation({
    mutationFn: deletePaymentAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAccountsKeys.all });
      setPendingDelete(null);
      toast.success("Account moved to trash");
    },
    onError: () => toast.error("Failed to delete account"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function startEdit(a: PaymentAccount) {
    setForm({
      name: a.name ?? "",
      type: a.type,
      openingBalance: a.openingBalance != null ? String(a.openingBalance) : "",
      bankName: a.bankName ?? "",
      accountNumber: a.accountNumber ?? "",
      accountHolderName: a.accountHolderName ?? "",
      ifsc: a.ifsc ?? "",
      branch: a.branch ?? "",
      upiId: a.upiId ?? "",
      upiApp: a.upiApp ?? "",
      cardNetwork: a.cardNetwork ?? "",
      cardLast4: a.cardLast4 ?? "",
      notes: a.notes ?? "",
    });
    setEditingId(a._id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload: PaymentAccountPayload = {
      name: form.name.trim(),
      type: form.type,
      openingBalance: form.openingBalance.trim() === "" ? 0 : Number(form.openingBalance),
      bankName: form.bankName.trim() || undefined,
      accountNumber: form.accountNumber.trim() || undefined,
      accountHolderName: form.accountHolderName.trim() || undefined,
      ifsc: form.ifsc.trim() || undefined,
      branch: form.branch.trim() || undefined,
      upiId: form.upiId.trim() || undefined,
      upiApp: form.upiApp.trim() || undefined,
      cardNetwork: form.cardNetwork.trim() || undefined,
      cardLast4: form.cardLast4.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.bankName ?? "").toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  // Total money you currently have across every account.
  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + (a.balance ?? 0), 0),
    [accounts]
  );

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Payment Accounts
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Banks, cash & UPI sources used to pay or receive.
          </p>
        </div>
        <Button onClick={() => (showForm ? reset() : setShowForm(true))}>
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Account
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <Input
                placeholder="e.g. HDFC Current"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Type *">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as PaymentAccountType }))
                }
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                {PAYMENT_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opening balance (₹)">
              <Input
                type="number"
                placeholder="Money already in this account"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openingBalance: e.target.value }))
                }
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                What&apos;s in the account right now. For a credit card use a
                negative number for what you owe.
              </p>
            </Field>
            {form.type === "BANK" && (
              <>
                <Field label="Bank name">
                  <Input
                    placeholder="e.g. HDFC Bank"
                    value={form.bankName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankName: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Account number">
                  <Input
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accountNumber: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Account holder name">
                  <Input
                    placeholder="As per bank"
                    value={form.accountHolderName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accountHolderName: e.target.value }))
                    }
                  />
                </Field>
                <Field label="IFSC code">
                  <Input
                    placeholder="e.g. HDFC0001234"
                    value={form.ifsc}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ifsc: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Branch">
                  <Input
                    value={form.branch}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, branch: e.target.value }))
                    }
                  />
                </Field>
              </>
            )}
            {form.type === "UPI" && (
              <>
                <Field label="UPI ID">
                  <Input
                    placeholder="name@bank"
                    value={form.upiId}
                    onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
                  />
                </Field>
                <Field label="UPI app">
                  <select
                    value={form.upiApp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, upiApp: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select app…</option>
                    {UPI_APPS.map((app) => (
                      <option key={app} value={app}>
                        {app}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            {form.type === "CARD" && (
              <>
                <Field label="Card network">
                  <select
                    value={form.cardNetwork}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cardNetwork: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select…</option>
                    {["Visa", "Mastercard", "RuPay", "Amex", "Other"].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Card last 4 digits">
                  <Input
                    maxLength={4}
                    placeholder="1234"
                    value={form.cardLast4}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cardLast4: e.target.value }))
                    }
                  />
                </Field>
              </>
            )}
          </div>
          <Field label="Notes">
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add Account"}
            </Button>
          </div>
        </form>
      )}

      {accounts.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cine-primary/20 bg-cine-primary/5 px-5 py-4 dark:border-cine-primary/30 dark:bg-cine-primary/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cine-primary/15 text-cine-primary">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total money you have
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              totalBalance >= 0
                ? "text-slate-900 dark:text-slate-50"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {inr(totalBalance)}
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, bank, type"
            className="pl-9"
          />
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No payment accounts yet. Add your bank / cash / UPI sources.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((a) => {
            const theme = TYPE_THEME[a.type] ?? TYPE_THEME.OTHER;
            const Icon = theme.icon;
            const subtitle =
              a.bankName ||
              a.upiId ||
              a.accountNumber ||
              a.notes ||
              "";
            return (
              <div
                key={a._id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60"
              >
                {/* type accent */}
                <div className={`h-1 w-full ${theme.bar}`} />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.chip}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/payment-accounts/${a._id}`}
                        className="block truncate text-base font-semibold text-slate-900 transition group-hover:text-cine-primary dark:text-slate-50"
                      >
                        {a.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${theme.chip}`}
                        >
                          {a.type}
                        </span>
                        {subtitle && (
                          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Balance now
                    </p>
                    <p
                      className={`mt-0.5 text-2xl font-bold tracking-tight ${
                        (a.balance ?? 0) >= 0
                          ? "text-slate-900 dark:text-slate-50"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {inr(a.balance ?? 0)}
                    </p>
                    {(a.moneyIn || a.moneyOut) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          +{inr(a.moneyIn ?? 0)} in
                        </span>
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          −{inr(a.moneyOut ?? 0)} out
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* footer actions */}
                <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                  <Link
                    href={`/payment-accounts/${a._id}`}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-cine-primary dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-cine-primary dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(a)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete payment account?"
        description={`This moves "${pendingDelete?.name}" to the Trash (restorable). Existing ledger entries keep their data.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete._id)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
