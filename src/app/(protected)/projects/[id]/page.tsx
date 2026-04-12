"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectsKeys, useProject } from "@/hooks/useProjects";
import { ledgerKeys, useLedger } from "@/hooks/useLedger";
import {
  updateProject,
  deleteProject,
  VALID_STATUS_TRANSITIONS,
  type ProjectStatus,
} from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { LedgerEntryPopulated } from "@/lib/api/ledger";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const STATUS_BADGE: Record<ProjectStatus, string> = {
  PLANNING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ONGOING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ON_HOLD: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_ACTION_LABELS: Partial<Record<ProjectStatus, string>> = {
  ONGOING: "Start Project",
  ON_HOLD: "Put On Hold",
  COMPLETED: "Mark Complete",
  CANCELLED: "Cancel",
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectQuery = useProject(id);
  const project = projectQuery.data;

  const ledgerQuery = useLedger({ projectId: id });
  const ledgerEntries = ledgerQuery.data?.data ?? [];

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: ProjectStatus) => updateProject(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project status updated");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response?.data
              ?.error
          : "Failed to update status";
      toast.error(msg || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => {
      toast.success("Project deleted");
      router.push("/projects");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  /* ── Financials ── */
  const totalIncome = ledgerEntries
    .filter((e) => e.entryType === "INCOME")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = ledgerEntries
    .filter((e) => e.entryType === "EXPENSE")
    .reduce((s, e) => s + e.amount, 0);
  const pendingAmount = project ? project.projectValue - totalIncome : 0;

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <p className="text-red-400">
        Failed to load project. Please try again.
      </p>
    );
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[project.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {project.clientName}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[project.status]}`}
            >
              {project.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {project.serviceType}
            {project.description ? ` — ${project.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Status transition buttons */}
      {validTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {validTransitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant={nextStatus === "CANCELLED" ? "destructive" : "default"}
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(nextStatus)}
            >
              {STATUS_ACTION_LABELS[nextStatus] ?? nextStatus}
            </Button>
          ))}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Project Value" value={formatINR(project.projectValue)} />
        <InfoCard
          label="Total Received"
          value={formatINR(totalIncome)}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <InfoCard
          label="Total Expenses"
          value={formatINR(totalExpense)}
          accent="text-red-600 dark:text-red-400"
        />
        <InfoCard
          label="Pending Amount"
          value={formatINR(pendingAmount > 0 ? pendingAmount : 0)}
          accent="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Project details */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
          Project Details
        </h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Start Date" value={formatDate(project.startDate)} />
          <Detail
            label="Expected Completion"
            value={formatDate(project.expectedCompletionDate)}
          />
          {project.actualCompletionDate && (
            <Detail
              label="Actual Completion"
              value={formatDate(project.actualCompletionDate)}
            />
          )}
          {project.customerId && typeof project.customerId === "object" && (
            <>
              <Detail label="Customer" value={project.customerId.name} />
              <Detail label="Phone" value={project.customerId.phone} />
              <Detail label="Place" value={project.customerId.place} />
            </>
          )}
          {project.notes && <Detail label="Notes" value={project.notes} />}
        </dl>
      </div>

      {/* Linked quotation */}
      {project.quotationId && typeof project.quotationId === "object" && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
            Linked Quotation
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Status:{" "}
            <span className="font-medium">{project.quotationId.status}</span> |
            Date: {formatDate(project.quotationId.quotationDate)}
          </p>
          <Link href={`/quotations/${project.quotationId._id}`}>
            <Button variant="link" size="sm" className="mt-1 px-0">
              View Quotation
            </Button>
          </Link>
        </div>
      )}

      {/* Linked lead */}
      {project.leadId && typeof project.leadId === "object" && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
            Linked Lead
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {project.leadId.customerName} — {project.leadId.contactNumber}
            {project.leadId.requirement
              ? ` — ${project.leadId.requirement}`
              : ""}
          </p>
        </div>
      )}

      {/* Ledger entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Ledger Entries
          </h3>
          <Link
            href={`/ledger/new?projectId=${id}&customerId=${
              typeof project.customerId === "object"
                ? project.customerId?._id
                : ""
            }`}
          >
            <Button size="sm">Add Entry</Button>
          </Link>
        </div>

        {ledgerEntries.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No ledger entries linked to this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry: LedgerEntryPopulated) => (
                  <tr
                    key={entry._id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          entry.entryType === "INCOME"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {entry.category}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {formatINR(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

/* ── Sub-components ── */

function InfoCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          accent ?? "text-slate-900 dark:text-slate-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-slate-900 dark:text-slate-50">{value}</dd>
    </div>
  );
}
