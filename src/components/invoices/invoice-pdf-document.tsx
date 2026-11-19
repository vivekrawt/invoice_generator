import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Invoice } from "@/types/database.types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { HARDCODED_BUSINESS_PROFILE } from "@/lib/constants/business-defaults";

const NAVY = "#0b1f3a";
const TEXT_MAIN = "#1e293b";
const TEXT_MUTED = "#64748b";
const BORDER_COLOR = "#cbd5e1";
const BG_LIGHT = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
    color: TEXT_MAIN,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    backgroundColor: "#ffffff",
  },
  // TOP HEADER
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
    borderBottomStyle: "solid",
    paddingBottom: 14,
    marginBottom: 14,
  },
  headerLeft: {
    width: "56%",
  },
  businessName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  businessMeta: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.35,
  },
  businessHighlight: {
    fontSize: 8.5,
    color: TEXT_MAIN,
    fontFamily: "Helvetica-Bold",
  },
  headerRight: {
    width: "48%",
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  metaGrid: {
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 2.5,
  },
  metaLabel: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    fontFamily: "Helvetica",
    marginRight: 4,
  },
  metaValue: {
    fontSize: 8.5,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
  },

  // ADDRESSES (BILL TO & SHIP TO)
  addressesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
  },
  addressBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: "solid",
    borderRadius: 4,
    padding: 8,
    backgroundColor: BG_LIGHT,
  },
  addressTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
    borderBottomStyle: "solid",
    paddingBottom: 2,
  },
  clientName: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.3,
  },

  // PRODUCT TABLE
  tableContainer: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
    borderBottomStyle: "solid",
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#fafbfc",
  },
  colSNo: {
    width: "6%",
    textAlign: "center",
  },
  colDesc: {
    width: "44%",
    paddingRight: 6,
  },
  colHsn: {
    width: "12%",
    textAlign: "center",
  },
  colQty: {
    width: "10%",
    textAlign: "right",
  },
  colUnit: {
    width: "8%",
    textAlign: "center",
  },
  colRate: {
    width: "10%",
    textAlign: "right",
  },
  colAmount: {
    width: "10%",
    textAlign: "right",
  },
  tdProductName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
  },
  tdProductDesc: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  tdText: {
    fontSize: 8.5,
  },

  // SUMMARY & TOTALS
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  wordsBox: {
    width: "56%",
    paddingRight: 10,
  },
  wordsLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  wordsText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
    lineHeight: 1.35,
  },
  totalsBox: {
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1.5,
    borderTopColor: NAVY,
    borderTopStyle: "solid",
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 8.5,
    color: TEXT_MUTED,
  },
  totalValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },

  // PAYMENT & BANKING SECTION
  paymentAndTermsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: "solid",
    borderRadius: 4,
    padding: 8,
    marginBottom: 14,
    backgroundColor: BG_LIGHT,
  },
  bankColumn: {
    width: "56%",
    paddingRight: 8,
  },
  qrColumn: {
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: BORDER_COLOR,
    borderLeftStyle: "solid",
    paddingLeft: 8,
  },
  sectionHeading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bankItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bankLabel: {
    width: "36%",
    fontSize: 8,
    color: TEXT_MUTED,
  },
  bankValue: {
    width: "64%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
  },
  qrImage: {
    width: 65,
    height: 65,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 2,
  },
  qrCaption: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  // TERMS & CONDITIONS
  termsBox: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: "solid",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  termsText: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    lineHeight: 1.35,
  },

  // SIGNATURE & FOOTER
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    borderTopStyle: "solid",
  },
  footerNote: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    maxWidth: "55%",
  },
  signatureBox: {
    width: "45%",
    alignItems: "flex-end",
  },
  sigEntity: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
  },
  sigArea: {
    width: 140,
    alignItems: "center",
  },
  sigImageContainer: {
    height: 56,
    width: 140,
    position: "relative",
    marginBottom: 2,
  },
  stampImage: {
    position: "absolute",
    left: 10,
    top: 2,
    width: 52,
    height: 52,
    objectFit: "contain",
    opacity: 0.85,
  },
  signatureImage: {
    position: "absolute",
    left: 28,
    top: 10,
    width: 95,
    height: 38,
    objectFit: "contain",
  },
  sigPlaceholderSpace: {
    height: 28,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: TEXT_MAIN,
    borderBottomStyle: "solid",
    width: 140,
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    textTransform: "uppercase",
  },
  sigDetails: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  pageNumber: {
    position: "absolute",
    bottom: 16,
    right: 36,
    fontSize: 7.5,
    color: TEXT_MUTED,
  },
});

function resolvePdfImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  }
  return trimmed;
}

export function InvoicePDFDocument({ invoice }: { invoice: Invoice }) {
  const rawB = invoice.business_snapshot || {};
  const b = {
    ...HARDCODED_BUSINESS_PROFILE,
    ...rawB,
    business_name: rawB.business_name || HARDCODED_BUSINESS_PROFILE.business_name,
    address: rawB.address || HARDCODED_BUSINESS_PROFILE.address,
    phone: rawB.phone || HARDCODED_BUSINESS_PROFILE.phone,
    bank_account_name: rawB.bank_account_name || HARDCODED_BUSINESS_PROFILE.bank_account_name,
    bank_name: rawB.bank_name || HARDCODED_BUSINESS_PROFILE.bank_name,
    account_number: rawB.account_number || HARDCODED_BUSINESS_PROFILE.account_number,
    ifsc: rawB.ifsc || HARDCODED_BUSINESS_PROFILE.ifsc,
    payment_qr_url: rawB.payment_qr_url || HARDCODED_BUSINESS_PROFILE.payment_qr_url,
    stamp_url: rawB.stamp_url || HARDCODED_BUSINESS_PROFILE.stamp_url,
    signature_url: rawB.signature_url || HARDCODED_BUSINESS_PROFILE.signature_url,
  };
  const c = invoice.customer_snapshot;
  const s = invoice.shipping_snapshot;
  const items = invoice.items || [];

  const qrUrl = resolvePdfImageUrl(b.payment_qr_url);
  const stampUrl = resolvePdfImageUrl(b.stamp_url);
  const signatureUrl = resolvePdfImageUrl(b.signature_url);

  // Bank fields existence check
  const hasBankDetails =
    b.bank_account_name ||
    b.bank_name ||
    b.account_number ||
    b.ifsc ||
    b.upi_id;

  return (
    <Document title={`Invoice-${invoice.invoice_number}`} author="ABIRA Enterprises">
      <Page size="A4" style={styles.page}>
        {/* ==================== 1. TOP HEADER ==================== */}
        <View style={styles.topHeader}>
          {/* Header Left: ABIRA Enterprises details */}
          <View style={styles.headerLeft}>
            <Text style={styles.businessName}>{b.business_name}</Text>
            <Text style={styles.businessMeta}>{b.address}</Text>
            <Text style={styles.businessMeta}>
              Phone: <Text style={styles.businessHighlight}>{b.phone}</Text>
            </Text>
            {b.email && (
              <Text style={styles.businessMeta}>
                Email: <Text style={styles.businessHighlight}>{b.email}</Text>
              </Text>
            )}
            {b.pan && (
              <Text style={styles.businessMeta}>
                PAN: <Text style={styles.businessHighlight}>{b.pan}</Text>
              </Text>
            )}
          </View>

          {/* Header Right: INVOICE title & metadata */}
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No:</Text>
                <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice Date:</Text>
                <Text style={styles.metaValue}>{formatDate(invoice.invoice_date)}</Text>
              </View>
              {invoice.po_number && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>PO Number:</Text>
                  <Text style={styles.metaValue}>{invoice.po_number}</Text>
                </View>
              )}
              {invoice.po_date && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>PO Date:</Text>
                  <Text style={styles.metaValue}>{formatDate(invoice.po_date)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ==================== 2. ADDRESSES: BILL TO & SHIP TO ==================== */}
        <View style={styles.addressesRow}>
          {/* BILL TO */}
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>BILL TO:</Text>
            <Text style={styles.clientName}>{c.customer_name}</Text>
            <Text style={styles.addressText}>{c?.billing_address}</Text>
            <Text style={styles.addressText}>
              {c?.city}, {c?.state} – {c?.pincode}
            </Text>
            <Text style={styles.addressText}>Phone: {c?.phone}</Text>
            {c?.gstin && (
              <Text style={styles.addressText}>
                GSTIN: <Text style={styles.businessHighlight}>{c.gstin}</Text>
              </Text>
            )}
          </View>

          {/* SHIP TO (If different) or Mirror */}
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>SHIP TO:</Text>
            {s && s.delivery_address ? (
              <>
                <Text style={styles.clientName}>{s.recipient_name || c?.customer_name}</Text>
                <Text style={styles.addressText}>{s.delivery_address}</Text>
                <Text style={styles.addressText}>
                  {s.city}, {s.state} – {s.pincode}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.clientName}>{c?.customer_name}</Text>
                <Text style={styles.addressText}>{c?.billing_address}</Text>
                <Text style={styles.addressText}>
                  {c?.city}, {c?.state} – {c?.pincode}
                </Text>
                <Text style={[styles.addressText, { fontStyle: "italic", marginTop: 2 }]}>
                  (Same as billing address)
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ==================== 3. PRODUCT DETAILS TABLE ==================== */}
        <View style={styles.tableContainer}>
          {/* Header repeats on page breaks */}
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.thText, styles.colSNo]}>#</Text>
            <Text style={[styles.thText, styles.colDesc]}>Description</Text>
            <Text style={[styles.thText, styles.colHsn]}>HSN/SAC</Text>
            <Text style={[styles.thText, styles.colQty]}>Qty</Text>
            <Text style={[styles.thText, styles.colUnit]}>Unit</Text>
            <Text style={[styles.thText, styles.colRate]}>Rate (₹)</Text>
            <Text style={[styles.thText, styles.colAmount]}>Amount (₹)</Text>
          </View>

          {/* Table rows (wrap=false prevents splitting rows) */}
          {items.map((item, idx) => (
            <View
              key={item.id || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
              wrap={false}
            >
              <Text style={[styles.tdText, styles.colSNo]}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.tdProductName}>{item.product_name}</Text>
                {item.description ? (
                  <Text style={styles.tdProductDesc}>{item.description}</Text>
                ) : null}
              </View>
              <Text style={[styles.tdText, styles.colHsn]}>{item.hsn_sac || "—"}</Text>
              <Text style={[styles.tdText, styles.colQty]}>{Number(item.quantity).toFixed(2)}</Text>
              <Text style={[styles.tdText, styles.colUnit]}>{item.unit || "Pcs"}</Text>
              <Text style={[styles.tdText, styles.colRate]}>{Number(item.unit_price).toFixed(2)}</Text>
              <Text style={[styles.tdText, styles.colAmount]}>{Number(item.line_amount).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* ==================== 4. SUMMARY & TOTALS ==================== */}
        <View style={styles.summarySection} wrap={false}>
          <View style={styles.wordsBox}>
            <Text style={styles.wordsLabel}>Amount in Words:</Text>
            <Text style={styles.wordsText}>{invoice.amount_in_words}</Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {Number(invoice.adjustments) !== 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Adjustments / Taxes:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.adjustments)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Payable:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* ==================== 5. PAYMENT & BANKING SECTION ==================== */}
        {(hasBankDetails || b.payment_qr_url) && (
          <View style={styles.paymentAndTermsRow} wrap={false}>
            {/* Bank Details */}
            <View style={styles.bankColumn}>
              <Text style={styles.sectionHeading}>Bank & Remittance Details</Text>
              {b.bank_account_name && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Account Name:</Text>
                  <Text style={styles.bankValue}>{b.bank_account_name}</Text>
                </View>
              )}
              {b.bank_name && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Bank Name:</Text>
                  <Text style={styles.bankValue}>{b.bank_name}</Text>
                </View>
              )}
              {b.account_number && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Account No:</Text>
                  <Text style={styles.bankValue}>{b.account_number}</Text>
                </View>
              )}
              {b.ifsc && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>IFSC Code:</Text>
                  <Text style={styles.bankValue}>{b.ifsc}</Text>
                </View>
              )}
              {b.upi_id && (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>UPI ID:</Text>
                  <Text style={styles.bankValue}>{b.upi_id}</Text>
                </View>
              )}
            </View>

            {/* Payment QR */}
            {qrUrl && (
              <View style={styles.qrColumn}>
                <Text style={[styles.sectionHeading, { textAlign: "center" }]}>
                  Scan to Pay (UPI)
                </Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qrUrl} style={styles.qrImage} />
                <Text style={styles.qrCaption}>Instant QR Settlement</Text>
              </View>
            )}
          </View>
        )}

        {/* ==================== 6. TERMS & CONDITIONS ==================== */}
        {invoice.terms && (
          <View style={styles.termsBox} wrap={false}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{invoice.terms}</Text>
            {invoice.additional_notes && (
              <View style={{ marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: BORDER_COLOR }}>
                <Text style={[styles.termsTitle, { fontSize: 7.5 }]}>Special Notes:</Text>
                <Text style={styles.termsText}>{invoice.additional_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ==================== 7. FOOTER & AUTHORIZED SIGNATURE ==================== */}
        <View style={styles.footerSection} wrap={false}>
          <Text style={styles.footerNote}>
            This is a computer generated invoice issued by ABIRA Enterprises.
          </Text>

          <View style={styles.signatureBox}>
            <Text style={styles.sigEntity}>For ABIRA Enterprises</Text>

            <View style={styles.sigArea}>
              {stampUrl || signatureUrl ? (
                <View style={styles.sigImageContainer}>
                  {stampUrl && (
                    /* eslint-disable-next-line jsx-a11y/alt-text */
                    <Image src={stampUrl} style={styles.stampImage} />
                  )}
                  {signatureUrl && (
                    /* eslint-disable-next-line jsx-a11y/alt-text */
                    <Image src={signatureUrl} style={styles.signatureImage} />
                  )}
                </View>
              ) : (
                <View style={styles.sigPlaceholderSpace} />
              )}

              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Authorized Signatory</Text>
              {!signatureUrl && (
                <>
                  <Text style={styles.sigDetails}>Name: __________________________</Text>
                  <Text style={styles.sigDetails}>Date: __________________________</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Page numbering fixed at bottom right */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
