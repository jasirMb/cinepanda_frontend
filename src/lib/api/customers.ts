import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  place: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersListResponse {
  success: boolean;
  data: Customer[];
  count: number;
}

/* ────────────────────────────────────────────
   Customers API
   ──────────────────────────────────────────── */

export async function fetchCustomers(): Promise<CustomersListResponse> {
  const { data } = await api.get<CustomersListResponse>("/customers");
  return data;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  place: string;
}

export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<Customer> {
  const { data } = await api.post<{ success: boolean; data: Customer }>(
    "/customers",
    payload
  );
  return data.data;
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data } = await api.get<{ success: boolean; data: Customer }>(
    `/customers/${id}`
  );
  return data.data;
}
