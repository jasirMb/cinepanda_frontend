"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchGroups,
  fetchGroup,
  type GroupsListResponse,
  type Group,
} from "@/lib/api/groups";

export const groupsKeys = {
  all: ["groups"] as const,
  list: () => [...groupsKeys.all, "list"] as const,
  detail: (id: string) => [...groupsKeys.all, id] as const,
};

export function useGroups() {
  return useQuery<GroupsListResponse>({
    queryKey: groupsKeys.list(),
    queryFn: fetchGroups,
    staleTime: 60_000,
  });
}

export function useGroup(id: string) {
  return useQuery<Group>({
    queryKey: groupsKeys.detail(id),
    queryFn: () => fetchGroup(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}
