"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { downloadHtmlToPdf, type Quotation } from "@/lib/api/quotations";
import QuotationPdfDocument from "@/components/quotation/QuotationPdfDocument";

/**
 * Render the Figma-style proposal document for a quotation and download
 * the resulting PDF (via the backend Puppeteer endpoint).
 *
 * Filename format: "Proposal for {customerName}.pdf"
 */
export async function downloadProposalPdf(quotation: Quotation): Promise<void> {
  const body = renderComponentToHtml(
    createElement(QuotationPdfDocument, { quotation })
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Proposal for ${escapeHtml(quotation.customerId.name)}</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>${body}</body>
</html>`;

  const filename = buildProposalFilename(quotation.customerId.name);
  await downloadHtmlToPdf(html, filename);
}

export function buildProposalFilename(customerName: string): string {
  const safe = customerName.replace(/[\\/:*?"<>|]/g, "").trim() || "Customer";
  return `Proposal for ${safe}.pdf`;
}

/**
 * Render a React element to an HTML string by mounting it to a hidden
 * detached container in the DOM. Avoids `react-dom/server` (which Next.js
 * bundlers don't always resolve correctly in client code).
 */
function renderComponentToHtml(element: React.ReactElement): string {
  if (typeof document === "undefined") {
    throw new Error("renderComponentToHtml must run in the browser");
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.style.pointerEvents = "none";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    flushSync(() => {
      root.render(element);
    });
    return container.innerHTML;
  } finally {
    root.unmount();
    container.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
