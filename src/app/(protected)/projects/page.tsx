"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { projectsKeys, useProjects } from "@/hooks/useProjects";
import {
  deleteProject,
  type ProjectPopulated,
  type ProjectStatus,
  type ProjectsListQuery,
} from "@/lib/api/projects";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const STATUS_BADGE: Record<ProjectStatus, string> = {
  PLANNING:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ONGOING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ON_HOLD:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
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

export default function ProjectsPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ProjectsListQuery>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const params = useMemo(() => {
    const p: ProjectsListQuery = {};
    if (filters.status) p.status = filters.status;
    if (filters.startDate) p.startDate = filters.startDate;
    if (filters.endDate) p.endDate = filters.endDate;
    return p;
  }, [filters]);

  const projectsQuery = useProjects(params);
  const projects = projectsQuery.data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      toast.success("Project deleted");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  /* ── Loading ── */
  if (projectsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <p className="text-red-400">Failed to load projects. Please try again.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Projects
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track CinePanda installation projects and their lifecycle.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <Select
            value={filters.status ?? "ALL"}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                status: v === "ALL" ? undefined : (v as ProjectStatus),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PLANNING">Planning</SelectItem>
              <SelectItem value="ONGOING">Ongoing</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Start From
          </label>
          <DatePicker
            value={filters.startDate ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, startDate: v || undefined }))}
            placeholder="From date"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Start Until
          </label>
          <DatePicker
            value={filters.endDate ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, endDate: v || undefined }))}
            placeholder="To date"
          />
        </div>
        {(filters.status || filters.startDate || filters.endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {projects.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No projects found. Create your first project above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Service
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                  Value
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Start
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                  Expected End
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p: ProjectPopulated) => (
                <tr
                  key={p._id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                    {p.clientName}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {p.serviceType}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                    {formatINR(p.projectValue)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {formatDate(p.startDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {formatDate(p.expectedCompletionDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/projects/${p._id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link href={`/projects/${p._id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                        onClick={() => setDeleteTarget(p._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
