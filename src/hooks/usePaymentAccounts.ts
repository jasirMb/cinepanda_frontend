"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPaymentAccounts,
  type PaymentAccountsListResponse,
} from "@/lib/api/payment-accounts";

export const paymentAccountsKeys = {
  all: ["payment-accounts"] as const,
  list: () => [...paymentAccountsKeys.all, "list"] as const,
};

export function usePaymentAccounts() {
  return useQuery<PaymentAccountsListResponse>({
    queryKey: paymentAccountsKeys.list(),
    queryFn: fetchPaymentAccounts,
    staleTime: 60_000,
  });
}
