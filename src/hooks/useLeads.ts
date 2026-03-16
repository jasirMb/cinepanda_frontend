"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchLeads,
  type LeadsListQuery,
  type LeadsListResponse
} from "@/lib/api/leads";

export const leadsKeys = {
  all: ["leads"] as const,
  list: (params?: LeadsListQuery) => [...leadsKeys.all, params] as const
};

export function useLeads(params?: LeadsListQuery) {
  return useQuery<LeadsListResponse>({
    queryKey: leadsKeys.list(params),
    queryFn: () => fetchLeads(params),
    staleTime: 60_000
  });
}

