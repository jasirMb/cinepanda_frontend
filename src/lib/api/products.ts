import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface Product {
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
  imageKey?: string;
  specifications: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  isActive?: string;
}

export interface ProductsListResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    search: string | null;
    category: string | null;
    subcategory: string | null;
    brand: string | null;
    isActive: string | null;
  };
}

export interface ProductCategory {
  _id: string;
  name: string;
  subcategories: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: ProductCategory[];
  count: number;
}

export interface SpecificationField {
  label: string;
  type: "string" | "number" | "boolean" | "select";
  unit?: string;
  options?: string[];
  required?: boolean;
}

export interface SpecificationTemplate {
  [key: string]: SpecificationField;
}

export interface SpecTemplateResponse {
  success: boolean;
  subcategory: string;
  data: SpecificationTemplate;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  category: string;
  subcategory: string;
  brand?: string;
  productModel?: string;
  price: number;
  unit: string;
  imageUrl?: string;
  imageKey?: string;
  specifications?: Record<string, any>;
}

export interface ProductResponse {
  success: boolean;
  data?: Product;
  message?: string;
  error?: string;
}

/* ────────────────────────────────────────────
   Products API
   ──────────────────────────────────────────── */

export async function fetchProducts(
  params: ProductsListQuery = {}
): Promise<ProductsListResponse> {
  const { data } = await api.get<ProductsListResponse>("/products", { params });
  return data;
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await api.get<{ success: boolean; data: Product }>(`/products/${id}`);
  return data.data;
}

export async function createProduct(
  payload: CreateProductPayload
): Promise<ProductResponse> {
  const { data } = await api.post<ProductResponse>("/products", payload);
  return data;
}

export async function updateProduct(
  id: string,
  payload: CreateProductPayload
): Promise<ProductResponse> {
  const { data } = await api.put<ProductResponse>(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<ProductResponse> {
  const { data } = await api.delete<ProductResponse>(`/products/${id}`);
  return data;
}

/* ────────────────────────────────────────────
   Categories API
   ──────────────────────────────────────────── */

export async function fetchCategories(): Promise<CategoriesResponse> {
  const { data } = await api.get<CategoriesResponse>("/product-categories/list");
  return data;
}

/** Distinct brand values across products (for the brand filter autocomplete). */
export async function fetchProductBrands(): Promise<string[]> {
  const { data } = await api.get<{ success: boolean; data: string[] }>(
    "/products/brands"
  );
  return data.data;
}

export async function fetchSubcategories(categoryName: string): Promise<string[]> {
  const { data } = await api.get<{ success: boolean; data: string[] }>(
    `/product-categories/${encodeURIComponent(categoryName)}/subcategories`
  );
  return data.data;
}

export async function fetchSpecificationTemplate(
  subcategory: string
): Promise<SpecificationTemplate> {
  const { data } = await api.get<SpecTemplateResponse>(
    "/product-categories/specifications",
    { params: { subcategory } }
  );
  return data.data;
}
