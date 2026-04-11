/**
 * Frontend PDF generation utility.
 * Wraps html2pdf.js — kept separate so it can be swapped
 * for a backend-based solution later.
 */

export interface GeneratePdfOptions {
  /** HTML element to convert */
  element: HTMLElement;
  /** Downloaded file name (without .pdf) */
  filename?: string;
}

export async function generatePdf({
  element,
  filename = "quotation",
}: GeneratePdfOptions): Promise<void> {
  // Dynamic import so html2pdf is only loaded client-side
  const html2pdf = (await import("html2pdf.js")).default;

  const opt = {
    margin: [10, 10, 10, 10], // mm: top, left, bottom, right
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  await html2pdf().set(opt).from(element).save();
}
