import api from "@/lib/axios-client";

export const PAYMENT_ACCOUNT_TYPES = ["BANK", "CASH", "UPI", "CARD", "OTHER"] as const;
export type PaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number];

export const CARD_TYPES = ["CREDIT", "DEBIT"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const UPI_APPS = [
  "GPay",
  "PhonePe",
  "Paytm",
  "BHIM",
  "Amazon Pay",
  "Other",
] as const;

export interface PaymentAccount {
  _id: string;
  name: string;
  type: PaymentAccountType;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
  upiApp?: string;
  cardNetwork?: string;
  cardLast4?: string;
  /** For a CARD: CREDIT or DEBIT. */
  cardType?: CardType | null;
  /** Sanctioned credit limit — only for a credit card. */
  creditLimit?: number | null;
  /** For a UPI linked to a bank: the bank account id it draws from. */
  linkedAccountId?: string | null;
  /** Computed on the list endpoint: the linked bank's name. */
  linkedAccountName?: string | null;
  notes?: string;
  /** Money already in the account when you started tracking. */
  openingBalance?: number;
  /** Computed on the list endpoint: openingBalance + moneyIn − moneyOut. */
  balance?: number;
  moneyIn?: number;
  moneyOut?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAccountsListResponse {
  success: boolean;
  data: PaymentAccount[];
  count: number;
}

export interface PaymentAccountPayload {
  name: string;
  type: PaymentAccountType;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
  upiApp?: string;
  cardNetwork?: string;
  cardLast4?: string;
  /** For a CARD: CREDIT or DEBIT. */
  cardType?: CardType | null;
  /** Sanctioned credit limit — only for a credit card. */
  creditLimit?: number | null;
  linkedAccountId?: string | null;
  notes?: string;
  openingBalance?: number;
}

export async function fetchPaymentAccounts(): Promise<PaymentAccountsListResponse> {
  const { data } = await api.get<PaymentAccountsListResponse>("/payment-accounts");
  return data;
}

export async function fetchPaymentAccount(id: string): Promise<PaymentAccount> {
  const { data } = await api.get<{ success: boolean; data: PaymentAccount }>(
    `/payment-accounts/${id}`
  );
  return data.data;
}

export async function createPaymentAccount(
  payload: PaymentAccountPayload
): Promise<PaymentAccount> {
  const { data } = await api.post<{ success: boolean; data: PaymentAccount }>(
    "/payment-accounts",
    payload
  );
  return data.data;
}

export async function updatePaymentAccount(
  id: string,
  payload: Partial<PaymentAccountPayload>
): Promise<PaymentAccount> {
  const { data } = await api.put<{ success: boolean; data: PaymentAccount }>(
    `/payment-accounts/${id}`,
    payload
  );
  return data.data;
}

export async function deletePaymentAccount(id: string): Promise<void> {
  await api.delete(`/payment-accounts/${id}`);
}

// ─── Statement (paginated, with running balance computed server-side) ──────────

export interface StatementQuery {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

/** One statement row: the ledger entry + the running balance after it. */
export interface StatementRowApi {
  entry: import("./ledger").LedgerEntryPopulated;
  balance: number;
}

export interface AccountStatementResponse {
  success: boolean;
  account: PaymentAccount;
  data: StatementRowApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Current balance across all time (opening + every in/out). */
  currentBalance: number;
  openingBalance: number;
  /** Balance carried into the selected period (opening + entries before it). */
  broughtForward: number;
  /** Money in / out within the selected period (all of it, not just the page). */
  periodIn: number;
  periodOut: number;
}

export async function fetchAccountStatement(
  id: string,
  params?: StatementQuery
): Promise<AccountStatementResponse> {
  const { data } = await api.get<AccountStatementResponse>(
    `/payment-accounts/${id}/statement`,
    { params }
  );
  return data;
}
