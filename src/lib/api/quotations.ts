import api from "@/lib/axios-client";
import { API_BASE_URL } from "@/lib/api-base";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface QuotationProductItem {
  productId?: string;
  productName: string;
  category: string;
  subcategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface QuotationManualItem {
  name: string;
  description?: string;
  type: "service" | "tax" | "discount" | "other";
  amount: number;
  isPercentage: boolean;
  resolvedAmount: number;
}

export interface QuotationGroup {
  name: string;
  productItems: QuotationProductItem[];
  manualItems: QuotationManualItem[];
  subtotal: number;
}

export interface QuotationSection {
  templateId?: string;
  sectionName: string;
  description?: string;
  groups: QuotationGroup[];
  manualItems: QuotationManualItem[];
  grandTotal: number;
}

export interface QuotationCustomer {
  _id: string;
  name: string;
  phone: string;
  place: string;
  email?: string;
}

export interface Quotation {
  _id: string;
  customerId: QuotationCustomer;
  sections: QuotationSection[];
  notes?: string;
  termsAndConditions?: string;
  quotationDate: string;
  validUntil?: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationsListResponse {
  success: boolean;
  data: Quotation[];
  count: number;
}

export interface QuotationResponse {
  success: boolean;
  data?: Quotation;
  message?: string;
  error?: string;
}

export interface CreateQuotationPayload {
  customerId: string;
  templateIds: string[];
  notes?: string;
  termsAndConditions?: string;
  quotationDate?: string;
  validUntil?: string;
}

/* ────────────────────────────────────────────
   Quotations API
   ──────────────────────────────────────────── */

export async function fetchQuotations(): Promise<QuotationsListResponse> {
  const { data } = await api.get<QuotationsListResponse>("/quotations");
  return data;
}

export async function fetchQuotation(id: string): Promise<Quotation> {
  const { data } = await api.get<{ success: boolean; data: Quotation }>(
    `/quotations/${id}`
  );
  return data.data;
}

export async function createQuotation(
  payload: CreateQuotationPayload
): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>(
    "/quotations/from-templates",
    payload
  );
  return data;
}

export async function updateQuotation(
  id: string,
  payload: Partial<Pick<Quotation, "notes" | "termsAndConditions" | "validUntil">>
): Promise<QuotationResponse> {
  const { data } = await api.put<QuotationResponse>(
    `/quotations/${id}`,
    payload
  );
  return data;
}

export async function updateQuotationStatus(
  id: string,
  status: Quotation["status"]
): Promise<QuotationResponse> {
  const { data } = await api.patch<QuotationResponse>(
    `/quotations/${id}/status`,
    { status }
  );
  return data;
}

export async function deleteQuotation(
  id: string
): Promise<QuotationResponse> {
  const { data } = await api.delete<QuotationResponse>(`/quotations/${id}`);
  return data;
}

export function getQuotationPdfUrl(id: string): string {
  // API_BASE_URL is already protocol-normalized and trailing-slash-stripped.
  return `${API_BASE_URL}/quotations/${id}/pdf`;
}

/**
 * Download the server-generated PDF (PDFKit) for a quotation.
 */
export async function downloadServerPdf(id: string): Promise<void> {
  const response = await api.get(`/quotations/${id}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quotation-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Send custom HTML to the backend, which converts it to PDF via Puppeteer.
 */
export async function downloadHtmlToPdf(
  html: string,
  filename = "quotation.pdf"
): Promise<void> {
  const response = await api.post(
    "/quotations/html-to-pdf",
    { html, filename },
    { responseType: "blob" }
  );
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
