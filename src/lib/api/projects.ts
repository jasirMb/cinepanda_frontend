import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export type ProjectStatus =
  | "PLANNING"
  | "ONGOING"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export const VALID_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNING: ["ONGOING", "CANCELLED"],
  ONGOING: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ONGOING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export interface ProjectPopulated {
  _id: string;
  leadId?: {
    _id: string;
    customerName: string;
    contactNumber: string;
    status: string;
    requirement?: string;
  } | null;
  quotationId?: {
    _id: string;
    status: string;
    quotationDate: string;
    sections?: unknown[];
  } | null;
  customerId?: {
    _id: string;
    name: string;
    phone: string;
    place: string;
    email?: string;
  } | null;
  clientName: string;
  serviceType: string;
  projectValue: number;
  description?: string;
  notes?: string;
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsListResponse {
  success: boolean;
  data: ProjectPopulated[];
  count: number;
}

export interface ProjectDetailResponse {
  success: boolean;
  data: ProjectPopulated;
}

export interface ProjectsListQuery {
  status?: ProjectStatus;
  customerId?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateProjectPayload {
  clientName: string;
  serviceType: string;
  projectValue: number;
  description?: string;
  notes?: string;
  customerId?: string;
  leadId?: string;
  startDate: string;
  expectedCompletionDate: string;
}

export interface CreateFromQuotationPayload {
  serviceType: string;
  startDate: string;
  expectedCompletionDate: string;
  selectedSectionIndex?: number;
  projectValue?: number;
}

export interface MutationResponse {
  success: boolean;
  message?: string;
  data?: ProjectPopulated;
  error?: string;
}

/* ────────────────────────────────────────────
   API Functions
   ──────────────────────────────────────────── */

export async function fetchProjects(
  params: ProjectsListQuery = {}
): Promise<ProjectsListResponse> {
  const { data } = await api.get<ProjectsListResponse>("/projects", { params });
  return data;
}

export async function fetchProject(id: string): Promise<ProjectPopulated> {
  const { data } = await api.get<ProjectDetailResponse>(`/projects/${id}`);
  return data.data;
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<MutationResponse> {
  const { data } = await api.post<MutationResponse>("/projects", payload);
  return data;
}

export async function createProjectFromQuotation(
  quotationId: string,
  payload: CreateFromQuotationPayload
): Promise<MutationResponse> {
  const { data } = await api.post<MutationResponse>(
    `/projects/from-quotation/${quotationId}`,
    payload
  );
  return data;
}

export async function updateProject(
  id: string,
  payload: Partial<CreateProjectPayload & { status: ProjectStatus }>
): Promise<MutationResponse> {
  const { data } = await api.put<MutationResponse>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: string): Promise<MutationResponse> {
  const { data } = await api.delete<MutationResponse>(`/projects/${id}`);
  return data;
}
