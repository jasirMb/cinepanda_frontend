/**
 * Standard app-wide date display — matches the ledger ("23 Jun 2026").
 * Accepts an ISO string or YYYY-MM-DD.
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
