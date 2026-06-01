"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchWorkLogs,
  type WorkLogQuery,
  type WorkLogsListResponse,
} from "@/lib/api/labour-worklogs";

export const workLogKeys = {
  all: ["labour-worklogs"] as const,
  list: (params: WorkLogQuery) => [...workLogKeys.all, params] as const,
};

export function useLabourWorkLogs(params: WorkLogQuery) {
  return useQuery<WorkLogsListResponse>({
    queryKey: workLogKeys.list(params),
    queryFn: () => fetchWorkLogs(params),
    enabled: !!(params.labourId || params.projectId),
    staleTime: 60_000,
  });
}
