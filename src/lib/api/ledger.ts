import api from "@/lib/axios-client";
import type { ProjectStatus } from "./projects";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export type EntryType = "INCOME" | "EXPENSE";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE" | "OTHER";
export type PaymentStatus = "PAID" | "PENDING" | "PARTIAL";
export type ApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";
export type RecurrenceFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  nextDueDate: string;
  endDate?: string;
}

export interface Attachment {
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface LedgerEntryPopulated {
  _id: string;
  projectId?: {
    _id: string;
    clientName: string;
    serviceType: string;
    status: ProjectStatus;
  } | null;
  customerId?: {
    _id: string;
    name: string;
    phone: string;
  } | null;
  entryType: EntryType;
  category: string;
  amount: number;
  description: string;
  entryDate: string;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  invoiceRef?: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentEntryId?: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface LedgerListResponse {
  success: boolean;
  data: LedgerEntryPopulated[];
  count: number;
}

export interface LedgerDetailResponse {
  success: boolean;
  data: LedgerEntryPopulated;
}

export interface LedgerListQuery {
  startDate?: string;
  endDate?: string;
  entryType?: EntryType;
  projectId?: string;
  customerId?: string;
  category?: string;
  paymentStatus?: PaymentStatus;
  approvalStatus?: ApprovalStatus;
}

export interface CreateLedgerPayload {
  entryType: EntryType;
  category: string;
  amount: number;
  description: string;
  entryDate: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  projectId?: string;
  customerId?: string;
  invoiceRef?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  attachments?: { fileName: string; fileUrl: string }[];
}

export interface MutationResponse {
  success: boolean;
  message?: string;
  data?: LedgerEntryPopulated;
  error?: string;
}

export interface LedgerCategory {
  value: string;
  label: string;
  entryType: EntryType;
  description?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}

export interface LedgerCategoriesResponse {
  success: boolean;
  count: number;
  data: LedgerCategory[];
}

export interface CategorySummary {
  _id: { entryType: EntryType; category: string };
  total: number;
  count: number;
}

export interface ProjectSummary {
  _id: { projectId: string; entryType: EntryType };
  total: number;
  count: number;
  project: {
    _id: string;
    clientName: string;
    serviceType: string;
  };
}

export interface ProfitLossSummary {
  totalIncome: number;
  totalExpense: number;
  netProfitLoss: number;
}

export interface LedgerSummaryResponse {
  success: boolean;
  data: {
    byCategory: CategorySummary[];
    byProject: ProjectSummary[];
    profitLoss: ProfitLossSummary;
  };
}

/* ────────────────────────────────────────────
   API Functions
   ──────────────────────────────────────────── */

export async function fetchLedgerEntries(
  params: LedgerListQuery = {}
): Promise<LedgerListResponse> {
  const { data } = await api.get<LedgerListResponse>("/ledger", { params });
  return data;
}

export async function fetchLedgerEntry(id: string): Promise<LedgerEntryPopulated> {
  const { data } = await api.get<LedgerDetailResponse>(`/ledger/${id}`);
  return data.data;
}

export async function createLedgerEntry(
  payload: CreateLedgerPayload
): Promise<MutationResponse> {
  const { data } = await api.post<MutationResponse>("/ledger", payload);
  return data;
}

export async function updateLedgerEntry(
  id: string,
  payload: Partial<CreateLedgerPayload>
): Promise<MutationResponse> {
  const { data } = await api.put<MutationResponse>(`/ledger/${id}`, payload);
  return data;
}

export async function deleteLedgerEntry(id: string): Promise<MutationResponse> {
  const { data } = await api.delete<MutationResponse>(`/ledger/${id}`);
  return data;
}

export async function approveLedgerEntry(id: string): Promise<MutationResponse> {
  const { data } = await api.patch<MutationResponse>(`/ledger/${id}/approve`);
  return data;
}

export async function rejectLedgerEntry(
  id: string,
  reason: string
): Promise<MutationResponse> {
  const { data } = await api.patch<MutationResponse>(`/ledger/${id}/reject`, {
    reason,
  });
  return data;
}

export async function fetchLedgerSummary(
  params: LedgerListQuery = {}
): Promise<LedgerSummaryResponse> {
  const { data } = await api.get<LedgerSummaryResponse>("/ledger/summary", {
    params,
  });
  return data;
}

export async function fetchLedgerCategories(
  entryType?: EntryType
): Promise<LedgerCategoriesResponse> {
  const { data } = await api.get<LedgerCategoriesResponse>(
    "/ledger/categories",
    { params: entryType ? { entryType } : undefined }
  );
  return data;
}

export async function generateRecurringEntries(): Promise<{
  success: boolean;
  message: string;
  data: LedgerEntryPopulated[];
  count: number;
}> {
  const { data } = await api.post("/ledger/recurring/generate");
  return data;
}
