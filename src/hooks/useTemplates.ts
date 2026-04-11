"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchTemplates,
  fetchTemplate,
  type TemplatesListResponse,
  type Template,
} from "@/lib/api/templates";

export const templatesKeys = {
  all: ["templates"] as const,
  list: () => [...templatesKeys.all, "list"] as const,
  detail: (id: string) => [...templatesKeys.all, id] as const,
};

export function useTemplates() {
  return useQuery<TemplatesListResponse>({
    queryKey: templatesKeys.list(),
    queryFn: fetchTemplates,
    staleTime: 60_000,
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
