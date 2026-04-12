"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchLedgerEntries,
  fetchLedgerEntry,
  fetchLedgerSummary,
  type LedgerListQuery,
  type LedgerListResponse,
  type LedgerEntryPopulated,
  type LedgerSummaryResponse,
} from "@/lib/api/ledger";

export const ledgerKeys = {
  all: ["ledger"] as const,
  list: (params?: LedgerListQuery) => [...ledgerKeys.all, params] as const,
  detail: (id: string) => [...ledgerKeys.all, id] as const,
  summary: (params?: LedgerListQuery) =>
    [...ledgerKeys.all, "summary", params] as const,
};

export function useLedger(params?: LedgerListQuery) {
  return useQuery<LedgerListResponse>({
    queryKey: ledgerKeys.list(params),
    queryFn: () => fetchLedgerEntries(params),
    staleTime: 60_000,
  });
}

export function useLedgerEntry(id: string) {
  return useQuery<LedgerEntryPopulated>({
    queryKey: ledgerKeys.detail(id),
    queryFn: () => fetchLedgerEntry(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useLedgerSummary(params?: LedgerListQuery) {
  return useQuery<LedgerSummaryResponse>({
    queryKey: ledgerKeys.summary(params),
    queryFn: () => fetchLedgerSummary(params),
    staleTime: 60_000,
  });
}
