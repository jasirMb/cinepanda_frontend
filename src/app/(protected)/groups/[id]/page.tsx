"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { groupsKeys, useGroup } from "@/hooks/useGroups";
import { addGroupLabour, removeGroupLabour } from "@/lib/api/groups";
import { LabourRoster } from "@/components/labour/LabourRoster";
import { GroupAvatar } from "@/components/groups/GroupAvatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const queryClient = useQueryClient();
  const groupQuery = useGroup(id);
  const group = groupQuery.data;

  const labourMutation = useMutation({
    mutationFn: ({ action, labourId }: { action: "add" | "remove"; labourId: string }) =>
      action === "add"
        ? addGroupLabour(id, labourId)
        : removeGroupLabour(id, labourId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
      queryClient.invalidateQueries({ queryKey: ["labours"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Could not update labours"),
  });

  if (groupQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (groupQuery.isError || !group) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-sm text-red-500">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <GroupAvatar
          name={group.name}
          color={group.color}
          avatarUrl={group.avatarUrl}
          size={48}
          iconClassName="h-6 w-6"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {group.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {group.description || "Crew / team"} ·{" "}
            {group.labours?.length ?? 0} labour
            {(group.labours?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Labours */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
          Labours in this group
        </h3>
        <LabourRoster
          labours={group.labours ?? []}
          pending={labourMutation.isPending}
          onAdd={(labourId) => labourMutation.mutate({ action: "add", labourId })}
          onRemove={(labourId) =>
            labourMutation.mutate({ action: "remove", labourId })
          }
          emptyText="No labours in this group yet. Search to add some."
        />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/groups"
      className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-cine-primary dark:text-slate-400"
    >
      <ArrowLeft className="h-4 w-4" /> Back to groups
    </Link>
  );
}
