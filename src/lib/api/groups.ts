import api from "@/lib/axios-client";
import type { LabourLite } from "@/lib/api/labours";

export interface Group {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  // Populated only on the detail endpoint (group's labour roster).
  labours?: LabourLite[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupsListResponse {
  success: boolean;
  data: Group[];
  count: number;
}

export interface GroupPayload {
  name: string;
  description?: string;
  color?: string;
}

export async function fetchGroups(): Promise<GroupsListResponse> {
  const { data } = await api.get<GroupsListResponse>("/groups");
  return data;
}

export async function fetchGroup(id: string): Promise<Group> {
  const { data } = await api.get<{ success: boolean; data: Group }>(
    `/groups/${id}`
  );
  return data.data;
}

export async function createGroup(payload: GroupPayload): Promise<Group> {
  const { data } = await api.post<{ success: boolean; data: Group }>(
    "/groups",
    payload
  );
  return data.data;
}

export async function updateGroup(
  id: string,
  payload: Partial<GroupPayload>
): Promise<Group> {
  const { data } = await api.put<{ success: boolean; data: Group }>(
    `/groups/${id}`,
    payload
  );
  return data.data;
}

export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/groups/${id}`);
}

export async function addGroupLabour(
  id: string,
  labourId: string
): Promise<Group> {
  const { data } = await api.post<{ success: boolean; data: Group }>(
    `/groups/${id}/labours`,
    { labourId }
  );
  return data.data;
}

export async function removeGroupLabour(
  id: string,
  labourId: string
): Promise<Group> {
  const { data } = await api.delete<{ success: boolean; data: Group }>(
    `/groups/${id}/labours/${labourId}`
  );
  return data.data;
}
