"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, Pencil, Plus, Search, Trash2, X } from "lucide-react";

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
      toast.success("Account deleted");
    },
    onError: () => toast.error("Failed to delete account"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function startEdit(a: PaymentAccount) {
    setForm({
      name: a.name ?? "",
      type: a.type,
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

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <div
              key={a._id}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
                {a.type === "CASH" ? (
                  <Banknote className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/payment-accounts/${a._id}`}
                    className="truncate text-sm font-semibold text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
                  >
                    {a.name}
                  </Link>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {a.type}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {a.bankName || a.upiId || a.notes || "—"}
                  {a.accountNumber ? ` · ${a.accountNumber}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  aria-label="Edit"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(a)}
                  aria-label="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete payment account?"
        description={`This removes "${pendingDelete?.name}". Existing ledger entries keep their data.`}
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
