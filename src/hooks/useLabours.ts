"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchLabours,
  fetchLabour,
  fetchLabourRoles,
  type LaboursListResponse,
  type Labour,
} from "@/lib/api/labours";

export const laboursKeys = {
  all: ["labours"] as const,
  list: () => [...laboursKeys.all, "list"] as const,
  detail: (id: string) => [...laboursKeys.all, id] as const,
  roles: () => [...laboursKeys.all, "roles"] as const,
};

export function useLabours() {
  return useQuery<LaboursListResponse>({
    queryKey: laboursKeys.list(),
    queryFn: fetchLabours,
    staleTime: 60_000,
  });
}

export function useLabour(id: string) {
  return useQuery<Labour>({
    queryKey: laboursKeys.detail(id),
    queryFn: () => fetchLabour(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useLabourRoles() {
  return useQuery<string[]>({
    queryKey: laboursKeys.roles(),
    queryFn: fetchLabourRoles,
    staleTime: 60_000,
  });
}
