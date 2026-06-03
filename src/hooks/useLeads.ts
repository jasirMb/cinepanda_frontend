"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchLeads,
  fetchFollowupLeads,
  fetchLeadSources,
  fetchPriorityTypes,
  fetchLeadStatuses,
  type FollowupQuery,
  type FollowupResponse,
  type LeadsListQuery,
  type LeadsListResponse,
  type LeadEnumOption
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
    staleTime: 60_000,
    placeholderData: keepPreviousData
  });
}

export function useFollowupLeads(params: FollowupQuery) {
  return useQuery<FollowupResponse>({
    queryKey: leadsKeys.followup(params),
    queryFn: () => fetchFollowupLeads(params),
    staleTime: 60_000
  });
}

const ENUM_STALE = 5 * 60_000;

export function useLeadSources() {
  return useQuery<LeadEnumOption[]>({
    queryKey: ["lead-enums", "sources"],
    queryFn: fetchLeadSources,
    staleTime: ENUM_STALE
  });
}

export function usePriorityTypes() {
  return useQuery<LeadEnumOption[]>({
    queryKey: ["lead-enums", "priorities"],
    queryFn: fetchPriorityTypes,
    staleTime: ENUM_STALE
  });
}

export function useLeadStatuses() {
  return useQuery<LeadEnumOption[]>({
    queryKey: ["lead-enums", "statuses"],
    queryFn: fetchLeadStatuses,
    staleTime: ENUM_STALE
  });
}

