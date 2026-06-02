"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPaymentAccounts,
  fetchPaymentAccount,
  type PaymentAccountsListResponse,
  type PaymentAccount,
} from "@/lib/api/payment-accounts";

export const paymentAccountsKeys = {
  all: ["payment-accounts"] as const,
  list: () => [...paymentAccountsKeys.all, "list"] as const,
  detail: (id: string) => [...paymentAccountsKeys.all, id] as const,
};

export function usePaymentAccounts() {
  return useQuery<PaymentAccountsListResponse>({
    queryKey: paymentAccountsKeys.list(),
    queryFn: fetchPaymentAccounts,
    staleTime: 60_000,
  });
}

export function usePaymentAccount(id: string) {
  return useQuery<PaymentAccount>({
    queryKey: paymentAccountsKeys.detail(id),
    queryFn: () => fetchPaymentAccount(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}
