import api from "@/lib/axios-client";

/**
 * Trash API — the unified bin for every soft-deleted entity. Backend routes
 * live at /api/trash (see cinepanda_backend/src/features/trash).
 */

// Keep in sync with the backend TRASH_REGISTRY keys.
export type TrashType =
  | "leads"
  | "quotations"
  | "products"
  | "templates"
  | "projects"
  | "customers"
  | "labours"
  | "groups"
  | "vendors"
  | "payment-accounts"
  | "ledger";

export interface TrashTypeSummary {
  key: TrashType;
  label: string;
  count: number;
}

export interface TrashSummaryResponse {
  success: boolean;
  data: { types: TrashTypeSummary[]; total: number };
}

export interface TrashItem {
  id: string;
  type: TrashType;
  title: string;
  subtitle: string;
  deletedAt: string;
}

export interface TrashItemsResponse {
  success: boolean;
  type: TrashType;
  data: TrashItem[];
}

/** Per-type counts + labels for the tab bar. */
export async function fetchTrashSummary(): Promise<TrashSummaryResponse["data"]> {
  const { data } = await api.get<TrashSummaryResponse>("/trash");
  return data.data;
}

/** Trashed items of a single type, newest first. */
export async function fetchTrashItems(type: TrashType): Promise<TrashItem[]> {
  const { data } = await api.get<TrashItemsResponse>(`/trash/${type}`);
  return data.data;
}

/** Bring a trashed item back to its list. */
export async function restoreTrashItem(type: TrashType, id: string): Promise<void> {
  await api.post(`/trash/${type}/${id}/restore`);
}

/** Permanently delete a single trashed item. */
export async function purgeTrashItem(type: TrashType, id: string): Promise<void> {
  await api.delete(`/trash/${type}/${id}`);
}

/** Permanently delete every trashed item of a type. */
export async function emptyTrash(type: TrashType): Promise<number> {
  const { data } = await api.delete<{ success: boolean; deletedCount: number }>(
    `/trash/${type}`
  );
  return data.deletedCount ?? 0;
}
