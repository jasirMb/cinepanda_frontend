"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { customersKeys, useCustomers } from "@/hooks/useCustomers";
import {
  createCustomer,
  updateCustomer,
  type Customer,
  type CreateCustomerPayload,
} from "@/lib/api/customers";
import { uploadFile } from "@/lib/api/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const AVATAR_PALETTE = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;
}

type FormState = {
  name: string;
  phone: string;
  place: string;
  email: string;
  notes: string;
  imageUrl: string;
  imageKey: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  place: "",
  email: "",
  notes: "",
  imageUrl: "",
  imageKey: "",
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setForm({
      name: c.name,
      phone: c.phone,
      place: c.place,
      email: c.email ?? "",
      notes: c.notes ?? "",
      imageUrl: c.imageUrl ?? "",
      imageKey: c.imageKey ?? "",
    });
    setEditingId(c._id);
    setShowForm(true);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const saveMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      editingId ? updateCustomer(editingId, payload) : createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
      toast.success(editingId ? "Customer updated" : "Customer added");
      resetForm();
    },
    onError: (err) =>
      toast.error(
        apiErrorMessage(err, editingId ? "Failed to update" : "Failed to add")
      ),
  });

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "avatars");
      setForm((f) => ({ ...f, imageUrl: uploaded.fileUrl, imageKey: uploaded.key }));
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.place.trim()) {
      toast.error("Name, phone and place are required");
      return;
    }
    saveMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      place: form.place.trim(),
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      imageKey: form.imageKey || undefined,
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c: Customer) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.place.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (customersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (customersQuery.isError) {
    return (
      <p className="text-red-400">Failed to load customers. Please try again.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Customers
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your customer directory.
          </p>
        </div>
        <Button onClick={() => (showForm ? resetForm() : openCreate())}>
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Customer
            </>
          )}
        </Button>
      </div>

      {/* Create / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {editingId ? "Edit customer" : "New customer"}
          </h3>

          {/* Avatar uploader */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-white transition hover:border-cine-primary dark:border-slate-600 dark:bg-slate-800 ${
                !form.imageUrl ? `bg-gradient-to-br ${avatarColor(form.name || "x")}` : ""
              }`}
            >
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold">
                  {form.name ? getInitials(form.name) : <Camera className="h-6 w-6" />}
                </span>
              )}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                <Camera className="h-5 w-5 text-white" />
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </span>
              )}
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Profile photo
              </p>
              <p>Click the avatar to {form.imageUrl ? "change" : "upload"}.</p>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, imageUrl: "", imageKey: "" }))
                  }
                  className="mt-1 inline-flex items-center gap-1 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <Input
                placeholder="Customer name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Phone * (10 digits)">
              <Input
                placeholder="9XXXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </Field>
            <Field label="Place *">
              <Input
                placeholder="City / Area"
                value={form.place}
                onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Input
              placeholder="Anything to remember about this customer"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Add Customer"}
            </Button>
          </div>
        </form>
      )}

      {/* Search bar */}
      {customers.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, place"
            className="pl-9"
          />
        </div>
      )}

      {/* Cards */}
      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No customers yet. Add your first customer above.
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No customers match your search.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((customer: Customer) => (
            <CustomerCard
              key={customer._id}
              customer={customer}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerCard({
  customer,
  onEdit,
}: {
  customer: Customer;
  onEdit: (c: Customer) => void;
}) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cine-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-1 items-start gap-3 p-4">
        {customer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.imageUrl}
            alt={customer.name}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
          />
        ) : (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${avatarColor(
              customer._id
            )}`}
          >
            {getInitials(customer.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/customers/${customer._id}`}
            className="block truncate text-base font-semibold text-slate-900 group-hover:text-cine-primary dark:text-slate-50"
          >
            {customer.name}
          </Link>
          <div className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <a href={`tel:${customer.phone}`} className="hover:text-cine-primary">
                {customer.phone}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{customer.place}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
        <Link
          href={`/customers/${customer._id}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Eye className="h-3 w-3" /> View
        </Link>
        <button
          type="button"
          onClick={() => onEdit(customer)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
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
