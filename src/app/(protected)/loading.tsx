import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for every page under (protected).
 *
 * Next.js shows this instantly when navigating to any protected route while the
 * destination segment loads, instead of freezing on the previous page until the
 * server responds. The sidebar/topbar stay put (this only fills the <main> area),
 * so navigation feels responsive on desktop and mobile alike.
 */
export default function ProtectedLoading() {
  return (
    <div className="space-y-4">
      {/* Page header (title + subtitle + primary action) */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Filter / search bar */}
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />

      {/* List / card rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
