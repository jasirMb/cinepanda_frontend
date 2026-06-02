import api from "@/lib/axios-client";

export const PAYMENT_ACCOUNT_TYPES = ["BANK", "CASH", "UPI", "OTHER"] as const;
export type PaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number];

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
  notes?: string;
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
  notes?: string;
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
