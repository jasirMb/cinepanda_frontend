import api from "@/lib/axios-client";

export interface Vendor {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorsListResponse {
  success: boolean;
  data: Vendor[];
  count: number;
}

export interface VendorPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  notes?: string;
}

export async function fetchVendors(): Promise<VendorsListResponse> {
  const { data } = await api.get<VendorsListResponse>("/vendors");
  return data;
}

export async function createVendor(payload: VendorPayload): Promise<Vendor> {
  const { data } = await api.post<{ success: boolean; data: Vendor }>(
    "/vendors",
    payload
  );
  return data.data;
}

export async function updateVendor(
  id: string,
  payload: Partial<VendorPayload>
): Promise<Vendor> {
  const { data } = await api.put<{ success: boolean; data: Vendor }>(
    `/vendors/${id}`,
    payload
  );
  return data.data;
}

export async function deleteVendor(id: string): Promise<void> {
  await api.delete(`/vendors/${id}`);
}
