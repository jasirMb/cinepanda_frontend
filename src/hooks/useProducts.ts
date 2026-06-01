"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProducts,
  fetchCategories,
  fetchSubcategories,
  fetchSpecificationTemplate,
  type ProductsListQuery,
  type ProductsListResponse,
  type CategoriesResponse,
  type SpecificationTemplate
} from "@/lib/api/products";

export const productsKeys = {
  all: ["products"] as const,
  list: (params?: ProductsListQuery) => [...productsKeys.all, params] as const,
  detail: (id: string) => [...productsKeys.all, "detail", id] as const,
  categories: ["product-categories"] as const,
  subcategories: (category: string) => [...productsKeys.categories, "subs", category] as const,
  specTemplate: (subcategory: string) => [...productsKeys.categories, "specs", subcategory] as const
};

export function useProducts(params?: ProductsListQuery) {
  return useQuery<ProductsListResponse>({
    queryKey: productsKeys.list(params),
    queryFn: () => fetchProducts(params),
    staleTime: 60_000
  });
}

export function useCategories() {
  return useQuery<CategoriesResponse>({
    queryKey: productsKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60_000
  });
}

export function useSubcategories(categoryName: string) {
  return useQuery<string[]>({
    queryKey: productsKeys.subcategories(categoryName),
    queryFn: () => fetchSubcategories(categoryName),
    enabled: !!categoryName,
    staleTime: 5 * 60_000
  });
}

export function useSpecificationTemplate(subcategory: string) {
  return useQuery<SpecificationTemplate>({
    queryKey: productsKeys.specTemplate(subcategory),
    queryFn: () => fetchSpecificationTemplate(subcategory),
    enabled: !!subcategory,
    staleTime: 5 * 60_000
  });
}
