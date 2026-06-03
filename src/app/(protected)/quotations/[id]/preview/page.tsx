"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useQuotation } from "@/hooks/useQuotations";
import QuotationPdfDocument from "@/components/quotation/QuotationPdfDocument";
import { downloadProposalPdf } from "@/lib/quotation-pdf";
import { Button } from "@/components/ui/button";

export default function QuotationPreviewPage() {
  const params = useParams();
  const quotationId = params.id as string;
  const quotationQuery = useQuotation(quotationId);
  const quotation = quotationQuery.data;

  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!quotation) return;
    setDownloading(true);
    try {
      await downloadProposalPdf(quotation);
    } catch (err) {
      console.error("Download proposal PDF failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  }

  if (quotationQuery.isLoading) {
    return (
      <p className="text-slate-700 dark:text-slate-300">
        Loading quotation preview...
      </p>
    );
  }

  if (quotationQuery.isError || !quotation) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">Failed to load quotation.</p>
        <Button variant="outline" asChild>
          <Link href="/quotations">Back to quotations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/quotations/${quotationId}`}>Back to details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/quotations">All quotations</Link>
          </Button>
        </div>
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Preview — the exact document that gets exported as the PDF */}
      <div className="overflow-x-auto">
        <div className="mx-auto w-fit rounded-lg bg-white shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
          <QuotationPdfDocument quotation={quotation} />
        </div>
      </div>
    </div>
  );
}
