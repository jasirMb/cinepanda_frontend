import api from "@/lib/axios-client";
import type { ProjectStatus } from "./projects";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export type EntryType = "INCOME" | "EXPENSE";
/** OPERATING = real business P&L; CAPITAL = owner money in/out; TRANSFER = between own accounts. */
export type AccountingType = "OPERATING" | "CAPITAL" | "TRANSFER";

// Categories that classify an entry as non-operating (excluded from profit).
export const OWNER_CONTRIBUTION_CATEGORY = "OWNER_CONTRIBUTION";
export const OWNER_WITHDRAWAL_CATEGORY = "OWNER_WITHDRAWAL";
export const TRANSFER_IN_CATEGORY = "TRANSFER_IN";
export const TRANSFER_OUT_CATEGORY = "TRANSFER_OUT";

/**
 * Whether an entry counts toward operating profit/loss. Owner capital
 * (contributions/withdrawals) and account transfers do NOT — they only move
 * money around. Treats a missing accountingType (legacy rows) as operating.
 * Use this anywhere you sum income/expense from the raw entry list.
 */
export function isOperatingEntry(e: {
  accountingType?: AccountingType | null;
}): boolean {
  return e.accountingType !== "CAPITAL" && e.accountingType !== "TRANSFER";
}

/** Expense categories that are money lost to fees / charges / taxes (not goods or services). */
export const FEE_CATEGORIES = ["BANK_CHARGES", "TAXES"] as const;

/** True for an operating EXPENSE in a fee/charge/tax category (i.e. money lost to fees). */
export function isFeeEntry(e: {
  entryType: EntryType;
  category: string;
  accountingType?: AccountingType | null;
}): boolean {
  return (
    e.entryType === "EXPENSE" &&
    isOperatingEntry(e) &&
    (FEE_CATEGORIES as readonly string[]).includes(e.category)
  );
}
export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "UPI"
  | "CARD"
  | "CHEQUE"
  | "OTHER";
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
    /** Set when the project has been deleted (trashed) — the entry still shows its name. */
    deletedAt?: string | null;
  } | null;
  customerId?: {
    _id: string;
    name: string;
    phone: string;
  } | null;
  entryType: EntryType;
  category: string;
  /** OPERATING (counts toward profit), CAPITAL (owner money) or TRANSFER. */
  accountingType?: AccountingType;
  /** Present on transfer legs; links the OUT and IN entries. */
  transferGroupId?: string | null;
  amount: number;
  description: string;
  entryDate: string;
  paymentMethod?: PaymentMethod;
  paymentAccountId?: {
    _id: string;
    name: string;
    type: string;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    ifsc?: string;
    upiId?: string;
    upiApp?: string;
    cardNetwork?: string;
    cardLast4?: string;
  } | null;
  vendorId?: { _id: string; name: string } | null;
  itemType?: "GOODS" | "SERVICE";
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
  /** Total matching entries (across all pages). Present on every response. */
  total?: number;
  /** Current page (1-based) when pagination is active. */
  page?: number;
  /** Page size requested; 0 means "all entries returned". */
  limit?: number;
  /** Total number of pages when pagination is active. */
  totalPages?: number;
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
  vendorId?: string;
  paymentAccountId?: string;
  /** Filter by accounting type — e.g. "CAPITAL" for owner money, "TRANSFER" for transfers. */
  accountingType?: AccountingType;
  /** 1-based page number. Omit (with limit) to fetch all entries. */
  page?: number;
  /** Page size. Omit to fetch all matching entries (statements, dashboards). */
  limit?: number;
}

export interface CreateLedgerPayload {
  entryType: EntryType;
  category: string;
  amount: number;
  description: string;
  entryDate: string;
  paymentMethod?: PaymentMethod;
  paymentAccountId?: string;
  vendorId?: string;
  itemType?: "GOODS" | "SERVICE";
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
  /** Owner's own money put in (not counted as income/profit). */
  ownerContribution?: number;
  /** Owner's own money taken out for personal use (not counted as expense/loss). */
  ownerWithdrawal?: number;
}

export interface TransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  entryDate: string;
  description?: string;
  projectId?: string;
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

/** Record a money transfer between two of your own accounts (no profit impact). */
export async function createLedgerTransfer(
  payload: TransferPayload
): Promise<MutationResponse> {
  const { data } = await api.post<MutationResponse>("/ledger/transfer", payload);
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
