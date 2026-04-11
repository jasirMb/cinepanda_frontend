"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchQuotations,
  fetchQuotation,
  type QuotationsListResponse,
  type Quotation,
} from "@/lib/api/quotations";

export const quotationsKeys = {
  all: ["quotations"] as const,
  list: () => [...quotationsKeys.all, "list"] as const,
  detail: (id: string) => [...quotationsKeys.all, id] as const,
};

export function useQuotations() {
  return useQuery<QuotationsListResponse>({
    queryKey: quotationsKeys.list(),
    queryFn: fetchQuotations,
    staleTime: 60_000,
  });
}

export function useQuotation(id: string) {
  return useQuery<Quotation>({
    queryKey: quotationsKeys.detail(id),
    queryFn: () => fetchQuotation(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}
