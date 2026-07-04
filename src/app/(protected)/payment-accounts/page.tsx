"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Cpu,
  CreditCard,
  Eye,
  IndianRupee,
  Landmark,
  Link2,
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
  type CardType,
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
  cardType: "",
  creditLimit: "",
  linkedAccountId: "",
  notes: "",
};

// A small stylised QR glyph (three finder squares + data) for UPI cards.
const QR_PATTERN = [
  [1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 0],
  [1, 1, 1, 0, 1, 0, 1],
];

function QrGlyph() {
  // Bare QR (no box) — the dot matrix itself, in a frosted sky tone.
  return (
    <span className="grid grid-cols-7 gap-[1.5px]">
      {QR_PATTERN.flat().map((on, i) => (
        <span
          key={i}
          className={`h-[3px] w-[3px] rounded-[0.5px] ${
            on ? "bg-sky-400" : "bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

// Per-account-type avatar gradient + tinted type badge, like the quotation cards.
const TYPE_THEME: Record<
  string,
  { grad: string; chip: string; icon: typeof Banknote }
> = {
  BANK: {
    grad: "from-sky-500 to-blue-600",
    chip: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    icon: Landmark,
  },
  CASH: {
    grad: "from-emerald-500 to-teal-600",
    chip: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    icon: Banknote,
  },
  CARD: {
    grad: "from-amber-500 to-orange-600",
    chip: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    icon: CreditCard,
  },
  UPI: {
    grad: "from-indigo-500 to-indigo-700",
    chip: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    icon: Smartphone,
  },
  OTHER: {
    grad: "from-slate-500 to-slate-600",
    chip: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
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
      cardType: a.cardType ?? "",
      creditLimit: a.creditLimit != null ? String(a.creditLimit) : "",
      linkedAccountId: a.linkedAccountId ?? "",
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
    const isLinkedUpi = form.type === "UPI" && !!form.linkedAccountId;
    const payload: PaymentAccountPayload = {
      name: form.name.trim(),
      type: form.type,
      // A linked UPI shares the bank's balance — no opening balance of its own.
      openingBalance: isLinkedUpi
        ? 0
        : form.openingBalance.trim() === ""
          ? 0
          : Number(form.openingBalance),
      bankName: form.bankName.trim() || undefined,
      accountNumber: form.accountNumber.trim() || undefined,
      accountHolderName: form.accountHolderName.trim() || undefined,
      ifsc: form.ifsc.trim() || undefined,
      branch: form.branch.trim() || undefined,
      upiId: form.upiId.trim() || undefined,
      upiApp: form.upiApp.trim() || undefined,
      cardNetwork: form.cardNetwork.trim() || undefined,
      cardLast4: form.cardLast4.trim() || undefined,
      // Card type only applies to a CARD; credit limit only to a credit card.
      cardType: form.type === "CARD" ? (form.cardType as CardType) || null : null,
      creditLimit:
        form.type === "CARD" && form.cardType === "CREDIT" && form.creditLimit.trim() !== ""
          ? Number(form.creditLimit)
          : null,
      // Only a UPI links to a bank; clear it otherwise.
      linkedAccountId:
        form.type === "UPI" ? form.linkedAccountId || null : null,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  // Banks a UPI can be linked to (its money lives in the bank).
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type === "BANK" && a._id !== editingId),
    [accounts, editingId]
  );

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

  // Total money you currently have. Linked accounts (e.g. a UPI linked to a
  // bank) share the bank's balance, so skip them to avoid double-counting.
  const moneyAccounts = useMemo(
    () => accounts.filter((a) => !a.linkedAccountId),
    [accounts]
  );
  // Credit cards hold money you OWE, not money you have — keep them out of the
  // "money you have" total and report their dues separately.
  const isCreditCard = (a: PaymentAccount) =>
    a.type === "CARD" && a.cardType === "CREDIT";
  const ownAccounts = useMemo(
    () => moneyAccounts.filter((a) => !isCreditCard(a)),
    [moneyAccounts]
  );
  const creditCards = useMemo(
    () => moneyAccounts.filter(isCreditCard),
    [moneyAccounts]
  );
  const moneyAccountCount = ownAccounts.length;
  const totalBalance = useMemo(
    () => ownAccounts.reduce((s, a) => s + (a.balance ?? 0), 0),
    [ownAccounts]
  );
  // A credit card's balance IS the amount spent on it. So: spent = balance;
  // available (remaining) = limit − spent (only for cards with a limit set).
  const creditCardSpent = useMemo(
    () => creditCards.reduce((s, a) => s + (a.balance ?? 0), 0),
    [creditCards]
  );
  const creditCardLimitTotal = useMemo(
    () =>
      creditCards.reduce(
        (s, a) => s + (a.creditLimit != null ? a.creditLimit : 0),
        0
      ),
    [creditCards]
  );
  const creditCardAvailable = useMemo(
    () =>
      creditCards.reduce(
        (s, a) =>
          a.creditLimit != null ? s + (a.creditLimit - (a.balance ?? 0)) : s,
        0
      ),
    [creditCards]
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
            {form.type === "UPI" && form.linkedAccountId ? (
              <Field label="Opening balance (₹)">
                <div className="flex h-9 items-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                  Shared with the linked bank
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  A linked UPI uses the bank&apos;s balance, so it has no opening
                  balance of its own.
                </p>
              </Field>
            ) : form.type === "CARD" && form.cardType === "CREDIT" ? (
              <Field label="Amount spent (₹)">
                <Input
                  type="number"
                  min={0}
                  placeholder="Amount already spent on this card"
                  value={form.openingBalance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, openingBalance: e.target.value }))
                  }
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  How much of the credit limit is used. Available = limit − spent.
                </p>
              </Field>
            ) : (
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
                  What&apos;s in the account right now.
                </p>
              </Field>
            )}
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
                <Field label="Linked bank account">
                  <select
                    value={form.linkedAccountId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, linkedAccountId: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="">Not linked (own balance)</option>
                    {bankAccounts.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {bankAccounts.length === 0
                      ? "Tip: add a bank account first, then link this UPI to it."
                      : "If this UPI draws from a bank (e.g. GPay → HDFC), link it so the money is counted in that bank, not twice."}
                  </p>
                </Field>
              </>
            )}
            {form.type === "CARD" && (
              <>
                <Field label="Card type">
                  <select
                    value={form.cardType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cardType: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select…</option>
                    <option value="CREDIT">Credit card</option>
                    <option value="DEBIT">Debit card</option>
                  </select>
                </Field>
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
                {form.cardType === "CREDIT" && (
                  <Field label="Credit limit (₹)">
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 50000"
                      value={form.creditLimit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, creditLimit: e.target.value }))
                      }
                    />
                  </Field>
                )}
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
        <div className={creditCards.length > 0 ? "grid gap-4 lg:grid-cols-2" : ""}>
          {/* Your money (credit cards excluded) */}
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
                  Across {moneyAccountCount} account
                  {moneyAccountCount !== 1 ? "s" : ""}
                  {accounts.length - moneyAccounts.length > 0
                    ? ` · ${accounts.length - moneyAccounts.length} linked`
                    : ""}
                  {creditCards.length > 0
                    ? ` · ${creditCards.length} credit card${creditCards.length !== 1 ? "s" : ""} excluded`
                    : ""}
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

          {/* Credit cards — separate, card-styled panel */}
          {creditCards.length > 0 && (
            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 px-5 py-4 dark:border-violet-900/50 dark:from-violet-950/40 dark:to-fuchsia-950/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">
                      Credit cards
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {creditCards.length} card
                      {creditCards.length !== 1 ? "s" : ""}
                      {creditCardLimitTotal > 0
                        ? ` · Limit ${inr(creditCardLimitTotal)}`
                        : ""}
                    </p>
                  </div>
                </div>
                {creditCardLimitTotal > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Available
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      {inr(creditCardAvailable)}
                    </p>
                  </div>
                )}
              </div>

              {creditCardLimitTotal > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-200/70 dark:bg-violet-900/50">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            (creditCardSpent / creditCardLimitTotal) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium">
                    <span className="text-rose-600 dark:text-rose-400">
                      Spent {inr(creditCardSpent)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      of {inr(creditCardLimitTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
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
            const cardTypeLabel =
              a.cardType === "CREDIT"
                ? "Credit"
                : a.cardType === "DEBIT"
                  ? "Debit"
                  : "";
            const caption =
              a.type === "CARD"
                ? [cardTypeLabel, a.cardNetwork].filter(Boolean).join(" • ") ||
                  "Card"
                : a.type === "BANK"
                  ? a.bankName || "Bank"
                  : a.type === "UPI"
                    ? a.upiApp || "UPI"
                    : a.type === "CASH"
                      ? "Cash in hand"
                      : a.notes || "";
            const balance = a.balance ?? 0;
            return (
              <div
                key={a._id}
                className="group flex h-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cine-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                {/* round gradient avatar (quotation-card style) */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm ${theme.grad}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  {/* name · detail · type */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                        {a.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {caption || a.type}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${theme.chip}`}
                    >
                      {a.type}
                    </span>
                  </div>

                  {/* Masked number / id (subtle) */}
                  {number && (
                    <p className="font-mono text-xs tracking-wider text-slate-400 dark:text-slate-500">
                      {number}
                    </p>
                  )}

                  {/* Balance + type motif */}
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      {a.linkedAccountName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 ring-1 ring-teal-200/70 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/80">
                          <Link2 className="h-2.5 w-2.5" /> Shared
                        </span>
                      ) : (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {isCreditCard(a) ? "Spent" : "Balance now"}
                        </p>
                      )}
                      <p
                        className={`mt-0.5 text-2xl font-bold tracking-tight ${
                          a.linkedAccountName
                            ? "text-teal-600 dark:text-teal-400"
                            : balance >= 0
                              ? "text-slate-900 dark:text-slate-50"
                              : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {inr(balance)}
                      </p>
                      {a.linkedAccountName && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-teal-600/80 dark:text-teal-400/80">
                          Linked to {a.linkedAccountName}
                        </p>
                      )}
                      {a.type === "CARD" &&
                        a.cardType === "CREDIT" &&
                        a.creditLimit != null && (
                          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Limit {inr(a.creditLimit)}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {" · "}Avail {inr(a.creditLimit - balance)}
                            </span>
                          </p>
                        )}
                    </div>

                    {/* type motif — bare frosted icons, no box/border */}
                    <div className="shrink-0 self-center text-sky-400/90">
                      {(a.type === "CARD" || a.type === "BANK") && (
                        <div className="flex items-center gap-1.5">
                          <Wifi className="h-5 w-5 rotate-90" strokeWidth={2} />
                          <Cpu className="h-6 w-6" strokeWidth={2} />
                        </div>
                      )}
                      {a.type === "UPI" && <QrGlyph />}
                      {a.type === "CASH" && (
                        <IndianRupee className="h-8 w-8" strokeWidth={2.25} />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
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
