"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown after the label (e.g. place, type). */
  hint?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Show a leading "clear" row; selecting it calls onChange(""). */
  clearable?: boolean;
  clearLabel?: string;
}

/**
 * A searchable single-select dropdown (Popover + filterable list) for long
 * lists like projects, customers, categories and vendors. Selecting an option
 * closes the popover; type to filter by label or hint.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  disabled,
  className,
  clearable,
  clearLabel = "None",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  // Reset the search box each time the popover closes.
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between font-normal",
            !selected && "text-slate-500 dark:text-slate-400",
            className
          )}
        >
          <span className="truncate">
            {selected ? (
              <>
                {selected.label}
                {selected.hint && (
                  <span className="text-slate-400"> — {selected.hint}</span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <div className="flex items-center border-b border-slate-200 px-3 dark:border-slate-700">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {clearable && (
            <OptionRow
              label={clearLabel}
              selected={!value}
              onSelect={() => {
                onChange("");
                setOpen(false);
              }}
            />
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              {emptyText}
            </div>
          ) : (
            filtered.map((o) => (
              <OptionRow
                key={o.value}
                label={o.label}
                hint={o.hint}
                selected={o.value === value}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
        selected && "bg-slate-100 dark:bg-slate-800"
      )}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0",
          selected ? "text-cine-primary opacity-100" : "opacity-0"
        )}
      />
      <span className="truncate">
        {label}
        {hint && <span className="text-slate-400"> — {hint}</span>}
      </span>
    </button>
  );
}
