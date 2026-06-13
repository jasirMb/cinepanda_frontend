"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchStaff,
  fetchStaffById,
  fetchStaffOverview,
  fetchStaffMonth,
  fetchHolidaySettings,
} from "@/lib/api/staff";

export const staffKeys = {
  all: ["staff"] as const,
  list: () => [...staffKeys.all, "list"] as const,
  detail: (id: string) => [...staffKeys.all, id] as const,
  overview: (year: number, month: number) =>
    [...staffKeys.all, "overview", year, month] as const,
  month: (id: string, year: number, month: number) =>
    [...staffKeys.all, id, "month", year, month] as const,
  holidays: ["holiday-settings"] as const,
};

export function useStaff() {
  return useQuery({ queryKey: staffKeys.list(), queryFn: fetchStaff, staleTime: 60_000 });
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => fetchStaffById(id),
    enabled: !!id,
  });
}

export function useStaffOverview(year: number, month: number) {
  return useQuery({
    queryKey: staffKeys.overview(year, month),
    queryFn: () => fetchStaffOverview(year, month),
    staleTime: 30_000,
  });
}

export function useStaffMonth(id: string, year: number, month: number) {
  return useQuery({
    queryKey: staffKeys.month(id, year, month),
    queryFn: () => fetchStaffMonth(id, year, month),
    enabled: !!id,
  });
}

export function useHolidaySettings() {
  return useQuery({
    queryKey: staffKeys.holidays,
    queryFn: fetchHolidaySettings,
    staleTime: 60_000,
  });
}
