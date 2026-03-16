"use client";

import { useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/tables/LeadsTable";

export default function LeadsPage() {
  const { data, isLoading, isError } = useLeads({ page: 1, limit: 20 });

  if (isLoading) {
    return <p className="text-slate-300">Loading leads...</p>;
  }

  if (isError) {
    return (
      <p className="text-red-400">
        Failed to load leads. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Leads</h2>
        <p className="text-sm text-slate-400">
          Manage incoming leads from all CinePanda channels.
        </p>
      </div>
      <LeadsTable leads={data?.data ?? []} />
    </div>
  );
}

