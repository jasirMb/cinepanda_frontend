"use client";

import type {
  Quotation,
  QuotationProductItem,
  QuotationManualItem,
  QuotationSection,
} from "@/lib/api/quotations";
import { CINEPANDA_LOGO_DATA_URI } from "./cinepanda-logo-base64";

/* ────────────────────────────────────────────
   Hardcoded constants (per product spec)
   ──────────────────────────────────────────── */

const SIGNATURE = {
  name: "Jayasagar DS",
  title: "Sales & Marketing",
  mobile: "9287777377",
};

const FOOTER_TEXT =
  "Teepeyem Enclave, 2nd Floor, Opp. Gokul Oottupura, KK Road Kadavantra, Cochin - 682020";
const FOOTER_PHONES = "Mob : 9287777377 / 9745077377";
const FOOTER_EMAIL = "sales@cinepanda.in";
const FOOTER_WEB = "www.cinepanda.in";

const INTRO_PARAGRAPH =
  "e take this opportunity to thanks you for your interests in our products and services, Based on the discussion with you, we hereby suggesting following video package for your home theatre room.";

// Placeholder URL for the per-package configuration diagram (e.g. 7.1.2 Atmos)
// Will be replaced with a real URL later, possibly per section/template.
const CONFIG_DIAGRAM_PLACEHOLDER_URL = "";

// Placeholder image used when a product has no image.
const PRODUCT_IMAGE_PLACEHOLDER = "";

const TERMS_DEFAULT: string[] = [
  "All material are inclusive taxes.",
  "On order confirmation 50% of payment should be made in advance, 40% on delivery of materials And remaining 10% on competition.",
  "Transportation charges are extra.",
  "Image shown in the quote are for reference only, Original product may vary.",
  "Equipment warranties as set forth by the manufactures to their products.",
  "This quote is valid for 15 days only.",
];

/* ────────────────────────────────────────────
   Category → table-layout buckets
   ──────────────────────────────────────────── */

type LayoutBucket = "sqft" | "installation" | "equipment";

function bucketForCategory(category: string): LayoutBucket {
  const c = (category || "").toLowerCase();
  if (c.includes("acoustic") || c.includes("theater construction")) return "sqft";
  if (c.includes("cabling") || c.includes("miscellaneous")) return "installation";
  return "equipment";
}

/* ────────────────────────────────────────────
   Optional fields on productItems (forward-compat)
   The current QuotationProductItem doesn't have these yet, but the
   backend/template may add them in the future. We read them defensively.
   ──────────────────────────────────────────── */

type ExtendedProductItem = QuotationProductItem & {
  image?: string;
  imageUrl?: string;
  specifications?: string;
  description?: string;
  unit?: string;
};

/** The populated product (from the detail endpoint), if productId was populated. */
function populatedProduct(item: ExtendedProductItem) {
  return item.productId && typeof item.productId === "object"
    ? item.productId
    : undefined;
}

function getImage(item: ExtendedProductItem): string {
  return (
    item.image ||
    item.imageUrl ||
    populatedProduct(item)?.imageUrl ||
    PRODUCT_IMAGE_PLACEHOLDER
  );
}

function getSpecifications(item: ExtendedProductItem): string {
  if (item.specifications) return item.specifications;
  const specs = populatedProduct(item)?.specifications;
  if (specs && typeof specs === "object") {
    const text = Object.entries(specs)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (text) return text;
  }
  return item.description || "";
}

function getUnit(item: ExtendedProductItem, bucket: LayoutBucket): string {
  if (item.unit) return item.unit;
  if (bucket === "sqft") return "SqFt";
  return "Nos";
}

/* ────────────────────────────────────────────
   Money formatting (Indian, no symbol — figma shows raw "10,15,799.00")
   ──────────────────────────────────────────── */

function fmtAmount(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function quotationNumber(q: Quotation): string {
  // No backend numbering scheme yet — derive from _id suffix.
  return `CP-Qtn: ${q._id.slice(-8).toUpperCase()}`;
}

/* ────────────────────────────────────────────
   Per-section calculations
   ──────────────────────────────────────────── */

function sectionEstimated(section: QuotationSection): number {
  let total = 0;
  for (const g of section.groups ?? []) {
    for (const p of g.productItems ?? []) total += p.lineTotal;
    for (const m of g.manualItems ?? []) {
      if (m.type !== "discount") total += Math.abs(m.resolvedAmount);
    }
  }
  for (const m of section.manualItems ?? []) {
    if (m.type !== "discount") total += Math.abs(m.resolvedAmount);
  }
  return total;
}

function sectionOffer(section: QuotationSection): number {
  return section.grandTotal;
}

/** Full price breakdown for a section: products subtotal, each adjustment
 *  (discount −, tax/service/other +), and the grand total. */
function sectionBreakdown(section: QuotationSection) {
  let subtotal = 0;
  const adjustments: { label: string; amount: number; isDiscount: boolean }[] = [];
  const add = (m: QuotationManualItem) =>
    adjustments.push({
      label: `${m.name}${m.isPercentage ? ` (${m.amount}%)` : ""}`,
      amount: Math.abs(m.resolvedAmount),
      isDiscount: m.type === "discount",
    });
  for (const g of section.groups ?? []) {
    for (const p of g.productItems ?? []) subtotal += p.lineTotal;
    for (const m of g.manualItems ?? []) add(m);
  }
  for (const m of section.manualItems ?? []) add(m);

  // Reconcile: if the listed lines don't add up to the grand total (e.g. older
  // quotations whose snapshot didn't store adjustments), show the difference
  // as a single "GST & taxes" line so the breakdown always balances.
  const adjSum = adjustments.reduce(
    (s, a) => s + (a.isDiscount ? -a.amount : a.amount),
    0
  );
  const diff = Math.round(section.grandTotal) - Math.round(subtotal + adjSum);
  if (Math.abs(diff) >= 1) {
    adjustments.push({
      label: "GST & taxes",
      amount: Math.abs(diff),
      isDiscount: diff < 0,
    });
  }

  return { subtotal, adjustments, grandTotal: section.grandTotal };
}

/* ────────────────────────────────────────────
   Inline styles (Puppeteer-friendly — no external CSS)
   ──────────────────────────────────────────── */

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  padding: "20mm 20mm 30mm 20mm",
  background: "#fff",
  position: "relative",
  boxSizing: "border-box",
  fontFamily: "Calibri, Arial, sans-serif",
  color: "#000",
  fontSize: "14px",
  lineHeight: 1.5,
  overflow: "hidden",
  pageBreakAfter: "always",
};

const lastPageStyle: React.CSSProperties = { ...pageStyle, pageBreakAfter: "auto" };

const watermarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" opacity="0.06">
  <circle cx="200" cy="280" r="160" fill="none" stroke="%23333" stroke-width="8"/>
  <circle cx="200" cy="280" r="140" fill="none" stroke="%23333" stroke-width="3"/>
  <circle cx="200" cy="280" r="30" fill="%23333"/>
  <circle cx="200" cy="170" r="25" fill="%23333"/>
  <circle cx="295" cy="225" r="25" fill="%23333"/>
  <circle cx="295" cy="335" r="25" fill="%23333"/>
  <circle cx="200" cy="390" r="25" fill="%23333"/>
  <circle cx="105" cy="335" r="25" fill="%23333"/>
  <circle cx="105" cy="225" r="25" fill="%23333"/>
  <ellipse cx="200" cy="100" rx="70" ry="60" fill="%23333"/>
  <circle cx="145" cy="55" r="28" fill="%23333"/>
  <circle cx="255" cy="55" r="28" fill="%23333"/>
  <ellipse cx="175" cy="95" rx="22" ry="18" fill="%23555"/>
  <ellipse cx="225" cy="95" rx="22" ry="18" fill="%23555"/>
  <circle cx="178" cy="93" r="8" fill="white"/>
  <circle cx="222" cy="93" r="8" fill="white"/>
  <ellipse cx="200" cy="115" rx="10" ry="7" fill="%23555"/>
</svg>
`;
const watermarkDataUri = `url("data:image/svg+xml,${encodeURIComponent(
  watermarkSvg.replace(/\n/g, "")
)}")`;

// Watermark removed for a cleaner, more professional look.
const watermarkStyle: React.CSSProperties = { display: "none" };
void watermarkDataUri;

const contentStyle: React.CSSProperties = { position: "relative", zIndex: 1 };

// ── Premium navy + gold palette ──
const BRAND = "#1f3a5f"; // navy
const BRAND_DARK = "#13243c"; // deep navy
const GOLD = "#b0883c"; // gold accent
const BRAND_TINT = "#f2f5f9";
const ROW_ALT = "#f8fafc";
const BORDER = "#dde3ec";

const tableHeaderStyle: React.CSSProperties = {
  background: BRAND,
  color: "#fff",
  fontWeight: "bold",
  padding: "9px 10px",
  border: `1px solid ${BRAND}`,
  textAlign: "center",
  fontSize: "12px",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: `1px solid ${BORDER}`,
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "13px",
};

/** Zebra-stripe background for item rows. */
function rowStyle(i: number): React.CSSProperties {
  return { background: i % 2 === 1 ? ROW_ALT : "#fff" };
}

/** A branded total row (light-brand label cell + dark-brand amount cell). */
const totalLabelStyle: React.CSSProperties = {
  ...tdStyle,
  background: BRAND_TINT,
  fontWeight: "bold",
  textAlign: "right",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: BRAND_DARK,
};
const totalAmountStyle: React.CSSProperties = {
  ...tdStyle,
  background: BRAND,
  color: "#fff",
  fontWeight: "bold",
  textAlign: "right",
};

/* ────────────────────────────────────────────
   Shared chrome
   ──────────────────────────────────────────── */

function Footer() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          padding: "4px 15px",
          fontSize: "11px",
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span style={{ color: "#5b7ec2", fontSize: "13px" }}>📍</span>
        <span>
          {FOOTER_TEXT} &nbsp;&nbsp; {FOOTER_PHONES} &nbsp;&nbsp; {FOOTER_EMAIL}{" "}
          &nbsp;&nbsp;{" "}
          <span style={{ fontWeight: "bold" }}>{FOOTER_WEB}</span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <div
          style={{
            height: "4px",
            background: "linear-gradient(to right, #d4c48a, #c2a84e, #a08930)",
          }}
        />
        <div style={{ height: "2px", background: "#fff" }} />
        <div
          style={{
            height: "6px",
            background: "linear-gradient(to right, #8a9cc4, #5b7ec2, #3a5a9e)",
          }}
        />
        <div style={{ height: "2px", background: "#fff" }} />
        <div
          style={{
            height: "8px",
            background: "linear-gradient(to right, #6a7db8, #3f4f8a, #2a2d6e)",
          }}
        />
        <div style={{ height: "2px", background: "#fff" }} />
        <div
          style={{
            height: "10px",
            background: "linear-gradient(to right, #4a3f7a, #35286a, #1e1350)",
          }}
        />
      </div>
    </div>
  );
}

function LogoHeader() {
  return (
    <div style={{ textAlign: "right", marginBottom: "10px" }}>
      <img
        src={CINEPANDA_LOGO_DATA_URI}
        alt="CinePanda Entertainments"
        style={{
          height: "80px",
          objectFit: "contain",
          display: "inline-block",
        }}
      />
    </div>
  );
}

function LogoSmall() {
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={CINEPANDA_LOGO_DATA_URI}
        alt="CinePanda Entertainments"
        style={{
          height: "55px",
          objectFit: "contain",
          display: "inline-block",
        }}
      />
    </div>
  );
}

function PlaceholderImage({
  width,
  height,
  label,
}: {
  width: number;
  height: number;
  label: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: "#f1f5f9",
        border: "1px dashed #94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: "10px",
        fontStyle: "italic",
        textAlign: "center",
        padding: "4px",
        boxSizing: "border-box",
      }}
    >
      {label}
    </div>
  );
}

function ProductImageCell({ src }: { src: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{
          width: "130px",
          height: "100px",
          objectFit: "cover",
          display: "block",
          margin: "0 auto",
        }}
      />
    );
  }
  return <PlaceholderImage width={130} height={100} label="Product image" />;
}

/* ────────────────────────────────────────────
   Bucketed item tables
   ──────────────────────────────────────────── */

function EquipmentTable({
  items,
  totalLabel = "TOTAL",
}: {
  items: ExtendedProductItem[];
  totalLabel?: string;
}) {
  if (items.length === 0) return null;
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "20px",
        fontSize: "12px",
      }}
    >
      <thead>
        <tr>
          <th style={tableHeaderStyle}>Sl.No</th>
          <th style={tableHeaderStyle}>ITEM</th>
          <th style={tableHeaderStyle}>SPECIFICATIONS</th>
          <th style={tableHeaderStyle}>QTY</th>
          <th style={tableHeaderStyle}>PRICE</th>
          <th style={tableHeaderStyle}>IMAGE</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const specs = getSpecifications(item);
          return (
            <tr key={i} style={rowStyle(i)}>
              <td style={tdStyle}>{i + 1}</td>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: "bold",
                  maxWidth: "130px",
                  textAlign: "left",
                }}
              >
                {item.productName}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "left",
                  maxWidth: "250px",
                  fontSize: "11px",
                }}
              >
                {specs || "—"}
              </td>
              <td style={tdStyle}>
                {item.quantity} {getUnit(item, "equipment")}
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>
                {fmtAmount(item.lineTotal)}
              </td>
              <td style={{ ...tdStyle, width: "150px" }}>
                <ProductImageCell src={getImage(item)} />
              </td>
            </tr>
          );
        })}
        <tr>
          <td
            colSpan={4}
            style={totalLabelStyle}
          >
            {totalLabel}
          </td>
          <td colSpan={2} style={{ ...totalAmountStyle, fontSize: "16px" }}>
            {fmtAmount(subtotal)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function SqftTable({
  items,
  totalLabel = "Total",
}: {
  items: ExtendedProductItem[];
  totalLabel?: string;
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "20px",
        fontSize: "12px",
      }}
    >
      <thead>
        <tr>
          <th style={tableHeaderStyle}>SL No</th>
          <th style={tableHeaderStyle}>Description</th>
          <th style={tableHeaderStyle}>Acoustics Area in SqFt</th>
          <th style={tableHeaderStyle}>Acoustics Price / SqFt</th>
          <th style={tableHeaderStyle}>Total Price</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const desc = getSpecifications(item);
          return (
            <tr key={i} style={rowStyle(i)}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={{ ...tdStyle, textAlign: "left" }}>
                <span style={{ fontWeight: "bold" }}>{item.productName}</span>
                {desc && (
                  <span style={{ fontWeight: "normal" }}>
                    {" "}
                    :- {desc}
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>
                {item.quantity} SqFt
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>
                {fmtAmount(item.unitPrice)} / SqFt
              </td>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>
                {fmtAmount(item.lineTotal)}
              </td>
            </tr>
          );
        })}
        <tr>
          <td
            colSpan={4}
            style={totalLabelStyle}
          >
            {totalLabel}
          </td>
          <td style={totalAmountStyle}>{fmtAmount(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function InstallationTable({
  items,
  totalLabel = "TOTAL",
}: {
  items: ExtendedProductItem[];
  totalLabel?: string;
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "20px",
        fontSize: "13px",
      }}
    >
      <thead>
        <tr>
          <th style={tableHeaderStyle}>Sl.No</th>
          <th style={tableHeaderStyle}>Item</th>
          <th style={tableHeaderStyle}>Qty</th>
          <th style={tableHeaderStyle}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td style={tdStyle}>{i + 1}</td>
            <td style={{ ...tdStyle, textAlign: "left" }}>{item.productName}</td>
            <td style={tdStyle}>
              {item.quantity} {getUnit(item, "installation")}
            </td>
            <td style={{ ...tdStyle, textAlign: "right" }}>
              {fmtAmount(item.lineTotal)}
            </td>
          </tr>
        ))}
        <tr>
          <td
            colSpan={3}
            style={totalLabelStyle}
          >
            {totalLabel}
          </td>
          <td style={totalAmountStyle}>{fmtAmount(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** One line in the right-aligned section totals stack. */
function TotalsLine({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        padding: "6px 0",
        borderBottom: `1px solid ${BORDER}`,
        fontSize: "13px",
      }}
    >
      <span style={{ color: color ?? "#444" }}>{label}</span>
      <span
        style={{ color: color ?? "#222", fontWeight: 600, whiteSpace: "nowrap" }}
      >
        {value}
      </span>
    </div>
  );
}

/** Right-aligned invoice-style totals: adjustment lines + a Grand Total bar.
 *  Replaces the old free-floating bordered GST box for a cohesive, professional
 *  finish to each option page. */
function SectionTotals({ section }: { section: QuotationSection }) {
  const { adjustments, grandTotal } = sectionBreakdown(section);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "18px",
      }}
    >
      <div style={{ width: "340px", maxWidth: "100%" }}>
        {adjustments.length > 0 && (
          <div style={{ padding: "0 2px" }}>
            {adjustments.map((a, k) => (
              <TotalsLine
                key={k}
                label={a.label}
                value={`${a.isDiscount ? "−" : "+"} ${fmtAmount(a.amount)}`}
                color={a.isDiscount ? "#b3261e" : "#333"}
              />
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: `linear-gradient(120deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
            color: "#fff",
            padding: "11px 16px",
            marginTop: "8px",
            borderLeft: `4px solid ${GOLD}`,
            borderRadius: "3px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Grand Total
          </span>
          <span style={{ fontSize: "18px", fontWeight: "bold", color: "#f0e2c4" }}>
            {fmtAmount(grandTotal)}/-
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Section page (one per AV Package / Option)
   ──────────────────────────────────────────── */

function SectionPage({
  section,
  index,
  total,
}: {
  section: QuotationSection;
  index: number;
  total: number;
}) {
  const groups = section.groups ?? [];

  // Flatten all productItems from all groups in this section, then bucket.
  const allItems: ExtendedProductItem[] = groups.flatMap(
    (g) => (g.productItems ?? []) as ExtendedProductItem[]
  );
  const equipment = allItems.filter(
    (i) => bucketForCategory(i.category) === "equipment"
  );
  const sqft = allItems.filter(
    (i) => bucketForCategory(i.category) === "sqft"
  );
  const installation = allItems.filter(
    (i) => bucketForCategory(i.category) === "installation"
  );

  // Does this section have any adjustments (GST, discount, …) or multiple
  // item tables? If so, each table shows a "SUB TOTAL" and we render a unified
  // Grand-Total panel below; otherwise the single table's "TOTAL" is the total.
  const { adjustments } = sectionBreakdown(section);
  const bucketCount = [equipment.length, sqft.length, installation.length].filter(
    (n) => n > 0
  ).length;
  const showTotalsPanel = adjustments.length > 0 || bucketCount > 1;
  const subLabel = showTotalsPanel ? "Sub Total" : "Total";

  return (
    <div style={pageStyle}>
      <div style={watermarkStyle} />
      <div
        style={{
          ...contentStyle,
          display: "flex",
          flexDirection: "column",
          minHeight: "240mm",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <LogoSmall />
        </div>
        {/* Centre the option content vertically so short options don't leave a
            big blank gap at the bottom of the page. */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: `linear-gradient(120deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
              color: "#fff",
              padding: "12px 18px",
              borderLeft: `4px solid ${GOLD}`,
              borderRadius: "3px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "bold", letterSpacing: "0.02em" }}>
              {total > 1
                ? `OPTION ${index + 1}  ·  ${section.sectionName}`
                : section.sectionName}
            </span>
            <span style={{ fontSize: "16px", fontWeight: "bold", color: "#f0e2c4" }}>
              {fmtAmount(section.grandTotal)}
            </span>
          </div>

          {section.description && (
            <p style={{ marginTop: "12px", fontSize: "13px", color: "#333" }}>
              {section.description}
            </p>
          )}

          {/* Equipment block */}
          <EquipmentTable items={equipment} totalLabel={subLabel} />

        {/* Room Acoustics block */}
        {sqft.length > 0 && (
          <>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                margin: "24px 0 0",
                color: BRAND_DARK,
              }}
            >
              ➤{" "}
              <span style={{ textDecoration: "underline" }}>
                Room Acoustics, Ceiling &amp; Carpet Work
              </span>
            </h3>
            <SqftTable items={sqft} totalLabel={subLabel} />
          </>
        )}

        {/* Installation / Cabling block */}
        {installation.length > 0 && (
          <>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                margin: "24px 0 0",
                color: BRAND_DARK,
              }}
            >
              ➤ &nbsp;
              <span style={{ textDecoration: "underline" }}>
                Installation and Accessories
              </span>
            </h3>
            <InstallationTable items={installation} totalLabel={subLabel} />
          </>
        )}

          {/* Section adjustments (GST, discount, …) + Grand Total */}
          {showTotalsPanel && <SectionTotals section={section} />}
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────
   Page 1: Cover
   ──────────────────────────────────────────── */

function MetaCell({
  label,
  value,
  border,
}: {
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "11px 16px",
        borderLeft: border ? `1px solid ${BORDER}` : "none",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          color: "#8a93a3",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          color: BRAND_DARK,
          marginTop: "3px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "13px",
        fontWeight: "bold",
        color: BRAND_DARK,
        borderLeft: `4px solid ${GOLD}`,
        paddingLeft: "10px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        padding: "3px 0",
      }}
    >
      <span style={{ color: color ?? "#444" }}>{label}</span>
      <span
        style={{ color: color ?? "#222", fontWeight: 600, whiteSpace: "nowrap" }}
      >
        {value}
      </span>
    </div>
  );
}

function CoverPage({ quotation }: { quotation: Quotation }) {
  const customer = quotation.customerId;
  return (
    <div style={pageStyle}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        {/* Brand header band (full bleed) */}
        <div
          style={{
            margin: "-20mm -20mm 0",
            background: `linear-gradient(120deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
            color: "#fff",
            padding: "32px 20mm 34px",
            borderBottom: `3px solid ${GOLD}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                letterSpacing: "0.12em",
                lineHeight: 1,
              }}
            >
              QUOTATION
            </div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.26em",
                marginTop: "10px",
                color: GOLD,
                fontWeight: "bold",
              }}
            >
              PREMIUM AV PROPOSAL
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              padding: "8px 12px",
            }}
          >
            <img
              src={CINEPANDA_LOGO_DATA_URI}
              alt="CinePanda"
              style={{ height: "54px", objectFit: "contain", display: "block" }}
            />
          </div>
        </div>

        {/* Meta strip */}
        <div
          style={{
            display: "flex",
            marginTop: "26px",
            border: `1px solid ${BORDER}`,
            borderRadius: "8px",
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <MetaCell
            label="Quotation No."
            value={quotation._id.slice(-8).toUpperCase()}
          />
          <MetaCell label="Date" value={fmtDate(quotation.quotationDate)} border />
          {quotation.validUntil && (
            <MetaCell
              label="Valid Until"
              value={fmtDate(quotation.validUntil)}
              border
            />
          )}
        </div>

        {/* Prepared for */}
        <div style={{ marginTop: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "bold",
              color: BRAND,
              letterSpacing: "0.14em",
              marginBottom: "8px",
            }}
          >
            PREPARED FOR
          </div>
          <div style={{ borderLeft: `3px solid ${BRAND}`, paddingLeft: "14px" }}>
            <div style={{ fontSize: "19px", fontWeight: "bold", color: "#111" }}>
              {customer.name}
            </div>
            {customer.place && (
              <div style={{ fontSize: "13px", color: "#555", marginTop: "2px" }}>
                {customer.place}
              </div>
            )}
            {customer.phone && (
              <div style={{ fontSize: "13px", color: "#555" }}>
                Mob: {customer.phone}
              </div>
            )}
          </div>
        </div>

        {/* Intro */}
        <p
          style={{
            margin: "26px 0 30px",
            fontSize: "13.5px",
            lineHeight: 1.75,
            color: "#222",
            textAlign: "justify",
          }}
        >
          <span style={{ fontWeight: "bold" }}>W</span>
          {INTRO_PARAGRAPH}
        </p>

        {/* Speaker config */}
        <SectionHeading>
          Speaker Configuration
          {quotation.speakerConfig?.name
            ? `  —  ${quotation.speakerConfig.name}`
            : ""}
        </SectionHeading>
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          {quotation.speakerConfig?.imageUrl ? (
            <img
              src={quotation.speakerConfig.imageUrl}
              alt={quotation.speakerConfig.name}
              style={{
                maxWidth: "100%",
                maxHeight: "330px",
                height: "auto",
                display: "inline-block",
              }}
            />
          ) : (
            <PlaceholderImage
              width={500}
              height={280}
              label="Speaker configuration diagram (to be added)"
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────
   Final summary / T&C / signature page
   ──────────────────────────────────────────── */

function SummaryPage({ quotation }: { quotation: Quotation }) {
  const sections = quotation.sections ?? [];
  const termsLines: string[] = quotation.termsAndConditions
    ? quotation.termsAndConditions
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    : TERMS_DEFAULT;

  return (
    <div style={lastPageStyle}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <div style={{ textAlign: "right", marginBottom: "18px" }}>
          <LogoSmall />
        </div>

        <SectionHeading>Investment Summary</SectionHeading>

        <div style={{ marginTop: "16px" }}>
          {sections.map((section, i) => {
            const { subtotal, adjustments, grandTotal } =
              sectionBreakdown(section);
            const optionLabel =
              sections.length > 1 ? `AV Option ${i + 1}` : section.sectionName;

            return (
              <div
                key={i}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${BRAND}`,
                  borderRadius: "8px",
                  padding: "14px 18px",
                  marginBottom: "12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "bold",
                      color: BRAND_DARK,
                    }}
                  >
                    {optionLabel}
                  </span>
                  {sections.length > 1 && (
                    <span style={{ fontSize: "11px", color: "#8a93a3" }}>
                      {section.sectionName}
                    </span>
                  )}
                </div>

                {/* Price breakdown */}
                <div style={{ fontSize: "12.5px", color: "#333" }}>
                  <BreakdownRow
                    label="Equipment, accessories & installation"
                    value={`₹${fmtAmount(subtotal)}`}
                  />
                  {adjustments.map((a, k) => (
                    <BreakdownRow
                      key={k}
                      label={a.label}
                      value={`${a.isDiscount ? "−" : "+"} ₹${fmtAmount(a.amount)}`}
                      color={a.isDiscount ? "#b3261e" : "#444"}
                    />
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: `2px solid ${BRAND}`,
                      marginTop: "8px",
                      paddingTop: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: BRAND_DARK,
                      }}
                    >
                      Grand Total
                    </span>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "19px",
                        color: BRAND_DARK,
                      }}
                    >
                      ₹{fmtAmount(grandTotal)}/-
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "26px" }}>
          <SectionHeading>Terms &amp; Conditions</SectionHeading>
          <ol
            style={{
              paddingLeft: "22px",
              margin: "12px 0 0",
              fontSize: "12.5px",
              color: "#333",
              lineHeight: 1.7,
            }}
          >
            {termsLines.map((t, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                {t}
              </li>
            ))}
          </ol>
        </div>

        {quotation.notes && (
          <p
            style={{
              fontSize: "12.5px",
              fontStyle: "italic",
              color: "#555",
              margin: "16px 0 0",
              whiteSpace: "pre-line",
            }}
          >
            {quotation.notes}
          </p>
        )}

        <p
          style={{
            fontStyle: "italic",
            textAlign: "center",
            margin: "26px 0 0",
            fontSize: "13px",
            color: "#444",
          }}
        >
          Please feel free to call us for any further clarification. We look
          forward to your valued order and an opportunity to serve.
        </p>

        {/* Signature */}
        <div
          style={{
            marginTop: "36px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ minWidth: "230px" }}>
            <p
              style={{
                fontSize: "13px",
                color: "#444",
                marginBottom: "34px",
              }}
            >
              With Warm Regards,
            </p>
            <div style={{ borderTop: `1.5px solid ${BRAND}`, paddingTop: "7px" }}>
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: BRAND_DARK,
                  margin: 0,
                }}
              >
                {SIGNATURE.name}
              </p>
              <p style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>
                {SIGNATURE.title}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                Mobile: {SIGNATURE.mobile}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────
   Top-level document
   ──────────────────────────────────────────── */

export default function QuotationPdfDocument({
  quotation,
}: {
  quotation: Quotation;
}) {
  return (
    <div
      style={{
        background: "#fff",
        fontFamily: "Calibri, Arial, sans-serif",
      }}
    >
      <CoverPage quotation={quotation} />
      {(quotation.sections ?? []).map((section, i) => (
        <SectionPage
          key={i}
          section={section}
          index={i}
          total={(quotation.sections ?? []).length}
        />
      ))}
      <SummaryPage quotation={quotation} />
    </div>
  );
}
