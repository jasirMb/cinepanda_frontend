import api from "@/lib/axios-client";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

export interface ProjectsOverview {
  totalProjects: number;
  planningProjects: number;
  ongoingProjects: number;
  onHoldProjects: number;
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

/** One month in the cumulative company-growth series (values are running totals). */
export interface GrowthPoint {
  month: string; // e.g. "Jun 26"
  revenue: number; // cumulative income collected
  projectValue: number; // cumulative value of projects started
  customers: number; // cumulative customers acquired
  projects: number; // cumulative projects started
}

export interface GrowthResponse {
  success: boolean;
  data: { series: GrowthPoint[] };
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

export async function fetchGrowth(): Promise<GrowthResponse> {
  const { data } = await api.get<GrowthResponse>("/dashboard/growth");
  return data;
}
