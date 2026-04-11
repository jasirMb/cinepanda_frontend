"use client";

import { forwardRef } from "react";
import type {
  Quotation,
  QuotationSection,
  QuotationGroup,
  QuotationManualItem,
} from "@/lib/api/quotations";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { dateStyle: "long" });

/* ────────────────────────────────────────────
   Style helpers (inline for PDF compatibility)
   ──────────────────────────────────────────── */

function thStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: "10px 8px",
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    ...extra,
  };
}

function tdStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: "10px 8px",
    verticalAlign: "top",
    fontSize: 12,
    ...extra,
  };
}

/* ────────────────────────────────────────────
   ManualItemsBlock — reused for group & section
   ──────────────────────────────────────────── */

function ManualItemsBlock({
  items,
  label,
}: {
  items: QuotationManualItem[];
  label?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#fafafa",
        borderRadius: 4,
        padding: "8px 12px",
        marginTop: 8,
      }}
    >
      {label && (
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
          }}
        >
          {label}
        </p>
      )}
      {items.map((m, mi) => (
        <div
          key={mi}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            padding: "3px 0",
            color: "#475569",
          }}
        >
          <span>
            {m.type === "discount" ? "(-) " : "(+) "}
            {m.name}
            {m.isPercentage ? ` (${m.amount}%)` : ""}
            {m.description && (
              <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>
                {m.description}
              </span>
            )}
          </span>
          <span
            style={{
              fontWeight: 600,
              color: m.type === "discount" ? "#dc2626" : "#334155",
            }}
          >
            {m.type === "discount" ? "-" : "+"}
            {INR(Math.abs(m.resolvedAmount))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   SectionBlock — one boxed section per template
   ──────────────────────────────────────────── */

function SectionBlock({
  section,
  index,
  totalSections,
}: {
  section: QuotationSection;
  index: number;
  totalSections: number;
}) {
  let serial = 0;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        pageBreakInside: "auto",
      }}
    >
      {/* Section header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          padding: "14px 20px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
                opacity: 0.7,
                margin: 0,
              }}
            >
              {totalSections > 1
                ? `Option ${index + 1} of ${totalSections}`
                : "Package Details"}
            </p>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                margin: "4px 0 0",
              }}
            >
              {section.sectionName}
            </h3>
          </div>
          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 6,
              padding: "6px 14px",
              textAlign: "right",
            }}
          >
            <p
              style={{
                fontSize: 10,
                opacity: 0.7,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Total
            </p>
            <p
              style={{
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
              }}
            >
              {INR(section.grandTotal)}
            </p>
          </div>
        </div>
        {section.description && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.75,
              margin: "6px 0 0",
            }}
          >
            {section.description}
          </p>
        )}
      </div>

      {/* Section body */}
      <div style={{ padding: "16px 20px" }}>
        {section.groups.map((group: QuotationGroup, gi: number) => (
          <div
            key={gi}
            style={{
              marginBottom: gi < section.groups.length - 1 ? 20 : 0,
            }}
          >
            {/* Group name */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: 6,
                marginBottom: 0,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                  margin: 0,
                }}
              >
                {group.name}
              </p>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748b",
                  margin: 0,
                }}
              >
                Subtotal: {INR(group.subtotal)}
              </p>
            </div>

            {/* Products table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={thStyle({ width: "6%", textAlign: "center" })}>
                    Sl.No
                  </th>
                  <th style={thStyle({ width: "30%" })}>Item</th>
                  <th style={thStyle({ width: "30%" })}>Specifications</th>
                  <th style={thStyle({ width: "8%", textAlign: "center" })}>
                    Qty
                  </th>
                  <th style={thStyle({ width: "13%", textAlign: "right" })}>
                    Price
                  </th>
                  <th style={thStyle({ width: "13%", textAlign: "right" })}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.productItems.map((item, ii) => {
                  serial++;
                  return (
                    <tr
                      key={ii}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        pageBreakInside: "avoid",
                        backgroundColor: ii % 2 === 1 ? "#fafbfc" : "#ffffff",
                      }}
                    >
                      <td style={tdStyle({ textAlign: "center", color: "#94a3b8" })}>
                        {serial}
                      </td>
                      <td style={tdStyle({ fontWeight: 600, color: "#1e293b" })}>
                        {item.productName}
                      </td>
                      <td style={tdStyle({ fontSize: 11, color: "#64748b" })}>
                        {item.category}
                        {item.subcategory ? ` / ${item.subcategory}` : ""}
                      </td>
                      <td style={tdStyle({ textAlign: "center" })}>
                        {item.quantity}
                      </td>
                      <td style={tdStyle({ textAlign: "right" })}>
                        {INR(item.unitPrice)}
                      </td>
                      <td
                        style={tdStyle({
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1e293b",
                        })}
                      >
                        {INR(item.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Group-level manual items */}
            <ManualItemsBlock items={group.manualItems} />
          </div>
        ))}

        {/* Section-level manual items (GST, discounts, etc.) */}
        {section.manualItems?.length > 0 && (
          <div
            style={{
              marginTop: 16,
              borderTop: "2px solid #e2e8f0",
              paddingTop: 12,
            }}
          >
            <ManualItemsBlock
              items={section.manualItems}
              label="Adjustments"
            />
          </div>
        )}

        {/* Section grand total bar */}
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#166534",
            }}
          >
            {totalSections > 1
              ? `Option ${index + 1} Total`
              : "Grand Total"}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#166534",
            }}
          >
            {INR(section.grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Preview Component
   ──────────────────────────────────────────── */

interface QuotationPreviewProps {
  quotation: Quotation;
}

export const QuotationPreview = forwardRef<
  HTMLDivElement,
  QuotationPreviewProps
>(function QuotationPreview({ quotation }, ref) {
  const customer = quotation.customerId;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#1e293b",
        backgroundColor: "#ffffff",
        maxWidth: 800,
        margin: "0 auto",
        padding: 36,
        lineHeight: 1.5,
      }}
    >
      {/* ── Header ─────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "3px solid #1e293b",
          paddingBottom: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            CINEPANDA
          </h1>
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              margin: "2px 0 0",
              letterSpacing: 2,
              fontWeight: 500,
            }}
          >
            ENTERTAINMENTS
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 10,
              color: "#94a3b8",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Quotation
          </p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              margin: "2px 0 4px",
              color: "#0f172a",
            }}
          >
            #{quotation._id.slice(-8).toUpperCase()}
          </p>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            {fmtDate(quotation.quotationDate)}
          </p>
        </div>
      </div>

      {/* ── Intro ──────────────────────────── */}
      <p
        style={{
          fontSize: 13,
          color: "#475569",
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        We take this opportunity to thank you for your interest in our products
        and services. Based on the discussion with you, we hereby suggest the
        following package for your home theatre room.
      </p>

      {/* ── Customer Info ──────────────────── */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "14px 20px",
          marginBottom: 28,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Prepared for
        </p>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            <tr>
              <td
                style={{
                  fontWeight: 600,
                  paddingRight: 20,
                  paddingBottom: 4,
                  color: "#475569",
                }}
              >
                Customer:
              </td>
              <td style={{ paddingBottom: 4, fontWeight: 600, color: "#0f172a" }}>
                {customer.name}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontWeight: 600,
                  paddingRight: 20,
                  paddingBottom: 4,
                  color: "#475569",
                }}
              >
                Phone:
              </td>
              <td style={{ paddingBottom: 4 }}>{customer.phone}</td>
            </tr>
            <tr>
              <td
                style={{
                  fontWeight: 600,
                  paddingRight: 20,
                  paddingBottom: 4,
                  color: "#475569",
                }}
              >
                Place:
              </td>
              <td style={{ paddingBottom: 4 }}>{customer.place}</td>
            </tr>
            {customer.email && (
              <tr>
                <td
                  style={{
                    fontWeight: 600,
                    paddingRight: 20,
                    color: "#475569",
                  }}
                >
                  Email:
                </td>
                <td>{customer.email}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Sections / Options ─────────────── */}
      {quotation.sections.map((section, si) => (
        <SectionBlock
          key={si}
          section={section}
          index={si}
          totalSections={quotation.sections.length}
        />
      ))}

      {/* ── Package Summary (multiple sections) ── */}
      {quotation.sections.length > 1 && (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 20,
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            pageBreakInside: "avoid",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #047857 0%, #059669 100%)",
              padding: "12px 20px",
              color: "#ffffff",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Package Summary
            </h3>
          </div>
          <div style={{ padding: "12px 20px" }}>
            {quotation.sections.map((s, si) => (
              <div
                key={si}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom:
                    si < quotation.sections.length - 1
                      ? "1px solid #f1f5f9"
                      : "none",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#475569" }}>
                  Option {si + 1}: {s.sectionName}
                </span>
                <span style={{ fontWeight: 700, color: "#1e293b" }}>
                  {INR(s.grandTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes ──────────────────────────── */}
      {quotation.notes && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 6,
            pageBreakInside: "avoid",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#92400e",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            Notes
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#78350f",
              whiteSpace: "pre-line",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {quotation.notes}
          </p>
        </div>
      )}

      {/* ── Terms & Conditions ─────────────── */}
      <div
        style={{
          marginTop: 8,
          marginBottom: 24,
          padding: "16px 20px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          pageBreakInside: "avoid",
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 10,
            textDecoration: "underline",
          }}
        >
          Terms & Conditions
        </p>
        {quotation.termsAndConditions ? (
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              whiteSpace: "pre-line",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {quotation.termsAndConditions}
          </p>
        ) : (
          <ol
            style={{
              fontSize: 11,
              color: "#64748b",
              paddingLeft: 16,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            <li>All materials are inclusive of taxes.</li>
            <li>
              On order confirmation 50% of payment should be made in advance,
              40% on delivery of materials and remaining 10% on completion.
            </li>
            <li>Transportation charges are extra.</li>
            <li>
              Images shown in the quote are for reference only. Original product
              may vary.
            </li>
            <li>
              Equipment warranties as set forth by the manufacturers to their
              products.
            </li>
            <li>This quote is valid for 15 days only.</li>
          </ol>
        )}
      </div>

      {/* ── Footer ─────────────────────────── */}
      <div
        style={{
          paddingTop: 16,
          borderTop: "3px solid #1e293b",
          textAlign: "center",
          pageBreakInside: "avoid",
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "#64748b",
            marginBottom: 16,
          }}
        >
          Please feel free to call us for any further clarification and we look
          forward to your valued order and an opportunity to serve.
        </p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 4px",
          }}
        >
          CinePanda Entertainments
        </p>
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            margin: "0 0 2px",
          }}
        >
          Teepeyem Enclave, 2nd Floor, Opp. Gokul Oottupura, KK Road
          Kadavantra, Cochin - 682020
        </p>
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            margin: "0 0 12px",
          }}
        >
          Mob: 9287777377 / 9745077377 &nbsp;|&nbsp; sales@cinepanda.in
          &nbsp;|&nbsp; www.cinepanda.in
        </p>

        {quotation.validUntil && (
          <p
            style={{
              fontSize: 10,
              color: "#94a3b8",
              borderTop: "1px solid #e2e8f0",
              paddingTop: 8,
              margin: 0,
            }}
          >
            This quotation is valid until {fmtDate(quotation.validUntil)}
          </p>
        )}
      </div>
    </div>
  );
});
