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
  Wifi,
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

// Per-account-type gradient + icon, so each card looks like the real thing
// (a credit card reads like a card, a bank like a bank card, etc.).
const TYPE_THEME: Record<
  string,
  { gradient: string; icon: typeof Banknote; hasChip: boolean }
> = {
  BANK: {
    gradient: "from-sky-700 via-blue-800 to-indigo-950",
    icon: Landmark,
    hasChip: true,
  },
  CASH: {
    gradient: "from-emerald-600 via-emerald-800 to-green-950",
    icon: Banknote,
    hasChip: false,
  },
  CARD: {
    gradient: "from-neutral-700 via-zinc-800 to-neutral-950",
    icon: CreditCard,
    hasChip: true,
  },
  UPI: {
    gradient: "from-violet-700 via-violet-900 to-slate-950",
    icon: Smartphone,
    hasChip: false,
  },
  OTHER: {
    gradient: "from-slate-600 via-slate-700 to-slate-900",
    icon: Wallet,
    hasChip: false,
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
            // The "card number" line, by type.
            const number =
              a.type === "CARD"
                ? `••••  ••••  ••••  ${a.cardLast4 || "••••"}`
                : a.type === "BANK"
                  ? a.accountNumber
                    ? `••••  ${a.accountNumber.slice(-4)}`
                    : ""
                  : a.type === "UPI"
                    ? a.upiId || ""
                    : "";
            // Bottom-right caption (network / bank / app).
            const caption =
              a.type === "CARD"
                ? a.cardNetwork || "Card"
                : a.type === "BANK"
                  ? a.bankName || "Bank"
                  : a.type === "UPI"
                    ? a.upiApp || "UPI"
                    : a.type === "CASH"
                      ? "Cash in hand"
                      : a.notes || "";
            const balance = a.balance ?? 0;
            return (
              <div key={a._id} className="group flex flex-col gap-2">
                {/* Card face */}
                <div
                  className={`relative flex aspect-[1.6/1] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-5 text-white shadow-xl ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-2xl ${theme.gradient}`}
                >
                  {/* glossy light sheen */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.25), transparent 45%)",
                    }}
                  />
                  {/* fine guilloché-style texture lines */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 7px)",
                    }}
                  />
                  {/* big ₹ watermark on cash for a money feel */}
                  {a.type === "CASH" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-1 -bottom-3 select-none text-[120px] font-bold leading-none text-white/10"
                    >
                      ₹
                    </span>
                  )}

                  {/* Top: identity + contactless + chip */}
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {a.name}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
                          {a.type}
                        </p>
                      </div>
                    </div>
                    {theme.hasChip && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Wifi className="h-4 w-4 rotate-90 text-white/70" />
                        <div className="relative h-7 w-9 overflow-hidden rounded-md bg-gradient-to-br from-yellow-100 via-amber-300 to-yellow-500 shadow-inner ring-1 ring-amber-200/40">
                          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-amber-800/30" />
                          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-amber-800/30" />
                          <span className="absolute left-[24%] top-[16%] h-[68%] w-px bg-amber-800/20" />
                          <span className="absolute right-[24%] top-[16%] h-[68%] w-px bg-amber-800/20" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Number / id — embossed */}
                  <p
                    className="relative truncate font-mono text-base font-medium tracking-[0.2em] text-white/95"
                    style={{ textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}
                  >
                    {number || caption}
                  </p>

                  {/* Bottom: balance + caption */}
                  <div className="relative flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-white/60">
                        Balance now
                      </p>
                      <p
                        className={`truncate text-xl font-bold ${
                          balance >= 0 ? "text-white" : "text-rose-200"
                        }`}
                        style={{ textShadow: "0 1px 1px rgba(0,0,0,0.25)" }}
                      >
                        {inr(balance)}
                      </p>
                    </div>
                    {number && caption && (
                      <p className="max-w-[45%] truncate text-right text-sm font-semibold italic tracking-wide text-white/80">
                        {caption}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1.5">
                  <Link
                    href={`/payment-accounts/${a._id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Eye className="h-3 w-3" /> View
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(a)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
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
