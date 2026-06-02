"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Phone, Plus, Search, Trash2, X } from "lucide-react";

import { vendorsKeys, useVendors } from "@/hooks/useVendors";
import {
  createVendor,
  updateVendor,
  deleteVendor,
  type Vendor,
  type VendorPayload,
} from "@/lib/api/vendors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const EMPTY = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  gstNumber: "",
  address: "",
  upiId: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  notes: "",
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const query = useVendors();
  const vendors = query.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Vendor | null>(null);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
      reset();
      toast.success("Vendor added");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Failed to add vendor"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<VendorPayload> }) =>
      updateVendor(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
      reset();
      toast.success("Vendor updated");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Failed to update vendor"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
      setPendingDelete(null);
      toast.success("Vendor deleted");
    },
    onError: () => toast.error("Failed to delete vendor"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function startEdit(v: Vendor) {
    setForm({
      name: v.name ?? "",
      contactPerson: v.contactPerson ?? "",
      phone: v.phone ?? "",
      email: v.email ?? "",
      gstNumber: v.gstNumber ?? "",
      address: v.address ?? "",
      upiId: v.upiId ?? "",
      bankName: v.bankName ?? "",
      accountNumber: v.accountNumber ?? "",
      ifsc: v.ifsc ?? "",
      notes: v.notes ?? "",
    });
    setEditingId(v._id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) {
      toast.error("Phone must be 10 digits");
      return;
    }
    const payload: VendorPayload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      address: form.address.trim() || undefined,
      upiId: form.upiId.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      accountNumber: form.accountNumber.trim() || undefined,
      ifsc: form.ifsc.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.gstNumber ?? "").toLowerCase().includes(q) ||
        (v.phone ?? "").includes(q)
    );
  }, [vendors, search]);

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
            Vendors
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Suppliers & payees (e.g. KSEB) used in your expenses.
          </p>
        </div>
        <Button onClick={() => (showForm ? reset() : setShowForm(true))}>
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Vendor
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
                placeholder="e.g. KSEB"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Contact person">
              <Input
                value={form.contactPerson}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPerson: e.target.value }))
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                placeholder="10-digit"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label="GST number">
              <Input
                value={form.gstNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gstNumber: e.target.value }))
                }
              />
            </Field>
            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Payment details (optional)
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="UPI ID">
                <Input
                  placeholder="name@bank"
                  value={form.upiId}
                  onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
                />
              </Field>
              <Field label="Bank name">
                <Input
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
              <Field label="IFSC code">
                <Input
                  value={form.ifsc}
                  onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))}
                />
              </Field>
            </div>
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
              {saving ? "Saving..." : editingId ? "Save changes" : "Add Vendor"}
            </Button>
          </div>
        </form>
      )}

      {vendors.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, GST, phone"
            className="pl-9"
          />
        </div>
      )}

      {vendors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No vendors yet. Add your suppliers / payees.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <div
              key={v._id}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cine-primary/10 text-cine-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/vendors/${v._id}`}
                  className="block truncate text-sm font-semibold text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
                >
                  {v.name}
                </Link>
                <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {v.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {v.phone}
                    </p>
                  )}
                  {v.gstNumber && <p>GST: {v.gstNumber}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => startEdit(v)}
                  aria-label="Edit"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(v)}
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
        title="Delete vendor?"
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
