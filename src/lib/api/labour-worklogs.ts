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

export interface LabourWorkLog {
  _id: string;
  labourId: WorkLogLabourRef | string;
  projectId: WorkLogProjectRef | string;
  workDate: string;
  sessionLabel?: string;
  days: number;
  rate: number;
  amount: number;
  notes?: string;
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
  days: number;
  rate: number;
  notes?: string;
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
