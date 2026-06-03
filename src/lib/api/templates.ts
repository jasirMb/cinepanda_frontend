import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface TemplateProductItem {
  productId: string;
  productName: string;
  category: string;
  subcategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface TemplateManualItem {
  name: string;
  description?: string;
  type: "service" | "tax" | "discount" | "other";
  amount: number;
  isPercentage: boolean;
}

export interface TemplateGroup {
  name: string;
  productItems: TemplateProductItem[];
  manualItems: TemplateManualItem[];
  subtotal: number;
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  groups: TemplateGroup[];
  manualItems: TemplateManualItem[];
  grandTotal: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesListResponse {
  success: boolean;
  data: Template[];
  count: number;
}

export interface TemplateResponse {
  success: boolean;
  data?: Template;
  message?: string;
  error?: string;
}

export interface SuggestPayload {
  category: string;
  subcategory?: string;
  limit?: number;
}

export interface SuggestResponse {
  success: boolean;
  count: number;
  data: {
    _id: string;
    name: string;
    description?: string;
    category: string;
    subcategory: string;
    brand?: string;
    productModel?: string;
    price: number;
    unit: string;
    imageUrl?: string;
  }[];
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  groups: {
    name: string;
    productItems: {
      productId: string;
      productName: string;
      category: string;
      subcategory: string;
      quantity: number;
      unitPrice: number;
    }[];
    manualItems: TemplateManualItem[];
  }[];
  manualItems?: TemplateManualItem[];
}

/* ────────────────────────────────────────────
   Templates API
   ──────────────────────────────────────────── */

export async function fetchTemplates(): Promise<TemplatesListResponse> {
  const { data } = await api.get<TemplatesListResponse>("/templates");
  return data;
}

export async function fetchTemplate(id: string): Promise<Template> {
  const { data } = await api.get<{ success: boolean; data: Template }>(
    `/templates/${id}`
  );
  return data.data;
}

export async function createTemplate(
  payload: CreateTemplatePayload
): Promise<TemplateResponse> {
  const { data } = await api.post<TemplateResponse>("/templates", payload);
  return data;
}

export async function updateTemplate(
  id: string,
  payload: CreateTemplatePayload
): Promise<TemplateResponse> {
  const { data } = await api.put<TemplateResponse>(`/templates/${id}`, payload);
  return data;
}

export async function deleteTemplate(id: string): Promise<TemplateResponse> {
  const { data } = await api.delete<TemplateResponse>(`/templates/${id}`);
  return data;
}

export async function suggestProducts(
  payload: SuggestPayload
): Promise<SuggestResponse> {
  const { data } = await api.post<SuggestResponse>(
    "/templates/suggest",
    payload
  );
  return data;
}
