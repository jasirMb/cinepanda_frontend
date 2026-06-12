import api from "@/lib/axios-client";

export const PAYMENT_ACCOUNT_TYPES = ["BANK", "CASH", "UPI", "CARD", "OTHER"] as const;
export type PaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number];

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
