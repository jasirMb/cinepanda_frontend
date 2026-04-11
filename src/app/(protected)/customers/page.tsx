"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customersKeys, useCustomers } from "@/hooks/useCustomers";
import { createCustomer, type Customer } from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
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
    if (!form.name.trim() || !form.phone.trim() || !form.place.trim()) return;
    createMutation.mutate(form);
  }

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
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (customersQuery.isError) {
    return <p className="text-red-400">Failed to load customers. Please try again.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Customers
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your customer list.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add customer"}
        </Button>
      </div>

      {/* Add Customer Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <Input
              placeholder="Customer name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Phone Number
            </label>
            <Input
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Place
            </label>
            <Input
              placeholder="Place"
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </form>
      )}

      {/* Customer List */}
      {customers.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No customers yet. Add your first customer above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Phone
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Place
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Added
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: Customer) => (
                <tr
                  key={customer._id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                    {customer.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {customer.place}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
