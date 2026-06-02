"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HardHat } from "lucide-react";

import { useProject } from "@/hooks/useProjects";
import { workLogKeys } from "@/hooks/useLabourWorkLogs";
import { ledgerKeys } from "@/hooks/useLedger";
import { createWorkLog } from "@/lib/api/labour-worklogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

/**
 * Shown in the ledger entry form when it's a LABOUR expense for a project.
 * Lists the project's involved labours and logs a work session for one — which
 * auto-creates the linked ledger expense (so the manual form isn't needed).
 */
export function LedgerLabourSession({
  projectId,
  workDate,
  amount,
  onLogged,
}: {
  projectId: string;
  /** Session date — taken from the ledger entry's date (falls back to today). */
  workDate?: string;
  /** Per-day rate — taken from the ledger entry's Amount field. */
  amount?: number;
  onLogged?: () => void;
}) {
  const queryClient = useQueryClient();
  const projectQuery = useProject(projectId);
  const involved = projectQuery.data?.labours ?? [];

  const sessionDate = workDate || todayISO();
  const rate = amount ?? 0; // the ledger entry's Amount is used as the per-day rate

  const [labourId, setLabourId] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");
  const [days, setDays] = useState("1");

  const total = useMemo(() => {
    const d = Number(days);
    if (Number.isNaN(d) || Number.isNaN(rate)) return 0;
    return Math.round(d * rate * 100) / 100;
  }, [days, rate]);

  const mutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      toast.success("Work session logged & labour expense recorded");
      onLogged?.();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? "Failed to log session"),
  });

  function handleLog() {
    if (!labourId) {
      toast.error("Choose a labour");
      return;
    }
    const d = Number(days);
    if (Number.isNaN(d) || d <= 0) {
      toast.error("Days must be greater than 0");
      return;
    }
    if (!rate || rate <= 0) {
      toast.error("Set the Amount above — it's used as the rate");
      return;
    }
    mutation.mutate({
      labourId,
      projectId,
      workDate: sessionDate,
      days: d,
      rate,
      sessionLabel: sessionLabel.trim() || undefined,
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-cine-primary/30 bg-cine-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
        <HardHat className="h-4 w-4 text-cine-primary" /> Log labour work session
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Uses the entry&apos;s <strong>Amount</strong> as the daily rate and its{" "}
        <strong>Date</strong> for the session. Logging it records the labour
        expense automatically — no need to submit the form below.
      </p>

      {projectQuery.isLoading ? (
        <p className="text-xs text-slate-500">Loading project labours…</p>
      ) : involved.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          No labours added to this project.{" "}
          <Link
            href={`/projects/${projectId}`}
            className="font-medium text-cine-primary hover:underline"
          >
            Add involved labours
          </Link>{" "}
          first.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Labour *">
              <select
                value={labourId}
                onChange={(e) => setLabourId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Select a labour…</option>
                {involved.map((l) => (
                  <option key={l.labourId._id} value={l.labourId._id}>
                    {l.labourId.name}
                    {l.labourId.role ? ` — ${l.labourId.role}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Session label">
              <Input
                placeholder="e.g. Day 1"
                value={sessionLabel}
                onChange={(e) => setSessionLabel(e.target.value)}
              />
            </Field>
            <Field label="Days *">
              <Input
                type="number"
                min={0}
                step="0.5"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Expense:{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {inr(total)}
              </span>
              {rate > 0 ? (
                <span className="ml-1 text-xs text-slate-500">
                  ({days || 0} × {inr(rate)}/day)
                </span>
              ) : (
                <span className="ml-1 text-xs text-amber-600">
                  set the Amount above
                </span>
              )}
            </p>
            <Button type="button" onClick={handleLog} disabled={mutation.isPending}>
              {mutation.isPending ? "Logging…" : "Log session"}
            </Button>
          </div>
        </>
      )}
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
