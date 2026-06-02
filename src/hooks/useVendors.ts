"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVendors, type VendorsListResponse } from "@/lib/api/vendors";

export const vendorsKeys = {
  all: ["vendors"] as const,
  list: () => [...vendorsKeys.all, "list"] as const,
};

export function useVendors() {
  return useQuery<VendorsListResponse>({
    queryKey: vendorsKeys.list(),
    queryFn: fetchVendors,
    staleTime: 60_000,
  });
}
