"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface ProjectOption {
  _id: string;
  name: string;
}

/**
 * Searchable project filter. Value is "" (All), "NONE" (Without project), or a
 * project id. Used on the vendor / payment-account statement pages.
 */
export function ProjectFilter({
  value,
  onChange,
  options,
  includeNone = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ProjectOption[];
  includeNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label =
    value === ""
      ? "All projects"
      : value === "NONE"
        ? "Without project"
        : options.find((o) => o._id === value)?.name ?? "Project";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.name.toLowerCase().includes(s)) : options;
  }, [options, q]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-44 items-center justify-between gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-slate-100 p-1.5 dark:border-slate-800">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              className="h-7 w-full rounded border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <Opt active={value === ""} onClick={() => pick("")}>
              All projects
            </Opt>
            {includeNone && (
              <Opt active={value === "NONE"} onClick={() => pick("NONE")}>
                Without project
              </Opt>
            )}
            {filtered.map((o) => (
              <Opt key={o._id} active={value === o._id} onClick={() => pick(o._id)}>
                {o.name}
              </Opt>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-1.5 text-xs text-slate-400">
                No matching project
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Opt({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`block w-full truncate px-3 py-1.5 text-left text-xs ${
          active
            ? "bg-cine-primary/10 font-medium text-cine-primary"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        }`}
      >
        {children}
      </button>
    </li>
  );
}
