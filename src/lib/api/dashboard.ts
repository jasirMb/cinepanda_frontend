import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface ProjectsOverview {
  totalProjects: number;
  planningProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  totalProjectValue: number;
  totalIncome: number;
  totalExpense: number;
  totalPending: number;
  netProfit: number;
}

export interface ProjectsOverviewResponse {
  success: boolean;
  data: ProjectsOverview;
}

/* ────────────────────────────────────────────
   API Functions
   ──────────────────────────────────────────── */

export async function fetchProjectsOverview(): Promise<ProjectsOverviewResponse> {
  const { data } = await api.get<ProjectsOverviewResponse>(
    "/dashboard/projects-overview"
  );
  return data;
}
