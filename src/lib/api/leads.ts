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
  priorityType: string | null;
  status: string;
  requirement: string;
  statusDescription: string;
  /** Present on the list endpoint — delete is blocked when true. */
  locked?: boolean;
  lockReason?: string | null;
  /** Route of the record that locks this lead (e.g. /quotations/:id) — click-through. */
  lockHref?: string | null;
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
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
  /** Optional accent colour (used by temperature / priority dots). */
  color?: string;
}

async function fetchLeadEnum(path: string): Promise<LeadEnumOption[]> {
  const { data } = await api.get<{ success: boolean; data: any[] }>(path);
  return (data.data ?? [])
    .filter((o) => o?.value && o.isActive !== false)
    .map((o) => ({
      value: o.value as string,
      label: (o.label ?? o.value) as string,
      color: o.color as string | undefined,
    }));
}

export const fetchLeadSources = () => fetchLeadEnum("/leads/enums/sources");
export const fetchPriorityTypes = () => fetchLeadEnum("/leads/enums/priorities");
export const fetchLeadStatuses = () => fetchLeadEnum("/leads/enums/statuses");
export const fetchProjectStages = () => fetchLeadEnum("/leads/enums/project-stages");
export const fetchLeadTemperatures = () => fetchLeadEnum("/leads/enums/temperatures");
export const fetchBudgetRanges = () => fetchLeadEnum("/leads/enums/budget-ranges");
export const fetchPropertyTypes = () => fetchLeadEnum("/leads/enums/property-types");
export const fetchPropertyStatuses = () => fetchLeadEnum("/leads/enums/property-statuses");
export const fetchSystemTypes = () => fetchLeadEnum("/leads/enums/system-types");
export const fetchLeadPriorities = () => fetchLeadEnum("/leads/enums/lead-priorities");
export const fetchExpectedTimelines = () => fetchLeadEnum("/leads/enums/expected-timelines");
export const fetchDesignApprovals = () => fetchLeadEnum("/leads/enums/design-approvals");
export const fetchAcousticPackages = () => fetchLeadEnum("/leads/enums/acoustic-packages");
export const fetchLostReasons = () => fetchLeadEnum("/leads/enums/lost-reasons");
export const fetchDesignStatuses = () => fetchLeadEnum("/leads/enums/design-statuses");
export const fetchPresentationStatuses = () => fetchLeadEnum("/leads/enums/presentation-statuses");

/** Append a manual activity to a lead's timeline. */
export async function addLeadActivity(
  id: string,
  activity: { type?: string; label: string; note?: string | null; at?: string | null }
): Promise<Lead> {
  const { data } = await api.post<{ success: boolean; data: Lead }>(
    `/leads/${id}/activities`,
    activity
  );
  return data.data;
}

/** Edit an activity (by its index in the stored array). */
export async function updateLeadActivity(
  id: string,
  index: number,
  patch: { label?: string; note?: string | null; at?: string | null }
): Promise<Lead> {
  const { data } = await api.patch<{ success: boolean; data: Lead }>(
    `/leads/${id}/activities/${index}`,
    patch
  );
  return data.data;
}

/** Delete an activity (by its index in the stored array). */
export async function deleteLeadActivity(id: string, index: number): Promise<Lead> {
  const { data } = await api.delete<{ success: boolean; data: Lead }>(
    `/leads/${id}/activities/${index}`
  );
  return data.data;
}

export interface ConvertLeadToProjectResult {
  lead: Lead;
  project: { _id: string; clientName: string; projectValue: number };
}

/** Convert a (won) lead into a Project linked back to the lead. */
export async function convertLeadToProject(
  id: string,
  payload: { projectValue: number; serviceType?: string }
): Promise<ConvertLeadToProjectResult> {
  const { data } = await api.post<{ success: boolean; data: ConvertLeadToProjectResult }>(
    `/leads/${id}/convert-to-project`,
    payload
  );
  return data.data;
}

export interface LeadAttachment {
  fileName: string;
  fileUrl: string;
}

export interface LeadActivity {
  type: string;
  label: string;
  note?: string | null;
  at: string;
}

export interface CreateLeadPayload {
  customerName: string;
  place: string;
  contactNumber: string;
  contactCountryCode: string; // e.g., "+1", "+91", "+44"
  alternativeNumber?: string | null;
  alternativeCountryCode?: string | null; // e.g., "+1", "+91", "+44"
  leadSource: string;
  leadDate?: string;
  lastUpdate?: string;
  priorityType?: string | null; // legacy — superseded by leadPriority
  requirement: string;
  statusDescription: string;
  status?: string;
  nextCallTime?: string | null;

  // ── Extended lead details (all optional) ──────────────────────────────
  leadOwner?: string | null;
  email?: string | null;
  projectStage?: string | null;
  leadTemperature?: string | null;
  budgetRange?: string | null;
  expectedPurchaseDate?: string | null;
  propertyType?: string | null;
  propertyStatus?: string | null;
  systemType?: string | null;
  roomLength?: number | null;
  roomWidth?: number | null;
  roomHeight?: number | null;
  roomUnit?: string | null; // ft | m | cm | mm
  siteAddress?: string | null;
  architectName?: string | null;
  architectContact?: string | null;
  architectCountryCode?: string | null;
  designerName?: string | null;
  designerContact?: string | null;
  designerCountryCode?: string | null;
  architectPrefix?: string | null;
  designerPrefix?: string | null;
  customerPrefix?: string | null;
  referralPrefix?: string | null;
  referralName?: string | null;
  referralContact?: string | null;
  referralCountryCode?: string | null;
  referralAmount?: number | null;
  referralCommissionPercent?: number | null;
  followupReminder?: string | null;
  leadPriority?: string | null;
  quoteSent?: boolean;
  quoteValue?: number | null;
  quoteDate?: string | null;
  followUpDate?: string | null;
  tags?: string[];
  internalNotes?: string | null;
  attachments?: LeadAttachment[];

  // ── Project scoping / design tracking ──────────────────────────────────
  expectedTimeline?: string | null;
  dedicatedRoom?: boolean | null;
  designDeliveryDate?: string | null;
  designApproval?: string | null;
  acousticPackage?: string | null;
  viewedOn?: string | null;

  // ── Home theatre design & 3D ───────────────────────────────────────────
  seatingCapacity?: number | null;
  threeDDesignRequired?: boolean | null;
  designStatus?: string | null;
  designer?: string | null;
  threeDDesignCost?: number | null;
  previewLink?: string | null;
  screenSize?: string | null;
  projector?: string | null;
  speakerLayout?: string | null;
  theme?: string | null;
  presentationStatus?: string | null;
  designFiles?: LeadAttachment[];
  renderImages?: LeadAttachment[];
  /** Read-only — auto-computed 0–100. */
  leadScore?: number | null;

  // ── Outcome ────────────────────────────────────────────────────────────
  lostReason?: string | null;
  projectValue?: number | null;
  /** Read-only — set when the lead is converted to a project. */
  convertedProjectId?: string | null;
  /** Read-only — activity timeline. */
  activities?: LeadActivity[];
}

// Adds the editable lead fields (incl. contact/alternative country codes) onto
// the display shape declared above — the two declarations merge into one `Lead`.
export interface Lead extends CreateLeadPayload {
  _id: string;
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

