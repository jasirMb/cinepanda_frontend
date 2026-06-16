import api from "@/lib/axios-client";

export const LABOUR_ATTENDANCE_STATUSES = [
  "FULL_DAY",
  "HALF_DAY",
  "OVERTIME",
  "LEAVE",
  "ABSENT",
] as const;
export type LabourAttendanceStatus =
  (typeof LABOUR_ATTENDANCE_STATUSES)[number];

export interface LabourAttendanceRecord {
  _id: string;
  labourId: string;
  projectId: string;
  date: string;
  status: LabourAttendanceStatus;
  /** Extra pay on an OVERTIME day. */
  overtimeExtra?: number;
  note?: string;
}

export interface LabourAttendanceSummary {
  rate: number;
  projectName?: string;
  plannedDays?: number;
  totalAmount?: number;
  startDate?: string;
  endDate?: string;
  workedDays: number;
  owed: number;
  paid: number;
  outstanding: number;
}

export interface LabourAttendancePayment {
  _id: string;
  labourId: string;
  projectId: string;
  amount: number;
  paymentAccountId?: { _id: string; name: string; type?: string } | string | null;
  paymentMethod?: string;
  paidDate: string;
  note?: string;
}

export interface LabourAttendanceResponse {
  records: LabourAttendanceRecord[];
  summary: LabourAttendanceSummary;
  payments: LabourAttendancePayment[];
  year: number;
  month: number;
}

export async function fetchLabourAttendance(
  labourId: string,
  projectId: string,
  year: number,
  month: number
): Promise<LabourAttendanceResponse> {
  const { data } = await api.get<{
    success: boolean;
    data: LabourAttendanceResponse;
  }>("/labour-attendance", {
    params: { labourId, projectId, year, month },
  });
  return data.data;
}

export async function markLabourAttendance(
  labourId: string,
  projectId: string,
  date: string,
  status: LabourAttendanceStatus | "",
  opts?: { overtimeExtra?: number | null; note?: string | null }
): Promise<LabourAttendanceRecord | null> {
  const body: Record<string, unknown> = { labourId, projectId, date, status };
  if (opts?.overtimeExtra !== undefined) body.overtimeExtra = opts.overtimeExtra;
  if (opts?.note !== undefined) body.note = opts.note;
  const { data } = await api.post<{
    success: boolean;
    data: LabourAttendanceRecord | null;
  }>("/labour-attendance/mark", body);
  return data.data;
}

export interface LabourPayPayload {
  labourId: string;
  projectId: string;
  amount: number;
  paymentAccountId: string;
  paymentMethod?: string;
  paidDate?: string;
  note?: string;
}

export async function payLabourAttendance(
  payload: LabourPayPayload
): Promise<LabourAttendancePayment> {
  const { data } = await api.post<{
    success: boolean;
    data: LabourAttendancePayment;
  }>("/labour-attendance/pay", payload);
  return data.data;
}

export async function deleteLabourAttendancePayment(id: string): Promise<void> {
  await api.delete(`/labour-attendance/payments/${id}`);
}

/** One of a labour's attendance settlement payments (project populated). */
export interface LabourPaymentItem {
  _id: string;
  amount: number;
  projectId?:
    | { _id: string; clientName?: string; serviceType?: string }
    | string
    | null;
  paymentAccountId?: { _id: string; name: string; type?: string } | string | null;
  paymentMethod?: string;
  paidDate: string;
}

/** All of a labour's attendance payments across every project. */
export async function fetchLabourPayments(
  labourId: string
): Promise<LabourPaymentItem[]> {
  const { data } = await api.get<{ success: boolean; data: LabourPaymentItem[] }>(
    "/labour-attendance/payments",
    { params: { labourId } }
  );
  return data.data;
}
