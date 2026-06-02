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

/* ────────────────────────────────────────────
   Customer overview (everything linked to a customer)
   ──────────────────────────────────────────── */

export interface CustomerOverview {
  customer: Customer;
  leads: {
    _id: string;
    customerName: string;
    contactNumber: string;
    status: string;
    requirement?: string;
    leadSource?: string;
    priorityType?: string;
    createdAt: string;
  }[];
  quotations: {
    _id: string;
    status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
    quotationDate: string;
    projectId?: string;
    sectionCount: number;
    value: number;
  }[];
  projects: {
    _id: string;
    clientName: string;
    serviceType: string;
    projectValue: number;
    status: string;
    startDate?: string;
    expectedCompletionDate?: string;
  }[];
  totals: {
    quotedValue: number;
    projectValue: number;
    income: number;
    expense: number;
    net: number;
  };
}

export async function fetchCustomerOverview(
  id: string
): Promise<CustomerOverview> {
  const { data } = await api.get<{ success: boolean; data: CustomerOverview }>(
    `/customers/${id}/overview`
  );
  return data.data;
}
