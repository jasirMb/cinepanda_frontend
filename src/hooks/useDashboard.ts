"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProjectsOverview,
  type ProjectsOverviewResponse,
} from "@/lib/api/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  projectsOverview: () => [...dashboardKeys.all, "projects-overview"] as const,
};

export function useProjectsOverview() {
  return useQuery<ProjectsOverviewResponse>({
    queryKey: dashboardKeys.projectsOverview(),
    queryFn: fetchProjectsOverview,
    staleTime: 60_000,
  });
}
