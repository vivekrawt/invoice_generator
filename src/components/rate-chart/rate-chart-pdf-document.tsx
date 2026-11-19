import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { RateChart, RateChartItem, BusinessProfile } from "@/types/database.types";

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
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerLeft: {
    width: "60%",
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
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.35,
  },
  businessHighlight: {
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
  },
  headerRight: {
    width: "38%",
    alignItems: "flex-end",
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    backgroundColor: NAVY,
    color: "#ffffff",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  metaText: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
  },

  // ORGANIZATION BOX
  orgBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BG_LIGHT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  orgLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  orgName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  orgContact: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // TABLE
  tableContainer: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  thText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderTopColor: BORDER_COLOR,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#ffffff",
  },
  tableRowOdd: {
    backgroundColor: "#fcfdfe",
  },
  tdIndex: {
    width: "6%",
    fontSize: 8,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  tdProduct: {
    width: "32%",
    paddingRight: 6,
  },
  productName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MAIN,
  },
  tdCategory: {
    width: "22%",
    paddingRight: 6,
    fontSize: 7.5,
    color: TEXT_MUTED,
  },
  tdSpec: {
    width: "20%",
    paddingRight: 6,
    fontSize: 8,
    color: TEXT_MAIN,
  },
  tdRate: {
    width: "20%",
    textAlign: "right",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },

  // TERMS & SIGNATURE
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  termsBox: {
    width: "55%",
    paddingRight: 12,
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
  signatureBox: {
    width: "42%",
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
    height: 52,
    width: 140,
    position: "relative",
    marginBottom: 2,
  },
  stampImage: {
    position: "absolute",
    left: 10,
    top: 2,
    width: 50,
    height: 50,
    objectFit: "contain",
    opacity: 0.85,
  },
  signatureImage: {
    position: "absolute",
    left: 28,
    top: 10,
    width: 90,
    height: 36,
    objectFit: "contain",
  },
  sigPlaceholderSpace: {
    height: 28,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    width: "100%",
    marginBottom: 3,
  },
  sigLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },

  pageNumber: {
    position: "absolute",
    fontSize: 7.5,
    bottom: 16,
    right: 36,
    textAlign: "right",
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

export function formatRateDisplay(item: RateChartItem): string {
  // 1. If explicit rate & unit are provided
  if (item.rate !== null && item.rate !== undefined) {
    const unitLabel = item.unit ? ` / ${item.unit}` : "";
    let res = `₹${Number(item.rate).toFixed(2)}${unitLabel}`;
    if (item.secondary_rate !== null && item.secondary_rate !== undefined) {
      const secUnit = item.secondary_unit ? ` / ${item.secondary_unit}` : "";
      res += `  •  ₹${Number(item.secondary_rate).toFixed(2)}${secUnit}`;
    }
    return res;
  }

  // 2. Legacy fallback
  const parts: string[] = [];
  if (item.rate_per_piece !== null && item.rate_per_piece !== undefined) {
    parts.push(`₹${Number(item.rate_per_piece).toFixed(2)} / Pc`);
  }
  if (item.rate_per_roll !== null && item.rate_per_roll !== undefined) {
    parts.push(`₹${Number(item.rate_per_roll).toFixed(2)} / Roll`);
  }
  if (item.custom_rate !== null && item.custom_rate !== undefined) {
    parts.push(`₹${Number(item.custom_rate).toFixed(2)}${item.custom_unit ? ` / ${item.custom_unit}` : ""}`);
  }
  return parts.length > 0 ? parts.join("  •  ") : "—";
}

interface RateChartPDFDocumentProps {
  chart: RateChart;
  profile: BusinessProfile | null;
}

export function RateChartPDFDocument({ chart, profile }: RateChartPDFDocumentProps) {
  const businessName = profile?.business_name || "ABIRA Enterprises";
  const address = profile?.address || "Millenia 2, Sector 37D, Gurugram, Haryana – 122001";
  const phone = profile?.phone || "8882511472";
  const email = profile?.email;
  const pan = profile?.pan;

  const stampUrl = resolvePdfImageUrl(profile?.stamp_url);
  const signatureUrl = resolvePdfImageUrl(profile?.signature_url);

  return (
    <Document
      title={`Abira enterprise rate chart${chart.organization_name ? ` - ${chart.organization_name}` : ""}`}
      author="ABIRA Enterprises"
      subject="Official Rate Chart"
    >
      <Page size="A4" style={styles.page}>
        {/* ==================== 1. TOP HEADER ==================== */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.businessName}>{businessName}</Text>
            <Text style={styles.businessMeta}>{address}</Text>
            <Text style={styles.businessMeta}>
              Phone: <Text style={styles.businessHighlight}>{phone}</Text>
              {email && ` | Email: ${email}`}
            </Text>
            {pan && (
              <Text style={styles.businessMeta}>
                PAN: <Text style={styles.businessHighlight}>{pan}</Text>
              </Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.chartTitle}>Rate Chart</Text>
            <Text style={styles.badgeText}>Official Quotation</Text>
            <Text style={styles.metaText}>
              Date: <Text style={styles.metaValue}>{chart.chart_date}</Text>
            </Text>
          </View>
        </View>

        {/* ==================== 2. TARGET ORGANIZATION ==================== */}
        <View style={styles.orgBox}>
          <View>
            <Text style={styles.orgLabel}>Prepared For Organization:</Text>
            <Text style={styles.orgName}>{chart.organization_name || "Valued Client Organization"}</Text>
            {chart.contact_person && (
              <Text style={styles.orgContact}>Attn: {chart.contact_person}</Text>
            )}
          </View>
          {chart.phone && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.orgLabel}>Contact Phone:</Text>
              <Text style={styles.businessHighlight}>{chart.phone}</Text>
            </View>
          )}
        </View>

        {/* ==================== 3. PRODUCTS TABLE ==================== */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.tdIndex]}>#</Text>
            <Text style={[styles.thText, styles.tdProduct]}>Product Name</Text>
            <Text style={[styles.thText, styles.tdCategory]}>Category</Text>
            <Text style={[styles.thText, styles.tdSpec]}>Specification</Text>
            <Text style={[styles.thText, styles.tdRate]}>Rate / Unit</Text>
          </View>

          {chart.items.map((item, idx) => (
            <View
              key={item.id || idx}
              style={[
                styles.tableRow,
                idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              ]}
              wrap={false}
            >
              <Text style={styles.tdIndex}>{idx + 1}</Text>
              <View style={styles.tdProduct}>
                <Text style={styles.productName}>{item.product_name}</Text>
              </View>
              <Text style={styles.tdCategory}>{item.category}</Text>
              <Text style={styles.tdSpec}>{item.specification || "Standard"}</Text>
              <Text style={styles.tdRate}>{formatRateDisplay(item)}</Text>
            </View>
          ))}
        </View>

        {/* ==================== 4. TERMS & SIGNATURE ==================== */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>Terms &amp; Conditions</Text>
            <Text style={styles.termsText}>
              {chart.notes ||
                "1. Rates are net and exclusive of GST.\n2. Prices are valid for 30 days.\n3. Standard delivery within 3 business days."}
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.sigEntity}>For {businessName}</Text>
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
            </View>
          </View>
        </View>

        {/* Page numbering */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
