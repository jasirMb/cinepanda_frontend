"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProjects,
  fetchProject,
  type ProjectsListQuery,
  type ProjectsListResponse,
  type ProjectPopulated,
} from "@/lib/api/projects";

export const projectsKeys = {
  all: ["projects"] as const,
  list: (params?: ProjectsListQuery) => [...projectsKeys.all, params] as const,
  detail: (id: string) => [...projectsKeys.all, id] as const,
};

export function useProjects(params?: ProjectsListQuery) {
  return useQuery<ProjectsListResponse>({
    queryKey: projectsKeys.list(params),
    queryFn: () => fetchProjects(params),
    staleTime: 60_000,
  });
}

export function useProject(id: string) {
  return useQuery<ProjectPopulated>({
    queryKey: projectsKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}
