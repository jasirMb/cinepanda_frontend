"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchVendors,
  fetchVendor,
  type VendorsListResponse,
  type Vendor,
} from "@/lib/api/vendors";

export const vendorsKeys = {
  all: ["vendors"] as const,
  list: () => [...vendorsKeys.all, "list"] as const,
  detail: (id: string) => [...vendorsKeys.all, id] as const,
};

export function useVendors() {
  return useQuery<VendorsListResponse>({
    queryKey: vendorsKeys.list(),
    queryFn: fetchVendors,
    staleTime: 60_000,
  });
}

export function useVendor(id: string) {
  return useQuery<Vendor>({
    queryKey: vendorsKeys.detail(id),
    queryFn: () => fetchVendor(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}
