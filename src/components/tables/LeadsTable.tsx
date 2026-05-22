"use client";

import Link from "next/link";
import clsx from "clsx";
import { Pencil } from "lucide-react";
import { type Lead } from "@/lib/api/leads";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";

interface LeadsTableProps {
  leads: Lead[];
}

function statusTone(status: string) {
  switch (status) {
    case "OPEN":
      return "text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-900/40";
    case "CLOSED_WON":
      return "text-emerald-800 bg-emerald-100 dark:text-emerald-100 dark:bg-emerald-900/50";
    case "CLOSED_LOST":
      return "text-red-700 bg-red-50 dark:text-red-200 dark:bg-red-900/50";
    case "ON_HOLD":
      return "text-amber-800 bg-amber-100 dark:text-amber-100 dark:bg-amber-900/50";
    case "FOLLOW_UP":
      return "text-blue-800 bg-blue-100 dark:text-blue-100 dark:bg-blue-900/50";
    default:
      return "text-slate-800 bg-slate-100 dark:text-slate-100 dark:bg-slate-800/50";
  }
}

function priorityTone(priority?: string) {
  switch (priority) {
    case "URGENT_BUILD":
      return "text-red-800 bg-red-100 dark:text-red-100 dark:bg-red-900/50";
    case "TAKES_TIME":
      return "text-amber-800 bg-amber-100 dark:text-amber-100 dark:bg-amber-900/50";
    case "ENQUIRED":
      return "text-blue-800 bg-blue-100 dark:text-blue-100 dark:bg-blue-900/50";
    default:
      return "text-slate-800 bg-slate-100 dark:text-slate-100 dark:bg-slate-800/50";
  }
}

export function LeadsTable({ leads }: LeadsTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Table className="w-full min-w-[1100px] table-fixed">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
          <col className="w-[12%]" />
          <col className="w-[4%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3">Customer</TableHead>
            <TableHead className="px-4 py-3">Place</TableHead>
            <TableHead className="px-4 py-3">Contact</TableHead>
            <TableHead className="px-4 py-3">Source</TableHead>
            <TableHead className="px-4 py-3">Status</TableHead>
            <TableHead className="px-4 py-3">Priority</TableHead>
            <TableHead className="px-4 py-3">Lead Date</TableHead>
            <TableHead className="px-4 py-3">Last Update</TableHead>
            <TableHead className="px-4 py-3">Next Call</TableHead>
            <TableHead className="px-4 py-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead._id}>
              <TableCell className="truncate px-4 py-3 font-medium" title={lead.customerName}>
                {lead.customerName}
              </TableCell>
              <TableCell className="truncate px-4 py-3" title={lead.place}>
                {lead.place}
              </TableCell>
              <TableCell className="truncate px-4 py-3">{lead.contactNumber}</TableCell>
              <TableCell className="truncate px-4 py-3">{lead.leadSource}</TableCell>
              <TableCell className="px-4 py-3">
                <span
                  className={clsx(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    statusTone(lead.status)
                  )}
                >
                  {lead.status.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3">
                <span
                  className={clsx(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    priorityTone(lead.priorityType)
                  )}
                >
                  {lead.priorityType.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell className="truncate px-4 py-3 tabular-nums">
                {lead.leadDate ? new Date(lead.leadDate).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell className="truncate px-4 py-3 tabular-nums">
                {lead.lastUpdate ? new Date(lead.lastUpdate).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell className="truncate px-4 py-3 tabular-nums">
                {lead.nextCallTime
                  ? new Date(lead.nextCallTime).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "No follow-up"}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <Link
                  href={`/leads/new?edit=${lead._id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-cine-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cine-primary"
                  aria-label={`Edit ${lead.customerName}`}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={10}
                className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
              >
                No leads found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

