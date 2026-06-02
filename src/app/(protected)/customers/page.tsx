"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Phone, Plus, Search, X } from "lucide-react";

import { customersKeys, useCustomers } from "@/hooks/useCustomers";
import { createCustomer, type Customer } from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const AVATAR_PALETTE = [
  "bg-cine-primary/15 text-cine-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
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

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", place: "" });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
      setForm({ name: "", phone: "", place: "" });
      setShowForm(false);
      toast.success("Customer added successfully");
    },
    onError: () => {
      toast.error("Failed to add customer");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.place.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate(form);
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
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
        <Button onClick={() => setShowForm((v) => !v)}>
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

      {/* Add form (ledger-style card) */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <Input
                placeholder="Customer name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </Field>
            <Field label="Phone *">
              <Input
                placeholder="+91 9XXXX XXXXX"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                required
              />
            </Field>
          </div>
          <Field label="Place *">
            <Input
              placeholder="City / Area"
              value={form.place}
              onChange={(e) =>
                setForm((f) => ({ ...f, place: e.target.value }))
              }
              required
            />
          </Field>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Customer"}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer: Customer) => (
            <CustomerCard key={customer._id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <div className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
            customer.name
          )}`}
        >
          {getInitials(customer.name)}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/customers/${customer._id}`}
            className="block truncate text-base font-semibold text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
          >
            {customer.name}
          </Link>
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3 w-3" />
            Added {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
        <p className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <a
            href={`tel:${customer.phone}`}
            className="hover:text-cine-primary"
          >
            {customer.phone}
          </a>
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{customer.place}</span>
        </p>
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
