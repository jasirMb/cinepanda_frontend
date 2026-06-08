import api from "@/lib/axios-client";

export interface Lead {
  _id: string;
  // May be unpopulated (id string) or populated ({_id,...}) depending on endpoint.
  customerId?: string | { _id: string; name?: string } | null;
  customerName: string;
  place: string;
  contactNumber: string;
  alternativeNumber?: string;
  leadSource: string;
  leadDate: string;
  lastUpdate: string;
  nextCallTime?: string;
  priorityType: string;
  status: string;
  requirement: string;
  statusDescription: string;
  /** Present on the list endpoint — delete is blocked when true. */
  locked?: boolean;
  lockReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConvertLeadPayload {
  place?: string;
  email?: string;
  notes?: string;
}

export interface ConvertLeadResult {
  customer: { _id: string; name: string; phone: string; place?: string };
  merged: boolean;
  lead: Lead;
}

/** Convert a won lead into a customer (dedupes by name+phone) and links it. */
export async function convertLeadToCustomer(
  leadId: string,
  payload: ConvertLeadPayload
): Promise<ConvertLeadResult> {
  const { data } = await api.post<{ success: boolean; data: ConvertLeadResult }>(
    `/leads/${leadId}/convert-to-customer`,
    payload
  );
  return data.data;
}

export interface LeadsListQuery {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  leadSource?: string;
  priorityType?: string;
  status?: string;
}

export interface LeadsListResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchLeads(
  params: LeadsListQuery = {}
): Promise<LeadsListResponse> {
  const { data } = await api.get<LeadsListResponse>("/leads", { params });
  return data;
}

export interface FollowupQuery {
  date: string;
  period?: string;
}

export interface FollowupResponse {
  success: boolean;
  data: Lead[];
  count: number;
  filters: {
    date: string;
    period: string;
    status: string;
  };
}

export async function fetchFollowupLeads(
  params: FollowupQuery
): Promise<FollowupResponse> {
  const { data } = await api.get<FollowupResponse>("/leads/followup", { params });
  return data;
}

export interface UpdateLeadStatusPayload {
  status: string;
  statusDescription?: string;
}

export async function updateLeadStatus(
  id: string,
  payload: UpdateLeadStatusPayload
): Promise<CreateLeadResponse> {
  const { data } = await api.patch<CreateLeadResponse>(`/leads/${id}/status`, payload);
  return data;
}

/* ────────────────────────────────────────────
   Lead enums (sources / priorities / statuses) — from the backend so the
   dropdown values always match what the server accepts.
   ──────────────────────────────────────────── */

export interface LeadEnumOption {
  value: string;
  label: string;
}

async function fetchLeadEnum(path: string): Promise<LeadEnumOption[]> {
  const { data } = await api.get<{ success: boolean; data: any[] }>(path);
  return (data.data ?? [])
    .filter((o) => o?.value && o.isActive !== false)
    .map((o) => ({ value: o.value as string, label: (o.label ?? o.value) as string }));
}

export const fetchLeadSources = () => fetchLeadEnum("/leads/enums/sources");
export const fetchPriorityTypes = () => fetchLeadEnum("/leads/enums/priorities");
export const fetchLeadStatuses = () => fetchLeadEnum("/leads/enums/statuses");

export interface CreateLeadPayload {
  customerName: string;
  place: string;
  contactNumber: string;
  alternativeNumber?: string | null;
  leadSource: string;
  leadDate: string;
  lastUpdate: string;
  priorityType: string;
  requirement: string;
  statusDescription: string;
  status?: string;
  nextCallTime?: string | null;
}

export interface CreateLeadResponse {
  success: boolean;
  data?: Lead;
  message?: string;
  error?: string;
}

export async function createLead(
  payload: CreateLeadPayload
): Promise<CreateLeadResponse> {
  const { data } = await api.post<CreateLeadResponse>("/leads", payload);
  return data;
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data } = await api.get<{ success: boolean; data: Lead }>(`/leads/${id}`);
  return data.data;
}

export async function updateLead(
  id: string,
  payload: CreateLeadPayload
): Promise<CreateLeadResponse> {
  const { data } = await api.put<CreateLeadResponse>(`/leads/${id}`, payload);
  return data;
}

/** Soft delete — moves the lead to the Trash (recoverable). */
export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

