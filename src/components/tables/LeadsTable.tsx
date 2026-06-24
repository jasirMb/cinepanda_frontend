"use client";

import Link from "next/link";
import { Eye, Lock, Pencil, Phone, Trash2, UserCheck } from "lucide-react";
import { type Lead } from "@/lib/api/leads";

interface LeadsTableProps {
  leads: Lead[];
  onDelete?: (id: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  META: "Meta",
  YOUTUBE: "YouTube",
  REFERENCE: "Reference",
  WALKIN: "Walk-in",
  WALK_IN: "Walk-in",
  REFERRAL: "Reference",
  OTHER: "Other",
};
function sourceLabel(s: string) {
  return SOURCE_LABELS[s] ?? s.replace(/_/g, " ");
}

function statusTone(status: string) {
  switch (status) {
    case "NEW_LEAD":
      return "text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-950/50";
    case "CLOSED_WON":
      return "text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-950/50";
    case "CLOSED_LOST":
      return "text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-950/50";
    case "ON_HOLD":
      return "text-amber-800 bg-amber-100 dark:text-amber-200 dark:bg-amber-950/50";
    case "FOLLOW_UP":
      return "text-violet-700 bg-violet-100 dark:text-violet-200 dark:bg-violet-950/50";
    default:
      return "text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800";
  }
}
function priorityTone(priority?: string) {
  switch (priority) {
    case "URGENT_BUILD":
      return "text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-950/50";
    case "TAKES_TIME":
      return "text-amber-800 bg-amber-100 dark:text-amber-200 dark:bg-amber-950/50";
    case "ENQUIRED":
      return "text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-950/50";
    default:
      return "text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800";
  }
}

const AVATAR_PALETTE = [
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
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

function nextCallInfo(iso?: string) {
  if (!iso) return { text: "No follow-up", tone: "text-slate-400" };
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const text = d.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (d < startToday) return { text, tone: "text-red-600 dark:text-red-400 font-medium" };
  if (d <= endToday) return { text, tone: "text-amber-600 dark:text-amber-400 font-medium" };
  return { text, tone: "text-slate-600 dark:text-slate-300" };
}

export function LeadsTable({ leads, onDelete }: LeadsTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-4 py-3 text-right font-medium w-12">#</th>
              <th className="px-4 py-3 text-left font-medium">Lead</th>
              <th className="px-4 py-3 text-left font-medium">Contact</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Priority</th>
              <th className="px-4 py-3 text-left font-medium">Next Call</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {leads.map((lead, index) => {
              const nc = nextCallInfo(lead.nextCallTime);
              const customerId =
                lead.customerId && typeof lead.customerId === "object"
                  ? lead.customerId._id
                  : (lead.customerId as string | null | undefined);
              return (
                <tr
                  key={lead._id}
                  className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {/* Row number */}
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-400">
                    {index + 1}
                  </td>

                  {/* Lead */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(
                          lead.customerName
                        )}`}
                      >
                        {initials(lead.customerName)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/leads/${lead._id}`}
                          className="block truncate font-medium text-slate-900 hover:text-cine-primary hover:underline dark:text-slate-50"
                          title={lead.customerName}
                        >
                          {lead.customerName}
                        </Link>
                        {lead.place && (
                          <p className="truncate text-xs text-slate-400">{lead.place}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-2.5">
                    {lead.contactNumber ? (
                      <a
                        href={`tel:${lead.contactNumber}`}
                        className="inline-flex items-center gap-1.5 text-slate-600 hover:text-cine-primary dark:text-slate-300"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {lead.contactNumber}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {sourceLabel(lead.leadSource)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(lead.status)}`}
                    >
                      {lead.status.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-2.5">
                    {lead.priorityType ? (
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityTone(lead.priorityType)}`}
                      >
                        {lead.priorityType.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Next Call */}
                  <td className={`whitespace-nowrap px-4 py-2.5 text-xs tabular-nums ${nc.tone}`}>
                    {nc.text}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {lead.status === "CLOSED_WON" && customerId && (
                        <Link
                          href={`/customers/${customerId}`}
                          aria-label="View customer"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-cine-primary dark:hover:bg-slate-800"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/leads/${lead._id}`}
                        aria-label={`View ${lead.customerName}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-cine-primary dark:hover:bg-slate-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/leads/new?edit=${lead._id}`}
                        aria-label={`Edit ${lead.customerName}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-cine-primary dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      {lead.locked ? (
                        lead.lockHref ? (
                          <Link
                            href={lead.lockHref}
                            title={`${lead.lockReason ?? "Locked"} — open it`}
                            aria-label={`${lead.lockReason ?? "Locked"} — open the linked record`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-amber-500 transition hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span
                            title={lead.lockReason ?? "Linked — can't be deleted"}
                            aria-label={lead.lockReason ?? "Locked"}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-amber-500"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )
                      ) : (
                        onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(lead._id)}
                            aria-label={`Delete ${lead.customerName}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
