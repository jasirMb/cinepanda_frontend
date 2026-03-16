"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/tables/LeadsTable";
import { Button } from "@/components/ui/button";

type ToastVariant = "success" | "error";

interface ToastState {
  open: boolean;
  message: string;
  variant: ToastVariant;
}

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    variant: "success"
  });

  const { data, isLoading, isError } = useLeads({ page: 1, limit: 20 });

  useEffect(() => {
    const created = searchParams.get("created");
    const error = searchParams.get("error");

    if (created === "1") {
      setToast({
        open: true,
        message: "Lead created successfully",
        variant: "success"
      });
      router.replace("/leads");
    } else if (typeof error === "string" && error.trim().length > 0) {
      setToast({
        open: true,
        message: decodeURIComponent(error),
        variant: "error"
      });
      router.replace("/leads");
    }
  }, [router, searchParams]);

  function closeToast() {
    setToast((prev) => ({ ...prev, open: false }));
  }

  if (isLoading) {
    return (
      <p className="text-slate-700 dark:text-slate-300">Loading leads...</p>
    );
  }

  if (isError) {
    return (
      <p className="text-red-400">
        Failed to load leads. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Leads
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage incoming leads from all CinePanda channels.
          </p>
        </div>
        <Button asChild>
          <Link href="/leads/new">Add lead</Link>
        </Button>
      </div>

      <LeadsTable leads={data?.data ?? []} />

      {toast.open && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-sm dark:border-slate-700">
          <div
            className={
              toast.variant === "success"
                ? "border-l-4 border-emerald-500 pl-3"
                : "border-l-4 border-red-500 pl-3"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={
                  toast.variant === "success"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400"
                }
              >
                {toast.message}
              </p>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                onClick={closeToast}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


