"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Undo2 } from "lucide-react";

import {
  emptyTrash,
  fetchTrashItems,
  fetchTrashSummary,
  purgeTrashItem,
  restoreTrashItem,
  type TrashItem,
  type TrashType,
} from "@/lib/api/trash";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const trashKeys = {
  all: ["trash"] as const,
  summary: ["trash", "summary"] as const,
  items: (type: TrashType) => ["trash", "items", type] as const,
};

function relativeTime(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<TrashType | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);

  const summaryQuery = useQuery({
    queryKey: trashKeys.summary,
    queryFn: fetchTrashSummary,
    staleTime: 30_000,
  });

  const types = summaryQuery.data?.types ?? [];

  // Default to the first type that has items (fall back to the first tab).
  useEffect(() => {
    if (activeType || types.length === 0) return;
    const firstWithItems = types.find((t) => t.count > 0) ?? types[0];
    setActiveType(firstWithItems.key);
  }, [types, activeType]);

  const itemsQuery = useQuery({
    queryKey: activeType ? trashKeys.items(activeType) : ["trash", "items", "none"],
    queryFn: () => fetchTrashItems(activeType as TrashType),
    enabled: !!activeType,
    staleTime: 30_000,
  });

  const activeLabel =
    types.find((t) => t.key === activeType)?.label ?? "items";

  function invalidate(type: TrashType) {
    queryClient.invalidateQueries({ queryKey: trashKeys.summary });
    queryClient.invalidateQueries({ queryKey: trashKeys.items(type) });
    // The item is back in its own list now — drop its cached list too.
    queryClient.invalidateQueries({ queryKey: [type] });
  }

  const restoreMutation = useMutation({
    mutationFn: ({ type, id }: { type: TrashType; id: string }) =>
      restoreTrashItem(type, id),
    onSuccess: (_d, vars) => {
      invalidate(vars.type);
      toast.success("Restored");
    },
    onError: () => toast.error("Failed to restore"),
  });

  const purgeMutation = useMutation({
    mutationFn: ({ type, id }: { type: TrashType; id: string }) =>
      purgeTrashItem(type, id),
    onSuccess: (_d, vars) => {
      invalidate(vars.type);
      toast.success("Permanently deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const emptyMutation = useMutation({
    mutationFn: (type: TrashType) => emptyTrash(type),
    onSuccess: (count, type) => {
      invalidate(type);
      toast.success(count > 0 ? `Emptied ${count} item(s)` : "Trash already empty");
    },
    onError: () => toast.error("Failed to empty trash"),
  });

  const items = itemsQuery.data ?? [];
  const activeCount = types.find((t) => t.key === activeType)?.count ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
            <Trash2 className="h-5 w-5 text-slate-400" />
            Trash
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Deleted items are kept here. Restore them, or delete them permanently.
          </p>
        </div>
        {activeType && activeCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
            disabled={emptyMutation.isPending}
            onClick={() => setEmptyConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Empty {activeLabel}
          </Button>
        )}
      </div>

      {/* Tabs */}
      {summaryQuery.isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {types.map((t) => {
            const active = t.key === activeType;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveType(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-cine-primary bg-cine-primary/10 text-cine-primary"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-slate-100"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    t.count > 0
                      ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {itemsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Trash2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No deleted {activeLabel.toLowerCase()}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const busy =
                (restoreMutation.isPending &&
                  restoreMutation.variables?.id === item.id) ||
                (purgeMutation.isPending && purgeMutation.variables?.id === item.id);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-50">
                      {item.title || "Untitled"}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {item.subtitle}
                      {item.subtitle && " · "}
                      deleted {relativeTime(item.deletedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={busy}
                      onClick={() =>
                        restoreMutation.mutate({ type: item.type, id: item.id })
                      }
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPurgeTarget(item)}
                      aria-label="Delete permanently"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Confirm: permanent delete one item */}
      <ConfirmDialog
        open={purgeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPurgeTarget(null);
        }}
        title="Delete permanently"
        description={`"${purgeTarget?.title ?? "This item"}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete permanently"
        onConfirm={() => {
          if (purgeTarget) {
            purgeMutation.mutate({ type: purgeTarget.type, id: purgeTarget.id });
          }
          setPurgeTarget(null);
        }}
      />

      {/* Confirm: empty trash for the active type */}
      <ConfirmDialog
        open={emptyConfirm}
        onOpenChange={setEmptyConfirm}
        title={`Empty ${activeLabel} trash`}
        description={`All ${activeCount} item(s) in the ${activeLabel} trash will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Empty trash"
        onConfirm={() => {
          if (activeType) emptyMutation.mutate(activeType);
          setEmptyConfirm(false);
        }}
      />
    </div>
  );
}
