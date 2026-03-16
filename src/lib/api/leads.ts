import api from "@/lib/axios-client";

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
}

export interface LeadsListQuery {
  page?: number;
  limit?: number;
  search?: string;
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

