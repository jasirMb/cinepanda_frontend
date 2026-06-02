"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, X } from "lucide-react";

import { useLabours } from "@/hooks/useLabours";
import type { Labour, LabourLite } from "@/lib/api/labours";
import { Input } from "@/components/ui/input";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_PALETTE = [
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/**
 * Labour roster for a vendor or group: lists assigned labours with a remove
 * action, plus a searchable picker to add more (excludes already-added ones).
 */
export function LabourRoster({
  labours,
  onAdd,
  onRemove,
  pending,
  emptyText = "No labours yet. Search to add some.",
}: {
  labours: LabourLite[];
  onAdd: (labourId: string) => void;
  onRemove: (labourId: string) => void;
  pending?: boolean;
  emptyText?: string;
}) {
  const allLabours = useLabours().data?.data ?? [];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const assignedIds = useMemo(
    () => new Set(labours.map((l) => l._id)),
    [labours]
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLabours
      .filter((l: Labour) => !assignedIds.has(l._id))
      .filter((l: Labour) =>
        !q
          ? true
          : l.name.toLowerCase().includes(q) ||
            (l.role ?? "").toLowerCase().includes(q) ||
            (l.phone ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [allLabours, assignedIds, search]);

  function handleAdd(id: string) {
    onAdd(id);
    setSearch("");
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* Add picker */}
      <div className="relative" ref={boxRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search labours to add…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            disabled={pending}
          />
        </div>
        {open && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {matches.map((l) => (
              <li key={l._id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAdd(l._id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                      l.name
                    )}`}
                  >
                    {getInitials(l.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {l.name}
                    {l.role ? (
                      <span className="text-slate-400"> · {l.role}</span>
                    ) : null}
                  </span>
                  <UserPlus className="h-4 w-4 text-cine-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && search.trim() && matches.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            No matching labours.
          </div>
        )}
      </div>

      {/* Current roster */}
      {labours.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {labours.map((l) => (
            <div
              key={l._id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${avatarColor(
                  l.name
                )}`}
              >
                {l.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.avatarUrl}
                    alt={l.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(l.name)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/labours/${l._id}`}
                  className="block truncate text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  {l.name}
                </Link>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {[l.role, l.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(l._id)}
                disabled={pending}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30"
                aria-label={`Remove ${l.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
