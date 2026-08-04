"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  useLabourAttendance,
  labourAttendanceKeys,
} from "@/hooks/useLabourAttendance";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import { addProjectLabour } from "@/lib/api/projects";
import {
  markLabourAttendance,
  payLabourAttendance,
  deleteLabourAttendancePayment,
  type LabourAttendanceStatus,
} from "@/lib/api/labour-attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDate } from "@/lib/format-date";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];
function methodForType(type?: string): string {
  switch (type) {
    case "BANK": return "BANK_TRANSFER";
    case "CASH": return "CASH";
    case "UPI": return "UPI";
    case "CARD": return "CARD";
    default: return "";
  }
}
function accountTypeForMethod(method: string): string | null {
  switch (method) {
    case "BANK_TRANSFER":
    case "CHEQUE": return "BANK";
    case "CASH": return "CASH";
    case "UPI": return "UPI";
    case "CARD": return "CARD";
    default: return null;
  }
}

const STATUS_META: Record<
  LabourAttendanceStatus,
  { label: string; short: string; cls: string }
> = {
  FULL_DAY: { label: "Full day", short: "F", cls: "bg-emerald-500 text-white" },
  HALF_DAY: { label: "Half day", short: "H", cls: "bg-amber-500 text-white" },
  OVERTIME: { label: "Overtime", short: "OT", cls: "bg-violet-500 text-white" },
  LEAVE: { label: "Leave", short: "L", cls: "bg-sky-500 text-white" },
  ABSENT: { label: "Absent", short: "A", cls: "bg-rose-500 text-white" },
};
const STATUS_ORDER: LabourAttendanceStatus[] = [
  "FULL_DAY", "HALF_DAY", "OVERTIME", "LEAVE", "ABSENT",
];

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function LabourProjectAttendance({
  labourId,
  projectId,
}: {
  labourId: string;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);

  const attQuery = useLabourAttendance(labourId, projectId, year, month);
  const records = attQuery.data?.records ?? [];
  const summary = attQuery.data?.summary;
  const payments = attQuery.data?.payments ?? [];
  const rate = summary?.rate ?? 0;

  const accounts = usePaymentAccounts().data?.data ?? [];

  const statusByDay = useMemo(() => {
    const status = new Map<number, LabourAttendanceStatus>();
    const extra = new Map<number, number | undefined>();
    const note = new Map<number, string | undefined>();
    for (const r of records) {
      const d = new Date(r.date).getUTCDate();
      status.set(d, r.status);
      extra.set(d, r.overtimeExtra);
      note.set(d, r.note);
    }
    return { status, extra, note };
  }, [records]);

  // This month's per-status counts (like the staff overview cards).
  const counts = useMemo(() => {
    const c = { FULL_DAY: 0, HALF_DAY: 0, OVERTIME: 0, LEAVE: 0, ABSENT: 0 };
    for (const r of records) c[r.status] += 1;
    return c;
  }, [records]);

  // Days marked LEAVE / ABSENT this month (for the reasons card).
  const leaveDays = useMemo(() => {
    const out: { day: number; status: LabourAttendanceStatus; note?: string }[] = [];
    for (const r of records) {
      if (r.status === "LEAVE" || r.status === "ABSENT")
        out.push({ day: new Date(r.date).getUTCDate(), status: r.status, note: r.note });
    }
    return out.sort((a, b) => a.day - b.day);
  }, [records]);

  // Effective work periods (YYYY-MM-DD ranges, each with its own rate). A day
  // outside ALL of them is locked.
  const periods = useMemo(
    () =>
      (summary?.workPeriods ?? []).map((p) => ({
        start: p.startDate.slice(0, 10),
        end: p.endDate.slice(0, 10),
        rate: p.rate,
      })),
    [summary?.workPeriods]
  );
  function inRange(dateStr: string): boolean {
    if (!periods.length) return true;
    return periods.some(
      (p) =>
        (!p.start || dateStr >= p.start) && (!p.end || dateStr <= p.end)
    );
  }
  // The per-day rate = the rate of the period covering the date, else the fallback.
  function rateForDateStr(dateStr: string): number {
    const per = periods.find(
      (p) => (!p.start || dateStr >= p.start) && (!p.end || dateStr <= p.end)
    );
    return per?.rate != null ? per.rate : rate;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: labourAttendanceKeys.all });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["ledger"] });
  }

  // ── Assignment editor (total + planned days → rate) ───────────────────────
  const [editTotal, setEditTotal] = useState("");
  const [editPlanned, setEditPlanned] = useState("");
  const [editPeriods, setEditPeriods] = useState<
    { start: string; end: string; rate: string }[]
  >([]);
  useEffect(() => {
    setEditTotal(summary?.totalAmount != null ? String(summary.totalAmount) : "");
    setEditPlanned(summary?.plannedDays != null ? String(summary.plannedDays) : "");
    setEditPeriods(
      (summary?.workPeriods ?? []).map((p) => ({
        start: p.startDate.slice(0, 10),
        end: p.endDate.slice(0, 10),
        rate: p.rate != null ? String(p.rate) : "",
      }))
    );
  }, [summary?.totalAmount, summary?.plannedDays, summary?.workPeriods]);

  function setPeriodField(
    i: number,
    key: "start" | "end" | "rate",
    val: string
  ) {
    setEditPeriods((ps) => ps.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)));
  }
  function addPeriod() {
    setEditPeriods((ps) => [...ps, { start: "", end: "", rate: "" }]);
  }
  function removePeriod(i: number) {
    setEditPeriods((ps) => ps.filter((_, idx) => idx !== i));
  }

  const assignMutation = useMutation({
    mutationFn: () =>
      addProjectLabour(projectId, labourId, {
        totalAmount: editTotal.trim() === "" ? null : Number(editTotal),
        plannedDays: editPlanned.trim() === "" ? null : Number(editPlanned),
        workPeriods: editPeriods
          .filter((p) => p.start && p.end)
          .map((p) => ({
            startDate: p.start,
            endDate: p.end,
            rate: p.rate.trim() === "" ? undefined : Number(p.rate),
          })),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Assignment saved");
    },
    onError: () => toast.error("Failed to save assignment"),
  });
  const previewRate =
    Number(editTotal) > 0 && Number(editPlanned) > 0
      ? Math.round(Number(editTotal) / Number(editPlanned))
      : rate;

  // ── Attendance marking (popover menu) ─────────────────────────────────────
  const [menuDay, setMenuDay] = useState<number | null>(null);
  const [menuOt, setMenuOt] = useState(false);
  const [menuExtra, setMenuExtra] = useState("");

  const markMutation = useMutation({
    mutationFn: (vars: {
      date: string;
      status: LabourAttendanceStatus | "";
      overtimeExtra?: number | null;
      note?: string | null;
    }) =>
      markLabourAttendance(labourId, projectId, vars.date, vars.status, {
        overtimeExtra: vars.overtimeExtra,
        note: vars.note,
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Failed to mark attendance"),
  });

  function saveNote(day: number, status: LabourAttendanceStatus, value: string) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const note = value.trim() === "" ? null : value.trim();
    markMutation.mutate({ date, status, note });
  }

  function openMenu(day: number) {
    setMenuDay(day);
    const cur = statusByDay.status.get(day);
    setMenuOt(cur === "OVERTIME");
    setMenuExtra(
      cur === "OVERTIME" && statusByDay.extra.get(day) != null
        ? String(statusByDay.extra.get(day))
        : ""
    );
  }
  function pickStatus(day: number, status: LabourAttendanceStatus | "") {
    markMutation.mutate({ date: `${year}-${pad(month)}-${pad(day)}`, status });
    setMenuDay(null);
  }
  function saveOvertime(day: number) {
    const extra = menuExtra.trim() === "" ? null : Number(menuExtra);
    if (extra !== null && (Number.isNaN(extra) || extra < 0)) {
      toast.error("Enter a valid extra amount");
      return;
    }
    markMutation.mutate({
      date: `${year}-${pad(month)}-${pad(day)}`,
      status: "OVERTIME",
      overtimeExtra: extra,
    });
    setMenuDay(null);
  }

  // ── Pay ───────────────────────────────────────────────────────────────────
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payDate, setPayDate] = useState("");

  function openPay() {
    const todayISO = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
    setPayAmount(String(Math.max(0, summary?.outstanding ?? 0)));
    setPayAccountId("");
    setPayMethod("");
    setPayDate(todayISO);
    setShowPay(true);
  }
  const payMutation = useMutation({
    mutationFn: () =>
      payLabourAttendance({
        labourId,
        projectId,
        amount: Number(payAmount),
        paymentAccountId: payAccountId,
        paymentMethod: payMethod || undefined,
        paidDate: payDate || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setShowPay(false);
      toast.success("Payment recorded");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Failed to record payment"),
  });
  function handlePay() {
    if (!(Number(payAmount) > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (!payAccountId) {
      toast.error("Select the account you paid from");
      return;
    }
    payMutation.mutate();
  }
  const deletePayMutation = useMutation({
    mutationFn: (id: string) => deleteLabourAttendancePayment(id),
    onSuccess: () => {
      invalidate();
      toast.success("Payment removed");
    },
    onError: () => toast.error("Failed to remove payment"),
  });

  // ── Calendar layout ───────────────────────────────────────────────────────
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const todayStr = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="space-y-4">
      {/* Assignment: total + planned days + work periods (multiple sections) */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Total amount (₹)
            <Input type="number" min={0} value={editTotal} onChange={(e) => setEditTotal(e.target.value)} placeholder="e.g. 10000" className="h-8 w-32 text-xs" />
          </label>
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Planned days
            <Input type="number" min={0} value={editPlanned} onChange={(e) => setEditPlanned(e.target.value)} placeholder="e.g. 10" className="h-8 w-24 text-xs" />
          </label>
          <div className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Rate / day
            <span className="flex h-8 items-center font-semibold text-slate-800 dark:text-slate-100">{inr(previewRate)}</span>
          </div>
          <Button size="sm" className="ml-auto h-8" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Work periods (which days are worked)
          </p>
          <div className="space-y-1.5">
            {editPeriods.map((p, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  From
                  <DatePicker value={p.start} onChange={(v) => setPeriodField(i, "start", v)} placeholder="dd/mm/yyyy" className="h-8 w-36 text-xs" />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  To
                  <DatePicker value={p.end} onChange={(v) => setPeriodField(i, "end", v)} placeholder="dd/mm/yyyy" className="h-8 w-36 text-xs" />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Rate / day (₹)
                  <Input type="number" min={0} value={p.rate} onChange={(e) => setPeriodField(i, "rate", e.target.value)} placeholder="e.g. 1000" className="h-8 w-24 text-xs" />
                </label>
                <button type="button" onClick={() => removePeriod(i)} aria-label="Remove period" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={addPeriod}>
              <Plus className="h-4 w-4" /> Add period
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">
            Each period has its own rate (e.g. 01/05→10/06 at ₹1,000, 15/06→20/06
            at ₹1,200). Days outside every period are locked.{" "}
            {periods.length > 0 && (
              <span className="text-slate-500 dark:text-slate-400">
                Now:{" "}
                {periods
                  .map(
                    (p) =>
                      `${formatDate(p.start)}–${formatDate(p.end)}${p.rate != null ? ` @ ${inr(p.rate)}` : ""}`
                  )
                  .join(", ")}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Overview stats (this month) + owed — mirrors the staff overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Full days" value={String(counts.FULL_DAY)} tone="emerald" />
        <Stat label="Half days" value={String(counts.HALF_DAY)} tone="amber" />
        <Stat label="Overtime" value={String(counts.OVERTIME)} tone="violet" />
        <Stat label="Leave" value={String(counts.LEAVE)} tone="sky" />
        <Stat label="Absent" value={String(counts.ABSENT)} tone="rose" />
        <Stat label="Owed (total)" value={inr(summary?.owed ?? 0)} tone="emerald" />
      </div>

      {/* Calendar + side panel — two columns on desktop, like the staff page */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Calendar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:w-[480px] lg:shrink-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{MONTHS[month - 1]} {year}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].cls}`} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>
        {periods.length > 0 && (
          <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
            Work dates:{" "}
            {periods.map((p) => `${formatDate(p.start)} → ${formatDate(p.end)}`).join("  ·  ")}{" "}
            (other days are locked)
          </p>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{w}</div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const status = statusByDay.status.get(day);
            const meta = status ? STATUS_META[status] : null;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const dayRate = rateForDateStr(dateStr);
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const outOfRange = !inRange(dateStr);
            const disabled = isFuture || outOfRange;
            const cellClass = `flex aspect-square w-full flex-col items-center justify-center rounded-lg border text-xs transition ${
              isToday ? "ring-2 ring-cine-primary/50" : ""
            } ${
              disabled
                ? "cursor-not-allowed border-slate-100 bg-slate-50/60 text-slate-300 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-700"
                : meta
                  ? `border-transparent ${meta.cls} hover:opacity-90`
                  : "border-slate-200 bg-white text-slate-600 hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`;
            const inner = (
              <>
                <span className="font-semibold">{day}</span>
                {meta && <span className="text-[10px] font-bold">{meta.short}</span>}
              </>
            );
            if (disabled) {
              return (
                <button
                  key={day}
                  type="button"
                  disabled
                  className={cellClass}
                  title={isFuture ? "Future date" : "Outside the work dates"}
                >
                  {inner}
                </button>
              );
            }
            return (
              <Popover key={day} open={menuDay === day} onOpenChange={(o) => (o ? openMenu(day) : setMenuDay((c) => (c === day ? null : c)))}>
                <PopoverTrigger asChild>
                  <button type="button" className={cellClass}>{inner}</button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-52 p-2">
                  <p className="px-1 pb-1.5 text-xs font-semibold text-slate-900 dark:text-slate-50">
                    {MONTHS[month - 1].slice(0, 3)} {day}, {year}
                    <span className="ml-1 font-normal text-slate-400">{WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}</span>
                  </p>
                  <div className="space-y-0.5">
                    {STATUS_ORDER.map((s) => {
                      const active = status === s;
                      return (
                        <button key={s} type="button" onClick={() => (s === "OVERTIME" ? setMenuOt(true) : pickStatus(day, s))}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${active ? "bg-slate-100 font-semibold dark:bg-slate-800" : ""}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].cls}`} />
                          {STATUS_META[s].label}
                          {active && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-cine-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  {menuOt && (
                    <div className="mt-1 rounded-md bg-violet-50 p-2 dark:bg-violet-950/30">
                      <p className="mb-1 text-[10px] text-slate-500 dark:text-slate-400">Overtime = {inr(dayRate)} day + extra</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">₹</span>
                        <input type="number" min={0} autoFocus value={menuExtra} onChange={(e) => setMenuExtra(e.target.value)} placeholder="extra"
                          className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
                        <span className="ml-auto text-sm font-semibold text-violet-700 dark:text-violet-300">{inr(dayRate + (Number(menuExtra) || 0))}</span>
                      </div>
                      <div className="mt-1.5 flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setMenuOt(false)}>Back</Button>
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveOvertime(day)}>Save</Button>
                      </div>
                    </div>
                  )}
                  {status && !menuOt && (
                    <button type="button" onClick={() => pickStatus(day, "")}
                      className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                      <span className="flex h-2.5 w-2.5 items-center justify-center text-slate-400">×</span>
                      Clear
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
        </div>

        <div className="flex-1 space-y-4 lg:min-w-0">
        {/* Pay / dues — styled like the staff salary banner */}
        {(summary?.outstanding ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Need to pay — {inr(summary?.outstanding ?? 0)} outstanding
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Worked {+(summary?.workedDays ?? 0).toFixed(2)}
                {summary?.plannedDays != null ? ` / ${summary.plannedDays}` : ""} days ·{" "}
                {inr(summary?.owed ?? 0)} owed · {inr(summary?.paid ?? 0)} paid
              </p>
            </div>
          </div>
          {!showPay && (
            <Button size="sm" onClick={openPay}><Wallet className="h-4 w-4" /> Pay</Button>
          )}
        </div>
      ) : (summary?.paid ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Settled · {inr(summary?.paid ?? 0)} paid
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Worked {+(summary?.workedDays ?? 0).toFixed(2)}
                {summary?.plannedDays != null ? ` / ${summary.plannedDays}` : ""} days ·{" "}
                {inr(summary?.owed ?? 0)} owed
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showPay && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/60">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Amount (₹)
            <Input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Type
            <select
              value={payMethod}
              onChange={(e) => {
                const method = e.target.value;
                setPayMethod(method);
                // Clear the account if it no longer matches the new type.
                const t = accountTypeForMethod(method);
                if (t && payAccountId) {
                  const acc = accounts.find((a: any) => a._id === payAccountId);
                  if (acc && acc.type !== t) setPayAccountId("");
                }
              }}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              <option value="">Method…</option>
              {PAYMENT_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
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
              <option value="">
                {payMethod ? "Select account…" : "Pick a type first…"}
              </option>
              {(accountTypeForMethod(payMethod)
                ? accounts.filter((a: any) => a.type === accountTypeForMethod(payMethod))
                : accounts
              ).map((a: any) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Paid date
            <DatePicker value={payDate} onChange={setPayDate} placeholder="Pick a date" className="h-9" />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button variant="outline" size="sm" onClick={() => setShowPay(false)}>Cancel</Button>
            <Button size="sm" onClick={handlePay} disabled={payMutation.isPending}>{payMutation.isPending ? "Saving…" : "Record payment"}</Button>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Payments</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {payments.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{inr(p.amount)}</span>
                  {typeof p.paymentAccountId === "object" && p.paymentAccountId ? ` · ${p.paymentAccountId.name}` : ""}
                  {` · ${formatDate(p.paidDate)}`}
                </span>
                <button type="button" onClick={() => deletePayMutation.mutate(p._id)}
                  className="rounded-md px-2 py-0.5 font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leaveDays.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Leave &amp; absence reasons
          </h4>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {leaveDays.map(({ day, status, note }) => (
              <li key={day} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].cls}`} />
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {MONTHS[month - 1].slice(0, 3)} {day}
                  </span>
                  <span className="text-xs text-slate-400">{STATUS_META[status].label}</span>
                </span>
                <input
                  key={`${day}-${note ?? "n"}`}
                  type="text"
                  defaultValue={note ?? ""}
                  placeholder="Reason (optional)"
                  onBlur={(e) => saveNote(day, status, e.target.value)}
                  className="h-8 w-full max-w-[220px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
        </div>
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
  value: string;
  tone?: "slate" | "emerald" | "amber" | "violet" | "sky" | "rose";
}) {
  const cls: Record<string, string> = {
    slate: "text-slate-900 dark:text-slate-50",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    violet: "text-violet-600 dark:text-violet-400",
    sky: "text-sky-600 dark:text-sky-400",
    rose: "text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${cls[tone]}`}>{value}</p>
    </div>
  );
}
