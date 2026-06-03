import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

/** A product item's `productId` comes back populated from the API (full product) but
 *  is sent back as a plain id string on save. */
export interface PopulatedProduct {
  _id: string;
  name?: string;
  imageUrl?: string;
  price?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
}

export interface TemplateProductItem {
  productId: string | PopulatedProduct | null;
  productName: string;
  category: string;
  subcategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Extract the plain id from a (possibly populated) productId field. */
export function productItemId(productId: string | PopulatedProduct | null): string {
  if (!productId) return "";
  return typeof productId === "string" ? productId : productId._id;
}

/** Extract the product image (only present when productId is populated). */
export function productItemImage(
  productId: string | PopulatedProduct | null
): string | undefined {
  return productId && typeof productId === "object" ? productId.imageUrl : undefined;
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

export interface TemplateQuotationUsage {
  total: number;
  approved: number;
  /** True when an approved quotation OR a project uses this template → edit/delete blocked. */
  locked: boolean;
  /** Why it's locked — 'project' takes priority over 'quotation' in messaging. */
  lockReason: "project" | "quotation" | null;
  quotations: {
    _id: string;
    status: string;
    customerName: string | null;
    quotationDate: string | null;
  }[];
  projects: {
    _id: string;
    clientName: string;
    serviceType: string;
    status: string;
  }[];
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
  /** Present on the detail endpoint only. */
  quotationUsage?: TemplateQuotationUsage;
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
