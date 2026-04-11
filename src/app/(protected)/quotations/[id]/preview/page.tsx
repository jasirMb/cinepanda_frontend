"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuotation } from "@/hooks/useQuotations";
import { QuotationPreview } from "@/components/quotation/QuotationPreview";
import { generatePdf } from "@/lib/generate-pdf";
import { Button } from "@/components/ui/button";

export default function QuotationPreviewPage() {
  const params = useParams();
  const quotationId = params.id as string;
  const quotationQuery = useQuotation(quotationId);
  const quotation = quotationQuery.data;

  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!previewRef.current || !quotation) return;
    setDownloading(true);
    try {
      const customerName = quotation.customerId.name
        .replace(/\s+/g, "-")
        .toLowerCase();
      const idSuffix = quotation._id.slice(-6);
      await generatePdf({
        element: previewRef.current,
        filename: `CinePanda-Quotation-${customerName}-${idSuffix}`,
      });
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

      {/* Preview container with paper-like styling */}
      <div className="mx-auto max-w-[850px] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700">
        <QuotationPreview ref={previewRef} quotation={quotation} />
      </div>
    </div>
  );
}
