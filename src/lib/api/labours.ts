import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export const LABOUR_REGIONS = ["Kerala", "Non-Kerala", "Non-Indian"] as const;
export type LabourRegion = (typeof LABOUR_REGIONS)[number];

export interface Labour {
  _id: string;
  name: string;
  phone?: string;
  role?: string;
  dailyWage?: number;
  region?: LabourRegion;
  state?: string;
  details?: string;
  avatarUrl?: string;
  avatarKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaboursListResponse {
  success: boolean;
  data: Labour[];
  count: number;
}

export interface LabourPayload {
  name: string;
  phone?: string;
  role?: string;
  dailyWage?: number;
  region?: LabourRegion;
  state?: string;
  details?: string;
  avatarUrl?: string;
  avatarKey?: string;
}

/* ────────────────────────────────────────────
   Labours API
   ──────────────────────────────────────────── */

export async function fetchLabours(): Promise<LaboursListResponse> {
  const { data } = await api.get<LaboursListResponse>("/labours");
  return data;
}

export async function fetchLabourRoles(): Promise<string[]> {
  const { data } = await api.get<{ success: boolean; data: string[] }>(
    "/labours/roles"
  );
  return data.data;
}

export async function fetchLabour(id: string): Promise<Labour> {
  const { data } = await api.get<{ success: boolean; data: Labour }>(
    `/labours/${id}`
  );
  return data.data;
}

export async function createLabour(payload: LabourPayload): Promise<Labour> {
  const { data } = await api.post<{ success: boolean; data: Labour }>(
    "/labours",
    payload
  );
  return data.data;
}

export async function updateLabour(
  id: string,
  payload: Partial<LabourPayload>
): Promise<Labour> {
  const { data } = await api.put<{ success: boolean; data: Labour }>(
    `/labours/${id}`,
    payload
  );
  return data.data;
}

export async function deleteLabour(id: string): Promise<void> {
  await api.delete(`/labours/${id}`);
}

/* ────────────────────────────────────────────
   Memberships (which vendors & groups a labour belongs to)
   ──────────────────────────────────────────── */

/** Subset of a labour returned when populated inside a vendor/group roster. */
export interface LabourLite {
  _id: string;
  name: string;
  role?: string;
  phone?: string;
  dailyWage?: number;
  region?: LabourRegion;
  state?: string;
  avatarUrl?: string;
}

export interface LabourMemberships {
  vendors: { _id: string; name: string }[];
  groups: { _id: string; name: string; color?: string; avatarUrl?: string }[];
}

export async function fetchLabourMemberships(
  id: string
): Promise<LabourMemberships> {
  const { data } = await api.get<{ success: boolean; data: LabourMemberships }>(
    `/labours/${id}/memberships`
  );
  return data.data;
}
