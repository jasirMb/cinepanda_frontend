"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCustomers,
  type CustomersListResponse,
} from "@/lib/api/customers";

export const customersKeys = {
  all: ["customers"] as const,
  list: () => [...customersKeys.all, "list"] as const,
};

export function useCustomers() {
  return useQuery<CustomersListResponse>({
    queryKey: customersKeys.list(),
    queryFn: fetchCustomers,
    staleTime: 60_000,
  });
}
