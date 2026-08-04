"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Undo2 } from "lucide-react";

import {
  emptyTrash,
  fetchTrashItems,
  fetchTrashSummary,
  purgeTrashItem,
  restoreTrashItem,
  type TrashFilter,
  type TrashItem,
  type TrashType,
} from "@/lib/api/trash";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const trashKeys = {
  summary: ["trash", "summary"] as const,
  items: (filter: TrashFilter) => ["trash", "items", filter] as const,
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
  return `${Math.round(months / 12)} yr ago`;
}

const AVATAR_PALETTE = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];
function initials(name: string) {
  return (
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
  );
}
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TrashFilter>("all");
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);

  const summaryQuery = useQuery({
    queryKey: trashKeys.summary,
    queryFn: fetchTrashSummary,
    staleTime: 30_000,
  });
  const types = summaryQuery.data?.types ?? [];
  const total = summaryQuery.data?.total ?? 0;

  const itemsQuery = useQuery({
    queryKey: trashKeys.items(filter),
    queryFn: () => fetchTrashItems(filter),
    staleTime: 30_000,
  });
  const items = itemsQuery.data ?? [];

  const activeLabel =
    filter === "all" ? "items" : types.find((t) => t.key === filter)?.label ?? "items";
  const activeCount =
    filter === "all" ? total : types.find((t) => t.key === filter)?.count ?? 0;

  function invalidate(type: TrashType) {
    queryClient.invalidateQueries({ queryKey: trashKeys.summary });
    queryClient.invalidateQueries({ queryKey: ["trash", "items"] });
    // The item is back in its own list now — drop that entity's cached list too.
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
        {filter !== "all" && activeCount > 0 && (
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

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Filter
        </span>
        <Select value={filter} onValueChange={(v) => setFilter(v as TrashFilter)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items ({total})</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label} ({t.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!itemsQuery.isLoading && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Items */}
      {itemsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <Trash2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No deleted {activeLabel.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const busy =
              (restoreMutation.isPending &&
                restoreMutation.variables?.id === item.id) ||
              (purgeMutation.isPending && purgeMutation.variables?.id === item.id);
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                {/* Top: type badge + deleted time */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.typeLabel}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {relativeTime(item.deletedAt)}
                  </span>
                </div>

                {/* Identity */}
                <div className="flex items-center gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white ${avatarColor(
                        item.title || item.type
                      )}`}
                    >
                      {initials(item.title || "?")}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-slate-50">
                      {item.title || "Untitled"}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Meta details */}
                {item.meta && item.meta.length > 0 && (
                  <dl className="space-y-1 text-xs">
                    {item.meta.map((m) => (
                      <div key={m.label} className="flex justify-between gap-2">
                        <dt className="shrink-0 text-slate-400">{m.label}</dt>
                        <dd className="truncate text-right text-slate-700 dark:text-slate-300">
                          {m.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 gap-1.5 text-xs"
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
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          if (filter !== "all") emptyMutation.mutate(filter);
          setEmptyConfirm(false);
        }}
      />
    </div>
  );
}
