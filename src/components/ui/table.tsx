"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = (
  props: React.TableHTMLAttributes<HTMLTableElement>
) => (
  <table
    className={cn("w-full border-collapse text-left text-sm", props.className)}
    {...props}
  />
);

export const TableHeader = (
  props: React.HTMLAttributes<HTMLTableSectionElement>
) => (
  <thead
    className="bg-slate-50 text-slate-600 dark:bg-slate-900/80 dark:text-slate-400"
    {...props}
  />
);

export const TableBody = (
  props: React.HTMLAttributes<HTMLTableSectionElement>
) => (
  <tbody className="divide-y divide-slate-200 dark:divide-slate-800" {...props} />
);

export const TableRow = (props: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/60" {...props} />
);

export const TableHead = (
  props: React.ThHTMLAttributes<HTMLTableCellElement>
) => (
  <th
    className={cn(
      "px-4 py-3 text-[11px] font-medium uppercase tracking-wide",
      props.className
    )}
    {...props}
  />
);

export const TableCell = (
  props: React.TdHTMLAttributes<HTMLTableCellElement>
) => (
  <td
    className={cn("px-4 py-3 align-middle", props.className)}
    {...props}
  />
);

