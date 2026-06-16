"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Plus, Trash2 } from "lucide-react";

import { staffKeys, useHolidaySettings } from "@/hooks/useStaff";
import { updateHolidaySettings, type CustomHoliday } from "@/lib/api/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StaffSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useHolidaySettings();

  const [sundayOff, setSundayOff] = useState(true);
  const [saturdayOff, setSaturdayOff] = useState(false);
  const [secondSaturdayOff, setSecondSaturdayOff] = useState(false);
  const [standardWorkHours, setStandardWorkHours] = useState("8");
  const [overtimeRate, setOvertimeRate] = useState("0");
  const [holidays, setHolidays] = useState<{ date: string; label?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    if (settingsQuery.data && !loaded) {
      const s = settingsQuery.data;
      setSundayOff(s.sundayOff);
      setSaturdayOff(s.saturdayOff);
      setSecondSaturdayOff(s.secondSaturdayOff);
      setStandardWorkHours(String(s.standardWorkHours ?? 8));
      setOvertimeRate(String(s.overtimeRate ?? 0));
      setHolidays(
        (s.customHolidays || []).map((h) => ({
          date: h.date.slice(0, 10),
          label: h.label,
        }))
      );
      setLoaded(true);
    }
  }, [settingsQuery.data, loaded]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateHolidaySettings({
        sundayOff,
        saturdayOff,
        secondSaturdayOff,
        standardWorkHours:
          standardWorkHours.trim() === "" ? 0 : Number(standardWorkHours),
        overtimeRate: overtimeRate.trim() === "" ? 0 : Number(overtimeRate),
        customHolidays: holidays as CustomHoliday[],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.holidays });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  function addHoliday() {
    if (!newDate) {
      toast.error("Pick a date");
      return;
    }
    if (holidays.some((h) => h.date === newDate)) {
      toast.error("That date is already added");
      return;
    }
    setHolidays((hs) =>
      [...hs, { date: newDate, label: newLabel.trim() || undefined }].sort(
        (a, b) => a.date.localeCompare(b.date)
      )
    );
    setNewDate("");
    setNewLabel("");
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" /> Back to staff
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Staff settings
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Defaults used to work out staff attendance, salary and overtime. Each
          staff member can override the working hours and overtime rate.
        </p>
      </div>

      {/* Working hours & overtime */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Working hours &amp; overtime
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            The standard full day&apos;s hours, plus an optional flat overtime rate.
            Leave the overtime rate at <strong>0</strong> to auto-calculate it from
            each person&apos;s salary (a day&apos;s wage ÷ working hours). Staff can
            override either value.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Standard working hours / day
            <Input
              type="number"
              min={0}
              step="0.5"
              value={standardWorkHours}
              onChange={(e) => setStandardWorkHours(e.target.value)}
              placeholder="e.g. 8"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            Overtime rate (₹ / hour)
            <Input
              type="number"
              min={0}
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              placeholder="0 = auto from salary"
            />
          </label>
        </div>
      </div>

      {/* Weekly offs */}
      <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
          Weekly offs
        </h3>
        <Toggle
          label="Sunday off"
          hint="Every Sunday is a holiday"
          checked={sundayOff}
          onChange={setSundayOff}
        />
        <Toggle
          label="Saturday off"
          hint="Every Saturday is a holiday"
          checked={saturdayOff}
          onChange={setSaturdayOff}
        />
        <Toggle
          label="2nd Saturday off"
          hint="Only the 2nd Saturday of each month (ignored if all Saturdays are off)"
          checked={secondSaturdayOff}
          onChange={setSecondSaturdayOff}
          disabled={saturdayOff}
        />
      </div>

      {/* Custom holidays */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
          Other holidays
        </h3>

        {holidays.length === 0 ? (
          <p className="mb-3 text-xs text-slate-400">No custom holidays yet.</p>
        ) : (
          <ul className="mb-3 divide-y divide-slate-100 dark:divide-slate-800">
            {holidays.map((h) => (
              <li
                key={h.date}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {fmtDate(h.date)}
                  </span>
                  {h.label && (
                    <span className="text-slate-500 dark:text-slate-400">
                      · {h.label}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setHolidays((hs) => hs.filter((x) => x.date !== h.date))
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Date
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-9 w-40"
            />
          </label>
          <label className="flex flex-1 flex-col gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Label (optional)
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Diwali"
              className="h-9"
            />
          </label>
          <Button type="button" variant="outline" className="h-9 gap-1" onClick={addHoliday}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
        </p>
        {hint && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        )}
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-cine-primary" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
