"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, FolderKanban } from "lucide-react";

import { useLabour } from "@/hooks/useLabours";
import { useProjects } from "@/hooks/useProjects";
import { LabourProjectAttendance } from "@/components/labour/LabourProjectAttendance";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function LabourAttendancePage({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const { id, projectId } = params;
  const labourQuery = useLabour(id);
  const labour = labourQuery.data;

  const projects = useProjects({ labourId: id }).data?.data ?? [];
  const project = projects.find((p) => p._id === projectId);
  const projectName =
    project
      ? [project.clientName, project.serviceType].filter(Boolean).join(" — ")
      : "Project";

  if (labourQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/labours/${id}`}>
          <ArrowLeft className="h-4 w-4" /> Back to labour
        </Link>
      </Button>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50">
          <CalendarDays className="h-5 w-5 text-cine-primary" />
          {labour?.name ?? "Labour"} — attendance
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <FolderKanban className="h-3.5 w-3.5" />
          <Link href={`/projects/${projectId}`} className="hover:text-cine-primary hover:underline">
            {projectName}
          </Link>
        </p>
      </div>

      <LabourProjectAttendance labourId={id} projectId={projectId} />
    </div>
  );
}
