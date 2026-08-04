"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchTemplates,
  fetchTemplate,
  type TemplatesListQuery,
  type TemplatesListResponse,
  type Template,
} from "@/lib/api/templates";

export const templatesKeys = {
  all: ["templates"] as const,
  list: (params?: TemplatesListQuery) =>
    [...templatesKeys.all, "list", params] as const,
  detail: (id: string) => [...templatesKeys.all, id] as const,
};

export function useTemplates(params?: TemplatesListQuery) {
  return useQuery<TemplatesListResponse>({
    queryKey: templatesKeys.list(params),
    queryFn: () => fetchTemplates(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useTemplate(id: string) {
  return useQuery<Template>({
    queryKey: templatesKeys.detail(id),
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}
