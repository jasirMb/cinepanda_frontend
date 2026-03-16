import api from "@/lib/axios-client";

export interface Lead {
  _id: string;
  customerName: string;
  place: string;
  contactNumber: string;
  leadSource: string;
  leadDate: string;
  lastUpdate: string;
  nextCallTime?: string;
  priorityType: string;
  status: string;
  requirement: string;
  statusDescription: string;
  createdAt: string;
  updatedAt: string;
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

export interface CreateLeadPayload {
  customerName: string;
  place: string;
  contactNumber: string;
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

