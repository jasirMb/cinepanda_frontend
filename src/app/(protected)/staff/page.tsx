"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  IdCard,
  IndianRupee,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Wallet,
} from "lucide-react";

import { staffKeys, useStaff, useStaffOverview } from "@/hooks/useStaff";
import {
  createStaff,
  updateStaff,
  deleteStaff,
  type Staff,
  type StaffPayload,
  type StaffOverview,
} from "@/lib/api/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

const EMPTY = {
  name: "",
  designation: "",
  monthlySalary: "",
  phone: "",
  joiningDate: "",
};

export default function StaffPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);

  const staffQuery = useStaff();
  const staff = staffQuery.data ?? [];
  const overviewQuery = useStaffOverview(year, month);
  const overviewById = useMemo(() => {
    const m = new Map<string, StaffOverview>();
    for (const o of overviewQuery.data?.data ?? []) m.set(o.staff._id, o);
    return m;
  }, [overviewQuery.data]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Staff | null>(null);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: staffKeys.all });
  }

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      invalidate();
      reset();
      toast.success("Staff added");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to add staff"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StaffPayload> }) =>
      updateStaff(id, payload),
    onSuccess: () => {
      invalidate();
      reset();
      toast.success("Staff updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to update staff"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
      toast.success("Staff moved to trash");
    },
    onError: () => toast.error("Failed to delete staff"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function startEdit(s: Staff) {
    setForm({
      name: s.name ?? "",
      designation: s.designation ?? "",
      monthlySalary: s.monthlySalary != null ? String(s.monthlySalary) : "",
      phone: s.phone ?? "",
      joiningDate: s.joiningDate ? s.joiningDate.slice(0, 10) : "",
    });
    setEditingId(s._id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload: StaffPayload = {
      name: form.name.trim(),
      designation: form.designation.trim() || undefined,
      monthlySalary:
        form.monthlySalary.trim() === "" ? 0 : Number(form.monthlySalary),
      phone: form.phone.trim() || undefined,
      joiningDate: form.joiningDate || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Staff
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Salaried team — mark daily attendance and see what each person earns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/staff/settings">
            <Button variant="outline" className="gap-1.5">
              <Settings className="h-4 w-4" /> Holiday settings
            </Button>
          </Link>
          <Button
            className="gap-1.5"
            onClick={() => {
              reset();
              setShowForm((v) => !v);
            }}
          >
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </div>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" /> Month
        </span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {editingId ? "Edit staff" : "New staff"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </Field>
            <Field label="Designation">
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, designation: e.target.value }))
                }
                placeholder="e.g. Editor, Manager"
              />
            </Field>
            <Field label="Monthly salary (₹)">
              <Input
                type="number"
                min={0}
                value={form.monthlySalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monthlySalary: e.target.value }))
                }
                placeholder="e.g. 30000"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit"
              />
            </Field>
            <Field label="Joining date">
              <Input
                type="date"
                value={form.joiningDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, joiningDate: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add Staff"}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {staffQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No staff yet. Add your salaried team members.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {staff.map((s) => {
            const ov = overviewById.get(s._id);
            return (
              <div
                key={s._id}
                className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cine-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cine-primary to-indigo-600 text-white shadow-sm">
                    <IdCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/staff/${s._id}`}
                      className="block truncate text-base font-semibold text-slate-900 transition group-hover:text-cine-primary dark:text-slate-50"
                    >
                      {s.name}
                    </Link>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {s.designation || "—"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <IndianRupee className="h-3 w-3" />
                    {(s.monthlySalary ?? 0).toLocaleString("en-IN")}/mo
                  </span>
                </div>

                {/* This month */}
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
                  {overviewQuery.isLoading || !ov ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Worked (paid)
                          </p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {ov.paidDays}
                            <span className="font-normal text-slate-400">
                              {" "}
                              / {ov.workingDays} days
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Earned
                          </p>
                          <p className="inline-flex items-center gap-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
                            <Wallet className="h-3.5 w-3.5" />
                            {inr(ov.earned)}
                          </p>
                        </div>
                      </div>
                      {!ov.paid && (ov.earned ?? 0) > 0 && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Need to pay salary
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Link
                    href={`/staff/${s._id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Eye className="h-3 w-3" /> Attendance
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(s)}
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
        title="Delete staff?"
        description={`This moves "${pendingDelete?.name}" to the Trash. Their attendance records are kept.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete._id)}
      />
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
