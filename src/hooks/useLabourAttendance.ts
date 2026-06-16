"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLabourAttendance } from "@/lib/api/labour-attendance";

export const labourAttendanceKeys = {
  all: ["labour-attendance"] as const,
  month: (labourId: string, projectId: string, year: number, month: number) =>
    [...labourAttendanceKeys.all, labourId, projectId, year, month] as const,
};

export function useLabourAttendance(
  labourId: string,
  projectId: string,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: labourAttendanceKeys.month(labourId, projectId, year, month),
    queryFn: () => fetchLabourAttendance(labourId, projectId, year, month),
    enabled: !!labourId && !!projectId,
  });
}
