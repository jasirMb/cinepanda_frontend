"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchLeads,
  fetchFollowupLeads,
  type FollowupQuery,
  type FollowupResponse,
  type LeadsListQuery,
  type LeadsListResponse
} from "@/lib/api/leads";

export const leadsKeys = {
  all: ["leads"] as const,
  list: (params?: LeadsListQuery) => [...leadsKeys.all, params] as const,
  detail: (id: string) => [...leadsKeys.all, "detail", id] as const,
  followup: (params: FollowupQuery) => [...leadsKeys.all, "followup", params] as const
};

export function useLeads(params?: LeadsListQuery) {
  return useQuery<LeadsListResponse>({
    queryKey: leadsKeys.list(params),
    queryFn: () => fetchLeads(params),
    staleTime: 60_000
  });
}

export function useFollowupLeads(params: FollowupQuery) {
  return useQuery<FollowupResponse>({
    queryKey: leadsKeys.followup(params),
    queryFn: () => fetchFollowupLeads(params),
    staleTime: 60_000
  });
}

