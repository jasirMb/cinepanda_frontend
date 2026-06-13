import api from "@/lib/axios-client";

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "PAID_LEAVE",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface Staff {
  _id: string;
  name: string;
  designation?: string;
  monthlySalary?: number;
  /** Day of the month (1–31) the salary is due. */
  salaryDay?: number;
  phone?: string;
  joiningDate?: string;
  avatarUrl?: string;
  avatarKey?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPayload {
  name: string;
  designation?: string;
  monthlySalary?: number;
  salaryDay?: number;
  phone?: string;
  joiningDate?: string;
  avatarUrl?: string;
  avatarKey?: string;
}

export interface AttendanceRecord {
  _id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  /** Extra/overtime pay (holiday default = day-rate, working day = manual bonus). */
  overtimePay?: number;
  /** Reason note (why absent / on leave / half-day). */
  note?: string;
}

export interface StaffOverview {
  staff: {
    _id: string;
    name: string;
    designation?: string;
    monthlySalary: number;
  };
  year: number;
  month: number;
  workingDays: number;
  present: number;
  half: number;
  absent: number;
  paidLeave: number;
  paidDays: number;
  /** Days worked on a holiday/weekly-off. */
  holidayWorked: number;
  /** Extra pay for holiday work. */
  overtimeEarned: number;
  /** Total = pro-rated base + overtime. */
  earned: number;
  /** Whether this month's salary has been marked paid. */
  paid: boolean;
}

export interface SalaryPayment {
  _id: string;
  staffId: string;
  year: number;
  month: number;
  amount: number;
  paymentAccountId?: { _id: string; name: string; type?: string } | string | null;
  paymentMethod?: string;
  paidDate: string;
  note?: string;
}

export interface SalaryPaymentPayload {
  year: number;
  month: number;
  amount: number;
  paymentAccountId: string;
  paymentMethod?: string;
  paidDate?: string;
  note?: string;
}

export interface CustomHoliday {
  date: string;
  label?: string;
}

export interface HolidaySettings {
  sundayOff: boolean;
  saturdayOff: boolean;
  secondSaturdayOff: boolean;
  customHolidays: CustomHoliday[];
}

/* ────────────────────────────────────────────  Staff  ───────────────────── */

export async function fetchStaff(): Promise<Staff[]> {
  const { data } = await api.get<{ success: boolean; data: Staff[] }>("/staff");
  return data.data;
}

export async function fetchStaffOverview(
  year: number,
  month: number
): Promise<{ data: StaffOverview[]; year: number; month: number }> {
  const { data } = await api.get("/staff/overview", { params: { year, month } });
  return data;
}

export async function fetchStaffById(id: string): Promise<Staff> {
  const { data } = await api.get<{ success: boolean; data: Staff }>(
    `/staff/${id}`
  );
  return data.data;
}

export async function fetchStaffMonth(
  id: string,
  year: number,
  month: number
): Promise<{
  attendance: AttendanceRecord[];
  overview: StaffOverview;
  salaryPayment: SalaryPayment | null;
}> {
  const { data } = await api.get<{
    success: boolean;
    data: {
      attendance: AttendanceRecord[];
      overview: StaffOverview;
      salaryPayment: SalaryPayment | null;
    };
  }>(`/staff/${id}/month`, { params: { year, month } });
  return data.data;
}

export async function paySalary(
  id: string,
  payload: SalaryPaymentPayload
): Promise<SalaryPayment> {
  const { data } = await api.post<{ success: boolean; data: SalaryPayment }>(
    `/staff/${id}/salary`,
    payload
  );
  return data.data;
}

export async function deleteSalaryPayment(
  id: string,
  year: number,
  month: number
): Promise<void> {
  await api.delete(`/staff/${id}/salary`, { params: { year, month } });
}

export async function markAttendance(
  id: string,
  date: string,
  status: AttendanceStatus | "",
  overtimePay?: number | null,
  note?: string | null
): Promise<AttendanceRecord | null> {
  const body: Record<string, unknown> = { date, status };
  if (overtimePay !== undefined) body.overtimePay = overtimePay;
  if (note !== undefined) body.note = note;
  const { data } = await api.post<{
    success: boolean;
    data: AttendanceRecord | null;
  }>(`/staff/${id}/attendance`, body);
  return data.data;
}

export async function createStaff(payload: StaffPayload): Promise<Staff> {
  const { data } = await api.post<{ success: boolean; data: Staff }>(
    "/staff",
    payload
  );
  return data.data;
}

export async function updateStaff(
  id: string,
  payload: Partial<StaffPayload>
): Promise<Staff> {
  const { data } = await api.put<{ success: boolean; data: Staff }>(
    `/staff/${id}`,
    payload
  );
  return data.data;
}

export async function deleteStaff(id: string): Promise<void> {
  await api.delete(`/staff/${id}`);
}

/* ──────────────────────────────────────  Holiday settings  ──────────────── */

export async function fetchHolidaySettings(): Promise<HolidaySettings> {
  const { data } = await api.get<{ success: boolean; data: HolidaySettings }>(
    "/holiday-settings"
  );
  return data.data;
}

export async function updateHolidaySettings(
  payload: Partial<HolidaySettings>
): Promise<HolidaySettings> {
  const { data } = await api.put<{ success: boolean; data: HolidaySettings }>(
    "/holiday-settings",
    payload
  );
  return data.data;
}
