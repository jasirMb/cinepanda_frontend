"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  IdCard,
  Plus,
  Wallet,
} from "lucide-react";

import {
  staffKeys,
  useStaffMember,
  useStaffMonth,
  useHolidaySettings,
} from "@/hooks/useStaff";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import {
  markAttendance,
  paySalary,
  deleteSalaryPayment,
  type AttendanceStatus,
  type AttendanceRecord,
  type HolidaySettings,
} from "@/lib/api/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];
function methodForType(type?: string): string {
  switch (type) {
    case "BANK":
      return "BANK_TRANSFER";
    case "CASH":
      return "CASH";
    case "UPI":
      return "UPI";
    case "CARD":
      return "CARD";
    default:
      return "";
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function salaryDue(year: number, month: number, salaryDay?: number): boolean {
  const d = new Date();
  const cy = d.getUTCFullYear();
  const cm = d.getUTCMonth() + 1;
  const cd = d.getUTCDate();
  if (year < cy || (year === cy && month < cm)) return true;
  if (year === cy && month === cm) return !salaryDay || cd >= salaryDay;
  return false;
}
function fmtDateISO(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; short: string; cls: string }
> = {
  PRESENT: { label: "Present", short: "P", cls: "bg-emerald-500 text-white" },
  HALF_DAY: { label: "Half-day", short: "H", cls: "bg-amber-500 text-white" },
  ABSENT: { label: "Absent", short: "A", cls: "bg-rose-500 text-white" },
  PAID_LEAVE: { label: "Paid leave", short: "L", cls: "bg-sky-500 text-white" },
};
// Clicking a day cycles through these.
const CYCLE: (AttendanceStatus | "")[] = ["", "PRESENT", "HALF_DAY", "ABSENT", "PAID_LEAVE"];

function isHoliday(
  year: number,
  month0: number,
  day: number,
  s?: HolidaySettings
): boolean {
  if (!s) return false;
  const d = new Date(Date.UTC(year, month0, day));
  const dow = d.getUTCDay();
  if (dow === 0 && s.sundayOff) return true;
  if (dow === 6 && s.saturdayOff) return true;
  if (dow === 6 && s.secondSaturdayOff && day >= 8 && day <= 14) return true;
  for (const h of s.customHolidays || []) {
    const hd = new Date(h.date);
    if (
      hd.getUTCFullYear() === year &&
      hd.getUTCMonth() === month0 &&
      hd.getUTCDate() === day
    )
      return true;
  }
  return false;
}

export default function StaffDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1); // 1-based

  const staffQuery = useStaffMember(id);
  const staff = staffQuery.data;
  const monthQuery = useStaffMonth(id, year, month);
  const overview = monthQuery.data?.overview;
  const settingsQuery = useHolidaySettings();
  const settings = settingsQuery.data;

  const salaryPayment = monthQuery.data?.salaryPayment ?? null;
  const paid = !!salaryPayment;
  const accounts = usePaymentAccounts().data?.data ?? [];

  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payDate, setPayDate] = useState("");

  // "Add overtime for a day" control (for normal working days).
  const [otDay, setOtDay] = useState("");
  const [otHours, setOtHours] = useState("");

  // Map day-of-month → status.
  const statusByDay = useMemo(() => {
    const m = new Map<number, AttendanceStatus>();
    for (const r of monthQuery.data?.attendance ?? []) {
      m.set(new Date(r.date).getUTCDate(), r.status);
    }
    return m;
  }, [monthQuery.data]);

  const mark = useMutation({
    mutationFn: (vars: {
      date: string;
      status: AttendanceStatus | "";
      overtimePay?: number | null;
      note?: string | null;
      overtimeHours?: number | null;
    }) =>
      markAttendance(
        id,
        vars.date,
        vars.status,
        vars.overtimePay,
        vars.note,
        vars.overtimeHours
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
    onError: () => toast.error("Failed to save attendance"),
  });

  const payMutation = useMutation({
    mutationFn: (payload: {
      year: number;
      month: number;
      amount: number;
      paymentAccountId: string;
      paymentMethod?: string;
      paidDate?: string;
    }) => paySalary(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      setShowPayForm(false);
      toast.success("Salary recorded");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Failed to record salary"),
  });
  const unpayMutation = useMutation({
    mutationFn: () => deleteSalaryPayment(id, year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success("Salary payment removed");
    },
    onError: () => toast.error("Failed to remove salary payment"),
  });

  function openPay() {
    const todayISO = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(
      now.getUTCDate()
    )}`;
    setPayAmount(String(overview?.earned ?? 0));
    setPayAccountId("");
    setPayMethod("");
    setPayDate(todayISO);
    setShowPayForm(true);
  }
  function handlePay() {
    const amt = Number(payAmount);
    if (!(amt > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (!payAccountId) {
      toast.error("Select the account you paid from");
      return;
    }
    payMutation.mutate({
      year,
      month,
      amount: amt,
      paymentAccountId: payAccountId,
      paymentMethod: payMethod || undefined,
      paidDate: payDate || undefined,
    });
  }

  function cycleDay(day: number, holiday: boolean) {
    const current = statusByDay.get(day) ?? "";
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (holiday) {
      // Holidays: a simple worked / not-worked toggle (overtime).
      mark.mutate({ date, status: current === "PRESENT" ? "" : "PRESENT" });
      return;
    }
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    mark.mutate({ date, status: next });
  }

  // Day-rate = a normal day's pay; the fallback for holiday work with no hours.
  const dayRate =
    overview && overview.workingDays > 0
      ? Math.round((staff?.monthlySalary ?? 0) / overview.workingDays)
      : 0;

  // Effective working hours / overtime rate (staff override, else global default).
  const otRate =
    overview?.overtimeRate ??
    staff?.overtimeRate ??
    settings?.overtimeRate ??
    0;
  const stdHours =
    overview?.standardWorkHours ??
    staff?.workHours ??
    settings?.standardWorkHours ??
    8;

  // Pay shown for an overtime day: a manual price override wins, else hours × rate,
  // else (for a holiday) a normal day's wage.
  function overtimePayFor(rec: AttendanceRecord, holiday: boolean): number {
    if (rec.overtimePay != null) return rec.overtimePay;
    if (rec.overtimeHours != null) return Math.round(rec.overtimeHours * otRate);
    return holiday ? dayRate : 0;
  }

  // Days that earn overtime: holiday work + working days with logged overtime.
  const overtimeDays = useMemo(() => {
    const out: { day: number; rec: AttendanceRecord; holiday: boolean }[] = [];
    for (const r of monthQuery.data?.attendance ?? []) {
      const day = new Date(r.date).getUTCDate();
      const holiday = isHoliday(year, month - 1, day, settings);
      const worked = r.status === "PRESENT" || r.status === "HALF_DAY";
      if (
        (holiday && r.status === "PRESENT") ||
        (!holiday && worked && (r.overtimeHours != null || r.overtimePay != null))
      )
        out.push({ day, rec: r, holiday });
    }
    return out.sort((a, b) => a.day - b.day);
  }, [monthQuery.data, settings, year, month]);

  // Days marked absent / half-day / paid-leave (for reason notes).
  const leaveDays = useMemo(() => {
    const out: { day: number; rec: AttendanceRecord }[] = [];
    for (const r of monthQuery.data?.attendance ?? []) {
      if (
        r.status === "ABSENT" ||
        r.status === "HALF_DAY" ||
        r.status === "PAID_LEAVE"
      )
        out.push({ day: new Date(r.date).getUTCDate(), rec: r });
    }
    return out.sort((a, b) => a.day - b.day);
  }, [monthQuery.data]);

  function saveOvertimeHours(
    day: number,
    status: AttendanceStatus,
    value: string
  ) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const trimmed = value.trim();
    const num = trimmed === "" ? null : Number(trimmed);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    // Setting hours recomputes pay (hours × rate) → drop any manual price override.
    // Clearing hours leaves a price override untouched.
    mark.mutate({
      date,
      status,
      overtimeHours: num,
      ...(num !== null ? { overtimePay: null } : {}),
    });
  }

  // Manual price override for a day's overtime (₹). null clears it → back to hours × rate.
  function saveOvertimePrice(
    day: number,
    status: AttendanceStatus,
    value: string
  ) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const trimmed = value.trim();
    const num = trimmed === "" ? null : Number(trimmed);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    mark.mutate({ date, status, overtimePay: num });
  }

  // Worked days (not holidays) that don't have overtime logged yet — selectable
  // in the "add overtime" control so any working day can earn overtime.
  const addableDays = useMemo(() => {
    const already = new Set(overtimeDays.map((o) => o.day));
    const out: { day: number; status: AttendanceStatus }[] = [];
    for (const r of monthQuery.data?.attendance ?? []) {
      const day = new Date(r.date).getUTCDate();
      const holiday = isHoliday(year, month - 1, day, settings);
      const worked = r.status === "PRESENT" || r.status === "HALF_DAY";
      if (!holiday && worked && !already.has(day))
        out.push({ day, status: r.status });
    }
    return out.sort((a, b) => a.day - b.day);
  }, [monthQuery.data, overtimeDays, settings, year, month]);

  function addOvertime() {
    if (!otDay) {
      toast.error("Pick a day");
      return;
    }
    const hrs = Number(otHours);
    if (!(hrs > 0)) {
      toast.error("Enter overtime hours");
      return;
    }
    const rec = addableDays.find((d) => d.day === Number(otDay));
    if (!rec) return;
    saveOvertimeHours(rec.day, rec.status, otHours);
    setOtDay("");
    setOtHours("");
  }

  function saveNote(day: number, status: AttendanceStatus, value: string) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const note = value.trim() === "" ? null : value.trim();
    mark.mutate({ date, status, note });
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

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 Sun
  const todayStr = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(
    now.getUTCDate()
  )}`;

  if (staffQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  if (staffQuery.isError || !staff) {
    return (
      <div className="space-y-3">
        <Link href="/staff" className="text-sm text-cine-primary hover:underline">
          ← Back to staff
        </Link>
        <p className="text-red-500">Failed to load this staff member.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" /> Back to staff
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cine-primary to-indigo-600 text-white shadow-sm">
          {staff.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staff.avatarUrl}
              alt={staff.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <IdCard className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-slate-900 dark:text-slate-50">
            {staff.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {staff.designation || "—"}
            {staff.phone ? ` · ${staff.phone}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {stdHours}h/day · overtime ₹{otRate.toLocaleString("en-IN")}/hr
            {staff.workHours != null || staff.overtimeRate != null ? (
              <span className="ml-1 text-violet-500">· custom</span>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Monthly salary
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {inr(staff.monthlySalary ?? 0)}
          </p>
          {staff.salaryDay ? (
            <p className="text-[11px] text-slate-400">
              Due on the {ordinal(staff.salaryDay)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Month nav */}
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

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Working days" value={overview?.workingDays ?? 0} />
        <Stat label="Present" value={overview?.present ?? 0} tone="emerald" />
        <Stat label="Half-days" value={overview?.half ?? 0} tone="amber" />
        <Stat label="Absent" value={overview?.absent ?? 0} tone="rose" />
        <Stat label="Paid leave" value={overview?.paidLeave ?? 0} tone="sky" />
        <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Earned
          </p>
          <p className="inline-flex items-center gap-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
            <Wallet className="h-4 w-4" />
            {inr(overview?.earned ?? 0)}
          </p>
          {(overview?.overtimeEarned ?? 0) > 0 && (
            <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
              incl. {inr(overview!.overtimeEarned)} overtime
            </p>
          )}
        </div>
      </div>

      {/* Salary — paid status / pay action */}
      {paid && salaryPayment ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Salary paid · {inr(salaryPayment.amount)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {typeof salaryPayment.paymentAccountId === "object" &&
                salaryPayment.paymentAccountId
                  ? `via ${salaryPayment.paymentAccountId.name}`
                  : "Paid"}
                {salaryPayment.paymentMethod
                  ? ` · ${
                      PAYMENT_METHODS.find(
                        (m) => m.value === salaryPayment.paymentMethod
                      )?.label ?? salaryPayment.paymentMethod
                    }`
                  : ""}
                {` · ${fmtDateISO(salaryPayment.paidDate)}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => unpayMutation.mutate()}
            disabled={unpayMutation.isPending}
          >
            Undo
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {salaryDue(year, month, staff.salaryDay)
                  ? `Need to pay salary — ${MONTHS[month - 1]} ${year}`
                  : `Salary not paid yet — ${MONTHS[month - 1]} ${year}`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {inr(overview?.earned ?? 0)} earned this month
                {staff.salaryDay
                  ? ` · due on the ${ordinal(staff.salaryDay)}`
                  : ""}
              </p>
            </div>
          </div>
          {!showPayForm && (
            <Button size="sm" onClick={openPay}>
              <Wallet className="h-4 w-4" /> Pay salary
            </Button>
          )}
        </div>
      )}

      {/* Pay salary form */}
      {showPayForm && !paid && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Pay salary — {MONTHS[month - 1]} {year}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Amount (₹)
              <Input
                type="number"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Paid from *
              <select
                value={payAccountId}
                onChange={(e) => {
                  const a = accounts.find((x: any) => x._id === e.target.value);
                  setPayAccountId(e.target.value);
                  if (a) setPayMethod(methodForType(a.type));
                }}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Select account…</option>
                {accounts.map((a: any) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Type
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Method…</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Paid date
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPayForm(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handlePay} disabled={payMutation.isPending}>
              {payMutation.isPending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </div>
      )}

      {/* Calendar + side panels (two columns on desktop) */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Attendance calendar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:w-[480px] lg:shrink-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Attendance — tap a day to cycle
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {(Object.keys(STATUS_META) as AttendanceStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`h-3 w-3 rounded-full ${STATUS_META[s].cls}`} />
                {STATUS_META[s].label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              Holiday work
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
              Holiday / off
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
            >
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const holiday = isHoliday(year, month - 1, day, settings);
            const status = statusByDay.get(day);
            const holidayWorked = holiday && status === "PRESENT";
            const meta = !holiday && status ? STATUS_META[status] : null;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            return (
              <button
                key={day}
                type="button"
                disabled={mark.isPending || isFuture}
                onClick={() => cycleDay(day, holiday)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition ${
                  isToday ? "ring-2 ring-cine-primary/50" : ""
                } ${
                  isFuture
                    ? "cursor-not-allowed border-slate-100 bg-slate-50/60 text-slate-300 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-700"
                    : holidayWorked
                      ? "border-transparent bg-violet-500 text-white hover:opacity-90"
                      : holiday
                        ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-violet-400 hover:text-violet-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-600"
                        : meta
                          ? `border-transparent ${meta.cls} hover:opacity-90`
                          : "border-slate-200 bg-white text-slate-600 hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
                title={
                  isFuture
                    ? "Future date — can't mark yet"
                    : holidayWorked
                      ? "Holiday work (overtime)"
                      : holiday
                        ? "Holiday / weekly off — tap if worked"
                        : meta
                          ? meta.label
                          : "Not marked"
                }
              >
                <span className="font-semibold">{day}</span>
                {holidayWorked ? (
                  <span className="text-[10px] font-bold">OT</span>
                ) : (
                  meta && <span className="text-[10px] font-bold">{meta.short}</span>
                )}
              </button>
            );
          })}
        </div>
        </div>

        {(overtimeDays.length > 0 ||
          addableDays.length > 0 ||
          leaveDays.length > 0) && (
          <div className="flex-1 space-y-5 lg:min-w-0">

      {/* Overtime — hours worked beyond a normal day, paid at the overtime rate */}
      {(overtimeDays.length > 0 || addableDays.length > 0) && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/20">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Overtime
          </h3>
          <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Pay = hours × ₹{otRate.toLocaleString("en-IN")}/hr — that&apos;s a day&apos;s
            wage ₹{dayRate.toLocaleString("en-IN")} ÷ {stdHours}h
            {staff.overtimeRate != null ? " (manual rate)" : ""}. Edit the ₹ box to set
            a custom amount for a day. On a holiday, leave hours blank to pay a full day
            (₹{dayRate.toLocaleString("en-IN")}).
          </p>
          {overtimeDays.length > 0 && (
          <ul className="divide-y divide-violet-100 dark:divide-violet-900/40">
            {overtimeDays.map(({ day, rec, holiday }) => (
              <li
                key={day}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {MONTHS[month - 1].slice(0, 3)} {day}, {year}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    {WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}
                  </span>
                  {holiday && (
                    <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      Holiday
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    key={`h-${day}-${rec.overtimeHours ?? "def"}`}
                    type="number"
                    min={0}
                    step="0.5"
                    defaultValue={rec.overtimeHours ?? ""}
                    placeholder={holiday ? String(stdHours) : "0"}
                    onBlur={(e) =>
                      saveOvertimeHours(day, rec.status, e.target.value)
                    }
                    className="h-8 w-14 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
                  <span className="text-xs text-slate-400">hrs</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-sm text-slate-400">₹</span>
                  <input
                    key={`p-${day}-${rec.overtimePay ?? "x"}-${rec.overtimeHours ?? "x"}`}
                    type="number"
                    min={0}
                    defaultValue={rec.overtimePay ?? ""}
                    placeholder={String(overtimePayFor(rec, holiday))}
                    onBlur={(e) =>
                      saveOvertimePrice(day, rec.status, e.target.value)
                    }
                    title="Pay for this day — leave blank to use hours × rate"
                    className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-violet-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300"
                  />
                </div>
              </li>
            ))}
          </ul>
          )}
          {addableDays.length > 0 && (
            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-violet-100 pt-3 dark:border-violet-900/40">
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Add overtime — day
                <select
                  value={otDay}
                  onChange={(e) => setOtDay(e.target.value)}
                  className="h-8 w-36 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="">Pick a day…</option>
                  {addableDays.map(({ day }) => (
                    <option key={day} value={day}>
                      {MONTHS[month - 1].slice(0, 3)} {day} (
                      {WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}
                      )
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Hours
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={otHours}
                  onChange={(e) => setOtHours(e.target.value)}
                  placeholder="e.g. 2"
                  className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1"
                onClick={addOvertime}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Absences & leave reasons */}
      {leaveDays.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Absences &amp; leave — reasons
          </h3>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {leaveDays.map(({ day, rec }) => (
              <li
                key={day}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${STATUS_META[rec.status].cls}`}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {MONTHS[month - 1].slice(0, 3)} {day}
                  </span>
                  <span className="text-xs text-slate-400">
                    {STATUS_META[rec.status].label}
                  </span>
                </span>
                <input
                  key={`${day}-${rec.note ?? "n"}`}
                  type="text"
                  defaultValue={rec.note ?? ""}
                  placeholder="Reason (optional)"
                  onBlur={(e) => saveNote(day, rec.status, e.target.value)}
                  className="h-8 w-full max-w-[280px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const toneCls: Record<string, string> = {
    slate: "text-slate-900 dark:text-slate-50",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    sky: "text-sky-600 dark:text-sky-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`text-lg font-bold ${toneCls[tone]}`}>{value}</p>
    </div>
  );
}
