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
  labours?: ProjectLabour[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectLabourInfo {
  _id: string;
  name: string;
  role?: string;
  dailyWage?: number;
  avatarUrl?: string;
  region?: string;
  state?: string;
}

export interface ProjectLabour {
  labourId: ProjectLabourInfo;
  charge: number;
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
  labourId?: string;
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

/** Add a labour (with its per-project charge) to a project, or update the charge. */
export async function addProjectLabour(
  projectId: string,
  labourId: string,
  charge: number
): Promise<ProjectPopulated> {
  const { data } = await api.post<ProjectDetailResponse>(
    `/projects/${projectId}/labours`,
    { labourId, charge }
  );
  return data.data;
}

/** Remove a labour from a project's involved-labours roster. */
export async function removeProjectLabour(
  projectId: string,
  labourId: string
): Promise<ProjectPopulated> {
  const { data } = await api.delete<ProjectDetailResponse>(
    `/projects/${projectId}/labours/${labourId}`
  );
  return data.data;
}

/** Add all labours from a group to the project (deduped server-side). */
export async function addProjectGroup(
  projectId: string,
  groupId: string
): Promise<ProjectPopulated> {
  const { data } = await api.post<ProjectDetailResponse>(
    `/projects/${projectId}/groups`,
    { groupId }
  );
  return data.data;
}
