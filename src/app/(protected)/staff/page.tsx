"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  staffKeys,
  useStaff,
  useStaffOverview,
  useHolidaySettings,
} from "@/hooks/useStaff";
import {
  createStaff,
  updateStaff,
  deleteStaff,
  type Staff,
  type StaffPayload,
  type StaffOverview,
} from "@/lib/api/staff";
import { uploadFile, deleteFile } from "@/lib/api/files";
import { compressImageToLimit } from "@/lib/compress-image";
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

const AVATAR_PALETTE = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
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
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** With an ordinal suffix, e.g. 1 → "1st", 2 → "2nd". */
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Salary is paid in arrears: a month's salary is credited on `salaryDay` of the
 * NEXT month (e.g. May's salary is due 1 Jun). It's "due" once that date passes.
 */
function salaryDue(year: number, month: number, salaryDay?: number): boolean {
  const day = salaryDay && salaryDay >= 1 ? salaryDay : 1;
  let dy = year;
  let dm = month + 1;
  if (dm > 12) {
    dm = 1;
    dy += 1;
  }
  const lastDay = new Date(Date.UTC(dy, dm, 0)).getUTCDate();
  const credit = new Date(Date.UTC(dy, dm - 1, Math.min(day, lastDay)));
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return today >= credit;
}

const EMPTY = {
  name: "",
  designation: "",
  monthlySalary: "",
  salaryDay: "",
  workHours: "",
  overtimeRate: "",
  phone: "",
  joiningDate: "",
  avatarUrl: "",
  avatarKey: "",
};

export default function StaffPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);

  const staffQuery = useStaff();
  const staff = staffQuery.data ?? [];
  const settings = useHolidaySettings().data;
  const overviewQuery = useStaffOverview(year, month);
  const overviewById = useMemo(() => {
    const m = new Map<string, StaffOverview>();
    for (const o of overviewQuery.data?.data ?? []) m.set(o.staff._id, o);
    return m;
  }, [overviewQuery.data]);

  // Previous month — salary is paid in arrears, so the prior month's unpaid
  // salary is the one that's actually due now. Surface it on each card.
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevOverviewQuery = useStaffOverview(prevYear, prevMonth);
  const prevById = useMemo(() => {
    const m = new Map<string, StaffOverview>();
    for (const o of prevOverviewQuery.data?.data ?? []) m.set(o.staff._id, o);
    return m;
  }, [prevOverviewQuery.data]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Staff | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    let toUpload = file;
    if (file.size > MAX_AVATAR_BYTES) {
      try {
        toUpload = await compressImageToLimit(file, MAX_AVATAR_BYTES);
        toast.info("Image was over 5 MB — compressed it before uploading.");
      } catch {
        toast.error("Image is too large. Please pick one under 5 MB.");
        return;
      }
    }
    const previousKey = form.avatarKey;
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadFile(toUpload, "avatars");
      setForm((f) => ({ ...f, avatarUrl: uploaded.fileUrl, avatarKey: uploaded.key }));
      if (previousKey && previousKey !== uploaded.key) {
        deleteFile(previousKey).catch(() => {});
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    const key = form.avatarKey;
    setForm((f) => ({ ...f, avatarUrl: "", avatarKey: "" }));
    if (key) deleteFile(key).catch(() => {});
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
      salaryDay: s.salaryDay != null ? String(s.salaryDay) : "",
      workHours: s.workHours != null ? String(s.workHours) : "",
      overtimeRate: s.overtimeRate != null ? String(s.overtimeRate) : "",
      phone: s.phone ?? "",
      joiningDate: s.joiningDate ? s.joiningDate.slice(0, 10) : "",
      avatarUrl: s.avatarUrl ?? "",
      avatarKey: s.avatarKey ?? "",
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
    const day = form.salaryDay.trim() === "" ? undefined : Number(form.salaryDay);
    if (day !== undefined && (Number.isNaN(day) || day < 1 || day > 31)) {
      toast.error("Salary day must be between 1 and 31");
      return;
    }
    // null clears the override so the staff member falls back to the global default.
    const workHours =
      form.workHours.trim() === "" ? null : Number(form.workHours);
    if (workHours !== null && (Number.isNaN(workHours) || workHours < 0)) {
      toast.error("Working hours can't be negative");
      return;
    }
    const overtimeRate =
      form.overtimeRate.trim() === "" ? null : Number(form.overtimeRate);
    if (
      overtimeRate !== null &&
      (Number.isNaN(overtimeRate) || overtimeRate < 0)
    ) {
      toast.error("Overtime rate can't be negative");
      return;
    }
    const payload: StaffPayload = {
      name: form.name.trim(),
      designation: form.designation.trim() || undefined,
      monthlySalary:
        form.monthlySalary.trim() === "" ? 0 : Number(form.monthlySalary),
      salaryDay: day,
      workHours,
      overtimeRate,
      phone: form.phone.trim() || undefined,
      joiningDate: form.joiningDate || undefined,
      avatarUrl: form.avatarUrl || undefined,
      avatarKey: form.avatarKey || undefined,
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
              <Settings className="h-4 w-4" /> Settings
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

          {/* Profile photo */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <div
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-lg font-semibold text-white ${avatarColor(
                  form.name || "?"
                )}`}
              >
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatarUrl}
                    alt="Staff photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(form.name || "?")
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => avatarFileRef.current?.click()}
                disabled={uploadingAvatar}
                className="h-7 px-3 text-xs"
              >
                <ImagePlus className="mr-1.5 h-3 w-3" />
                {form.avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 disabled:opacity-50 dark:text-slate-400"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>

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
            <Field label="Salary day (1–31)">
              <Input
                type="number"
                min={1}
                max={31}
                value={form.salaryDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, salaryDay: e.target.value }))
                }
                placeholder="e.g. 1 (paid on the 1st)"
              />
            </Field>
            <Field label="Working hours / day">
              <Input
                type="number"
                min={0}
                step="0.5"
                value={form.workHours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, workHours: e.target.value }))
                }
                placeholder={`Default — ${settings?.standardWorkHours ?? 8}h`}
              />
            </Field>
            <Field label="Overtime rate (₹ / hour)">
              <Input
                type="number"
                min={0}
                value={form.overtimeRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overtimeRate: e.target.value }))
                }
                placeholder={
                  (settings?.overtimeRate ?? 0) > 0
                    ? `Default — ₹${settings?.overtimeRate}/hr`
                    : "Auto from salary"
                }
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
            const prevOv = prevById.get(s._id);
            const prevPending =
              !!prevOv &&
              !prevOv.paid &&
              (prevOv.earned ?? 0) > 0 &&
              salaryDue(prevYear, prevMonth, s.salaryDay);
            return (
              <div
                key={s._id}
                className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cine-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-sm ${
                      s.avatarUrl ? "" : avatarColor(s.name || "?")
                    }`}
                  >
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.avatarUrl}
                        alt={s.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(s.name || "?")
                    )}
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
                      {s.salaryDay
                        ? ` · paid the ${ordinal(s.salaryDay)} of next month`
                        : ""}
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
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {prevPending && (
                          <Link
                            href={`/staff/${s._id}`}
                            title={`${MONTHS[prevMonth - 1]} ${prevYear} salary is due and unpaid`}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {MONTHS[prevMonth - 1]} pending · {inr(prevOv!.earned)}
                          </Link>
                        )}
                        {!ov.paid &&
                          (ov.earned ?? 0) > 0 &&
                          salaryDue(year, month, s.salaryDay) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3" /> Need to pay salary
                            </span>
                          )}
                      </div>
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
