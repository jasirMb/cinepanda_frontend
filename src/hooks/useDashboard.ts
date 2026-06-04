"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProjectsOverview,
  fetchGrowth,
  type ProjectsOverviewResponse,
  type GrowthResponse,
} from "@/lib/api/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  projectsOverview: () => [...dashboardKeys.all, "projects-overview"] as const,
  growth: () => [...dashboardKeys.all, "growth"] as const,
};

export function useProjectsOverview() {
  return useQuery<ProjectsOverviewResponse>({
    queryKey: dashboardKeys.projectsOverview(),
    queryFn: fetchProjectsOverview,
    staleTime: 60_000,
  });
}

export function useGrowth() {
  return useQuery<GrowthResponse>({
    queryKey: dashboardKeys.growth(),
    queryFn: fetchGrowth,
    staleTime: 60_000,
  });
}
