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

function getImage(item: ExtendedProductItem): string {
  return item.image || item.imageUrl || PRODUCT_IMAGE_PLACEHOLDER;
}

function getSpecifications(item: ExtendedProductItem): string {
  return item.specifications || item.description || "";
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

const watermarkStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "40px",
  right: "-40px",
  width: "450px",
  height: "550px",
  backgroundImage: watermarkDataUri,
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain",
  pointerEvents: "none",
  zIndex: 0,
};

const contentStyle: React.CSSProperties = { position: "relative", zIndex: 1 };

const tableHeaderStyle: React.CSSProperties = {
  background: "#dce6f1",
  fontWeight: "bold",
  padding: "8px 10px",
  border: "1px solid #000",
  textAlign: "center",
  fontSize: "14px",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #000",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "13px",
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

function EquipmentTable({ items }: { items: ExtendedProductItem[] }) {
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
            <tr key={i}>
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
            style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}
          >
            TOTAL
          </td>
          <td
            colSpan={2}
            style={{
              ...tdStyle,
              fontWeight: "bold",
              textAlign: "right",
              fontSize: "16px",
            }}
          >
            {fmtAmount(subtotal)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function SqftTable({ items }: { items: ExtendedProductItem[] }) {
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
            <tr key={i}>
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
            style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}
          >
            Total
          </td>
          <td
            style={{
              ...tdStyle,
              fontWeight: "bold",
              textAlign: "right",
            }}
          >
            {fmtAmount(total)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function InstallationTable({ items }: { items: ExtendedProductItem[] }) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  return (
    <table
      style={{
        width: "80%",
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
            style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}
          >
            TOTAL
          </td>
          <td
            style={{
              ...tdStyle,
              fontWeight: "bold",
              textAlign: "right",
            }}
          >
            {fmtAmount(total)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ManualItemsTable({ items }: { items: QuotationManualItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <table
      style={{
        width: "60%",
        borderCollapse: "collapse",
        marginTop: "20px",
        fontSize: "13px",
        marginLeft: "auto",
      }}
    >
      <tbody>
        {items.map((m, i) => (
          <tr key={i}>
            <td style={{ ...tdStyle, textAlign: "left" }}>
              {m.type === "discount" ? "(-) " : "(+) "}
              {m.name}
              {m.isPercentage ? ` (${m.amount}%)` : ""}
            </td>
            <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>
              {m.type === "discount" ? "-" : ""}
              {fmtAmount(Math.abs(m.resolvedAmount))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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

  // Section-level + group-level manual items
  const allManualItems: QuotationManualItem[] = [
    ...groups.flatMap((g) => g.manualItems ?? []),
    ...(section.manualItems ?? []),
  ];

  return (
    <div style={pageStyle}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
            ➤{" "}
            <span style={{ fontWeight: "bold" }}>
              {total > 1
                ? `AV Package ${index + 1}, ${section.sectionName}.`
                : section.sectionName}
            </span>
          </h2>
          <div style={{ marginLeft: "20px", flexShrink: 0 }}>
            <LogoSmall />
          </div>
        </div>

        {section.description && (
          <p style={{ marginTop: "12px", fontSize: "13px", color: "#333" }}>
            {section.description}
          </p>
        )}

        {/* Equipment block */}
        <EquipmentTable items={equipment} />

        {/* Room Acoustics block */}
        {sqft.length > 0 && (
          <>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                margin: "30px 0 0",
              }}
            >
              ➤{" "}
              <span style={{ textDecoration: "underline" }}>
                Room Acoustics, Ceiling &amp; Carpet Work
              </span>
            </h3>
            <SqftTable items={sqft} />
          </>
        )}

        {/* Installation / Cabling block */}
        {installation.length > 0 && (
          <>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                margin: "30px 0 0",
              }}
            >
              ➤ &nbsp;
              <span style={{ textDecoration: "underline" }}>
                Installation and Accessories
              </span>
            </h3>
            <InstallationTable items={installation} />
          </>
        )}

        {/* Section-level adjustments (GST, discount, etc.) */}
        <ManualItemsTable items={allManualItems} />
      </div>
      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────
   Page 1: Cover
   ──────────────────────────────────────────── */

function CoverPage({ quotation }: { quotation: Quotation }) {
  const customer = quotation.customerId;
  return (
    <div style={pageStyle}>
      <div style={watermarkStyle} />
      <div style={contentStyle}>
        <LogoHeader />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "50px 0 30px",
          }}
        >
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>
            {quotationNumber(quotation)}
          </span>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>
            {fmtDate(quotation.quotationDate)}
          </span>
        </div>

        <div style={{ margin: "20px 0 10px", fontSize: "14px" }}>
          <div style={{ fontWeight: "bold" }}>To,</div>
          <div style={{ fontWeight: "bold" }}>{customer.name}</div>
          {customer.place && <div>{customer.place}</div>}
          {customer.phone && <div>Mob: {customer.phone}</div>}
        </div>

        <p
          style={{
            margin: "30px 0 30px",
            fontSize: "14px",
            textIndent: "40px",
          }}
        >
          <span style={{ fontSize: "22px", fontWeight: "bold" }}>W</span>
          {INTRO_PARAGRAPH}
        </p>

        <h2
          style={{
            textAlign: "center",
            textDecoration: "underline",
            margin: "40px 0 30px",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          Speaker Configuration
        </h2>

        <div style={{ margin: "20px 0", textAlign: "center" }}>
          {CONFIG_DIAGRAM_PLACEHOLDER_URL ? (
            <img
              src={CONFIG_DIAGRAM_PLACEHOLDER_URL}
              alt="Speaker Configuration"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          ) : (
            <PlaceholderImage
              width={500}
              height={300}
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
        <LogoHeader />

        <hr
          style={{
            border: "none",
            borderTop: "2px solid #1a3c6e",
            margin: "20px 0 30px",
          }}
        />

        {sections.map((section, i) => {
          const estimated = sectionEstimated(section);
          const offer = sectionOffer(section);
          const hasDiscount = Math.round(estimated) !== Math.round(offer);
          const optionLabel =
            sections.length > 1 ? `AV Option ${i + 1}` : section.sectionName;

          return (
            <div key={i} style={{ marginBottom: "30px" }}>
              <h2
                style={{
                  fontSize: i === 0 ? "20px" : "18px",
                  fontWeight: "bold",
                  color: "#1a3c6e",
                  margin: "10px 0 10px",
                }}
              >
                Total estimated project cost for {optionLabel} with Accessories
                and Installation is Rupees ₹{" "}
                {hasDiscount ? (
                  <span style={{ textDecoration: "line-through" }}>
                    {fmtAmount(estimated)}/-
                  </span>
                ) : (
                  <span>{fmtAmount(estimated)}/-</span>
                )}
              </h2>

              {hasDiscount && (
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#d4183d",
                    margin: "5px 0 20px",
                  }}
                >
                  Offer Price for the Package is {fmtAmount(offer)}/-
                </h2>
              )}
            </div>
          );
        })}

        <hr
          style={{
            border: "none",
            borderTop: "2px solid #1a3c6e",
            margin: "10px 0",
          }}
        />
        <hr
          style={{
            border: "none",
            borderTop: "2px solid #1a3c6e",
            margin: "5px 0 30px",
          }}
        />

        <h3
          style={{
            fontWeight: "bold",
            textDecoration: "underline",
            margin: "20px 0 10px",
            fontSize: "16px",
          }}
        >
          Terms &amp; Conditions
        </h3>
        <ol
          style={{
            paddingLeft: "30px",
            margin: "0 0 25px",
            fontSize: "14px",
          }}
        >
          {termsLines.map((t, i) => (
            <li key={i} style={{ marginBottom: "5px" }}>
              {t}
            </li>
          ))}
        </ol>

        {quotation.notes && (
          <p
            style={{
              fontSize: "13px",
              fontStyle: "italic",
              color: "#333",
              margin: "10px 0 20px",
              whiteSpace: "pre-line",
            }}
          >
            {quotation.notes}
          </p>
        )}

        <p
          style={{
            fontStyle: "italic",
            fontWeight: "bold",
            textAlign: "center",
            margin: "20px 0",
            fontSize: "14px",
          }}
        >
          Please feel free to call us for any further clarification and we look
          forward to your valued order and an opportunity to serve.
        </p>

        <div style={{ margin: "30px 0 0" }}>
          <p style={{ marginBottom: "5px" }}>With Warm Regards.</p>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              margin: "5px 0 2px",
            }}
          >
            {SIGNATURE.name}
          </p>
          <p style={{ margin: "2px 0", fontSize: "13px" }}>
            {SIGNATURE.title}
          </p>
          <p style={{ margin: "2px 0", fontSize: "13px" }}>
            Mobile: {SIGNATURE.mobile}
          </p>
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
