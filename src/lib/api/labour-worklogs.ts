import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface WorkLogLabourRef {
  _id: string;
  name?: string;
  role?: string;
}

export interface WorkLogProjectRef {
  _id: string;
  clientName?: string;
  serviceType?: string;
}

export const WORK_SHIFTS = ["MORNING", "EVENING", "NIGHT"] as const;
export type WorkShift = (typeof WORK_SHIFTS)[number];

export interface LabourWorkLog {
  _id: string;
  labourId: WorkLogLabourRef | string;
  // Can be null at runtime when the referenced project has been trashed/deleted
  // (the soft-delete plugin hides trashed docs, so populate resolves to null).
  projectId: WorkLogProjectRef | string | null;
  workDate: string;
  sessionLabel?: string;
  /** Shifts worked that day (3 = full day). */
  shifts?: WorkShift[];
  /** Hours worked that day (alternative to shifts). */
  hours?: number;
  days: number;
  rate: number;
  /** Extra / bonus pay on top of days × rate. */
  extra?: number;
  amount: number;
  notes?: string;
  /** Account the salary was paid from (populated to {_id,name} on reads). */
  paymentAccountId?: { _id: string; name: string; type?: string } | string | null;
  paymentMethod?: string;
  ledgerEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLogsListResponse {
  success: boolean;
  data: LabourWorkLog[];
  count: number;
}

export interface WorkLogPayload {
  labourId: string;
  projectId: string;
  workDate: string;
  sessionLabel?: string;
  /** Shifts worked, or hours — the server derives the day fraction. */
  shifts?: WorkShift[];
  hours?: number;
  days?: number;
  rate: number;
  extra?: number;
  notes?: string;
  /** Required — which account the salary is paid from. */
  paymentAccountId: string;
  paymentMethod?: string;
}

export interface WorkLogQuery {
  labourId?: string;
  projectId?: string;
}

/* ────────────────────────────────────────────
   Labour work-logs API
   ──────────────────────────────────────────── */

export async function fetchWorkLogs(
  params: WorkLogQuery
): Promise<WorkLogsListResponse> {
  const { data } = await api.get<WorkLogsListResponse>("/labour-worklogs", {
    params,
  });
  return data;
}

export async function createWorkLog(
  payload: WorkLogPayload
): Promise<LabourWorkLog> {
  const { data } = await api.post<{ success: boolean; data: LabourWorkLog }>(
    "/labour-worklogs",
    payload
  );
  return data.data;
}

export async function updateWorkLog(
  id: string,
  payload: Partial<WorkLogPayload>
): Promise<LabourWorkLog> {
  const { data } = await api.put<{ success: boolean; data: LabourWorkLog }>(
    `/labour-worklogs/${id}`,
    payload
  );
  return data.data;
}

export async function deleteWorkLog(id: string): Promise<void> {
  await api.delete(`/labour-worklogs/${id}`);
}
