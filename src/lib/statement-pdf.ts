"use client";

import { downloadHtmlToPdf } from "@/lib/api/quotations";

export interface StatementAccount {
  name: string;
  type: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}

export interface StatementRow {
  date: string; // already formatted, e.g. "01 Jun 2026"
  description: string;
  debit: number; // money out
  credit: number; // money in
  balance: number;
}

function inr(n: number): string {
  return (
    "₹" +
    (n ?? 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Embed the logo as a data URL so the (server-side Puppeteer) PDF renderer can
// load it without a network round-trip to the frontend origin.
let logoCache: string | null = null;
async function getLogoDataUrl(): Promise<string> {
  if (logoCache !== null) return logoCache;
  try {
    const res = await fetch("/cinepanda-logo.png");
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoCache;
  } catch {
    logoCache = "";
    return "";
  }
}

export async function downloadStatementPdf(opts: {
  account: StatementAccount;
  rows: StatementRow[];
  periodLabel: string;
  projectLabel?: string;
  generatedOn: string;
}): Promise<void> {
  const { account, rows, periodLabel, projectLabel, generatedOn } = opts;
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closing = rows.length ? rows[rows.length - 1].balance : 0;
  const logo = await getLogoDataUrl();

  const acctLines = [
    account.bankName ? esc(account.bankName) : "",
    account.accountNumber ? `A/C No: ${esc(account.accountNumber)}` : "",
    account.ifsc ? `IFSC: ${esc(account.ifsc)}` : "",
    account.upiId ? `UPI: ${esc(account.upiId)}` : "",
  ]
    .filter(Boolean)
    .join("<br/>");

  const rowsHtml = rows.length
    ? rows
        .map(
          (r, i) => `
        <tr class="${i % 2 ? "alt" : ""}">
          <td class="dt">${esc(r.date)}</td>
          <td class="desc">${esc(r.description)}</td>
          <td class="num debit">${r.debit ? inr(r.debit) : "—"}</td>
          <td class="num credit">${r.credit ? inr(r.credit) : "—"}</td>
          <td class="num bal">${inr(r.balance)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="empty">No transactions for the selected period.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }

  .topbar { display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, #0B1220 0%, #1B3A57 100%); color: #fff;
    border-radius: 10px; padding: 16px 20px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 42px; height: 42px; object-fit: contain;
    background: rgba(255,255,255,.1); border-radius: 8px; padding: 4px; }
  .brand .co { font-size: 16px; font-weight: 700; letter-spacing: .01em; }
  .brand .tag { font-size: 9.5px; color: #cbd5e1; letter-spacing: .12em; text-transform: uppercase; }
  .title { text-align: right; }
  .title .h { font-size: 15px; font-weight: 700; letter-spacing: .06em; }
  .title .s { font-size: 9.5px; color: #cbd5e1; margin-top: 2px; }

  .infogrid { display: flex; gap: 12px; margin: 14px 0 12px; }
  .infobox { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .infobox .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 4px; }
  .infobox .name { font-size: 13px; font-weight: 700; }
  .infobox .type { font-weight: 400; color: #64748b; }
  .infobox .lines { color: #475569; line-height: 1.6; font-size: 10.5px; }
  .infobox .kv { display: flex; justify-content: space-between; padding: 2px 0; }
  .infobox .kv span:last-child { font-weight: 600; }

  .summary { display: flex; gap: 10px; margin-bottom: 12px; }
  .scard { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; }
  .scard .l { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; }
  .scard .v { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .scard.in .v { color: #059669; }
  .scard.out .v { color: #dc2626; }

  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 7px 9px; text-align: left; vertical-align: top; }
  thead th { background: #0f172a; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; }
  thead th:first-child { border-top-left-radius: 6px; }
  thead th:last-child { border-top-right-radius: 6px; }
  tbody td { border-bottom: 1px solid #eef2f7; }
  tbody tr.alt td { background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .dt { white-space: nowrap; color: #475569; }
  .debit { color: #dc2626; }
  .credit { color: #059669; }
  .bal { font-weight: 700; }
  tr.opening td { font-style: italic; color: #64748b; background: #f1f5f9; }
  tfoot td { border-top: 2px solid #0f172a; font-weight: 700; background: #f1f5f9; }
  .empty { text-align: center; color: #94a3b8; padding: 26px; }
  .foot { margin-top: 16px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
</style></head>
<body>
  <div class="topbar">
    <div class="brand">
      ${logo ? `<img src="${logo}" alt="" />` : ""}
      <div>
        <div class="co">CinePanda Entertainments</div>
        <div class="tag">Admin Console</div>
      </div>
    </div>
    <div class="title">
      <div class="h">ACCOUNT STATEMENT</div>
      <div class="s">${esc(periodLabel)}</div>
    </div>
  </div>

  <div class="infogrid">
    <div class="infobox">
      <div class="lbl">Account</div>
      <div class="name">${esc(account.name)} <span class="type">(${esc(account.type)})</span></div>
      <div class="lines">${acctLines || "—"}</div>
    </div>
    <div class="infobox">
      <div class="lbl">Statement details</div>
      <div class="lines">
        <div class="kv"><span>Period</span><span>${esc(periodLabel)}</span></div>
        ${projectLabel ? `<div class="kv"><span>Project</span><span>${esc(projectLabel)}</span></div>` : `<div class="kv"><span>Project</span><span>All</span></div>`}
        <div class="kv"><span>Transactions</span><span>${rows.length}</span></div>
        <div class="kv"><span>Generated</span><span>${esc(generatedOn)}</span></div>
      </div>
    </div>
  </div>

  <div class="summary">
    <div class="scard in"><div class="l">Total Credits (in)</div><div class="v">${inr(totalCredit)}</div></div>
    <div class="scard out"><div class="l">Total Debits (out)</div><div class="v">${inr(totalDebit)}</div></div>
    <div class="scard"><div class="l">Closing Balance</div><div class="v">${inr(closing)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Description</th>
        <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
      </tr>
    </thead>
    <tbody>
      <tr class="opening"><td></td><td>Opening balance</td><td class="num">—</td><td class="num">—</td><td class="num">${inr(0)}</td></tr>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td></td><td>Totals</td>
        <td class="num debit">${inr(totalDebit)}</td>
        <td class="num credit">${inr(totalCredit)}</td>
        <td class="num">${inr(closing)}</td>
      </tr>
    </tfoot>
  </table>

  <p class="foot">System-generated statement · CinePanda Entertainments · Opening balance taken as zero for the selected period.</p>
</body></html>`;

  const filename =
    `Statement - ${account.name}.pdf`.replace(/[\\/:*?"<>|]/g, "") || "Statement.pdf";
  await downloadHtmlToPdf(html, filename);
}
