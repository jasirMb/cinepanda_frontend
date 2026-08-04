"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPaymentAccounts,
  fetchPaymentAccount,
  fetchAccountStatement,
  type PaymentAccountsListResponse,
  type PaymentAccount,
  type AccountStatementResponse,
  type StatementQuery,
} from "@/lib/api/payment-accounts";

export const paymentAccountsKeys = {
  all: ["payment-accounts"] as const,
  list: () => [...paymentAccountsKeys.all, "list"] as const,
  detail: (id: string) => [...paymentAccountsKeys.all, id] as const,
  statement: (id: string, params?: StatementQuery) =>
    [...paymentAccountsKeys.all, id, "statement", params ?? {}] as const,
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

export function useAccountStatement(id: string, params?: StatementQuery) {
  return useQuery<AccountStatementResponse>({
    queryKey: paymentAccountsKeys.statement(id, params),
    queryFn: () => fetchAccountStatement(id, params),
    enabled: !!id,
    staleTime: 30_000,
  });
}
