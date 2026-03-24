"use client";

import clsx from "clsx";
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Place</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Lead Date</TableHead>
            <TableHead>Last Update</TableHead>
            <TableHead>Next Call</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead._id}>
              <TableCell>{lead.customerName}</TableCell>
              <TableCell>{lead.place}</TableCell>
              <TableCell>{lead.contactNumber}</TableCell>
              <TableCell>{lead.leadSource}</TableCell>
              <TableCell>
                <span
                  className={clsx(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    statusTone(lead.status)
                  )}
                >
                  {lead.status.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={clsx(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    priorityTone(lead.priorityType)
                  )}
                >
                  {lead.priorityType.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell>
                {lead.leadDate ? new Date(lead.leadDate).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell>
                {lead.lastUpdate ? new Date(lead.lastUpdate).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell>
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
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-slate-500 dark:text-slate-400"
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

