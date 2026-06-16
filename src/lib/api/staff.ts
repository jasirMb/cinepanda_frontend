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
  /** Override for standard working hours/day (else the global default). */
  workHours?: number;
  /** Override for overtime pay per hour (else the global default). */
  overtimeRate?: number;
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
  /** null clears the override → falls back to the global default. */
  workHours?: number | null;
  /** null clears the override → falls back to the global default. */
  overtimeRate?: number | null;
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
  /** Overtime hours worked this day (pay = hours × effective rate). */
  overtimeHours?: number;
  /** Manual flat overtime pay (overrides hours × rate; holiday default = day-rate). */
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
  /** Extra pay for overtime hours + holiday work. */
  overtimeEarned: number;
  /** Total = pro-rated base + overtime. */
  earned: number;
  /** Effective standard working hours/day. */
  standardWorkHours: number;
  /** Effective overtime pay per hour. */
  overtimeRate: number;
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
  /** Default standard working hours/day (per-staff overridable). */
  standardWorkHours: number;
  /** Default overtime pay per hour (per-staff overridable). */
  overtimeRate: number;
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
  note?: string | null,
  overtimeHours?: number | null
): Promise<AttendanceRecord | null> {
  const body: Record<string, unknown> = { date, status };
  if (overtimePay !== undefined) body.overtimePay = overtimePay;
  if (note !== undefined) body.note = note;
  if (overtimeHours !== undefined) body.overtimeHours = overtimeHours;
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
