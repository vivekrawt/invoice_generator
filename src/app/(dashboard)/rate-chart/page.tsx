"use client";

import * as React from "react";
import {
  TableProperties,
  Plus,
  Trash2,
  Printer,
  Save,
  RotateCcw,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Building2,
  Package,
  Layers,
  Search,
  Download,
  Loader2,
  ChevronRight,
  CloudUpload,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pdf } from "@react-pdf/renderer";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { BROCHURE_PRODUCTS, PRODUCT_CATEGORIES } from "@/lib/constants/products-seed";
import { HARDCODED_BUSINESS_PROFILE } from "@/lib/constants/business-defaults";
import type { Customer, RateChart, RateChartItem, BusinessProfile } from "@/types/database.types";
import {
  RateChartPDFDocument,
  formatRateDisplay,
} from "@/components/rate-chart/rate-chart-pdf-document";

const DEFAULT_TERMS = `1. Rates are net and exclusive of GST (GST extra as applicable).
2. Prices are valid for 30 days from the chart issue date.
3. Standard delivery within 3 business days of confirmed Purchase Order.
4. Custom branding, printing, and specific mic/width tolerances available on request.`;

const UNIT_OPTIONS = [
  { value: "Pc", label: "Per Piece (/ Pc)" },
  { value: "Roll", label: "Per Roll (/ Roll)" },
  { value: "Pack", label: "Per Pack (/ Pack)" },
  { value: "Box", label: "Per Box (/ Box)" },
  { value: "Sheet", label: "Per Sheet (/ Sheet)" },
  { value: "Ream", label: "Per Ream (/ Ream)" },
  { value: "Bundle", label: "Per Bundle (/ Bundle)" },
  { value: "Kg", label: "Per Kg (/ Kg)" },
  { value: "Meter", label: "Per Meter (/ Meter)" },
  { value: "Set", label: "Per Set (/ Set)" },
  { value: "Pair", label: "Per Pair (/ Pair)" },
  { value: "CUSTOM", label: "Custom Unit..." },
] as const;

export default function RateChartPage() {
  // Rate chart meta
  const [chartId, setChartId] = React.useState<string | null>(null);
  const [orgName, setOrgName] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [chartDate, setChartDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState(DEFAULT_TERMS);

  // Items in active rate chart
  const [items, setItems] = React.useState<RateChartItem[]>([]);

  // Item builder state
  const [selectedCategory, setSelectedCategory] = React.useState<string>(PRODUCT_CATEGORIES[1] || "PACKAGING TAPES");
  const [selectedProduct, setSelectedProduct] = React.useState("Transparent Tapes");
  const [isCustomProduct, setIsCustomProduct] = React.useState(false);
  const [customProductName, setCustomProductName] = React.useState("");
  const [specification, setSpecification] = React.useState("");

  // Rate + Unit Selector
  const [rateAmount, setRateAmount] = React.useState("");
  const [rateUnit, setRateUnit] = React.useState<string>("Roll");
  const [customUnitText, setCustomUnitText] = React.useState("");

  // Optional Secondary Rate (e.g. Piece + Roll)
  const [showSecondaryRate, setShowSecondaryRate] = React.useState(false);
  const [secondaryAmount, setSecondaryAmount] = React.useState("");
  const [secondaryUnit, setSecondaryUnit] = React.useState<string>("Pc");
  const [secondaryCustomUnitText, setSecondaryCustomUnitText] = React.useState("");

  // Customers for quick selection
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [businessProfile, setBusinessProfile] = React.useState<BusinessProfile>(
    HARDCODED_BUSINESS_PROFILE as unknown as BusinessProfile
  );

  // Saved rate charts state
  const [savedCharts, setSavedCharts] = React.useState<RateChart[]>([]);
  const [savedDialogOpen, setSavedDialogOpen] = React.useState(false);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);

  // Status & feedback
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [uploadingToDrive, setUploadingToDrive] = React.useState(false);
  const [driveBackupUrl, setDriveBackupUrl] = React.useState<string | null>(null);
  const [driveNotice, setDriveNotice] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [filterSearch, setFilterSearch] = React.useState("");

  // Load customers and existing rate charts on mount
  React.useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);

        // Hydrate business profile from local cache or API
        try {
          const cachedProfile = typeof window !== "undefined" ? localStorage.getItem("abira_business_profile") : null;
          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile);
            setBusinessProfile((prev) => ({
              ...(HARDCODED_BUSINESS_PROFILE as unknown as BusinessProfile),
              ...parsed,
              business_name: HARDCODED_BUSINESS_PROFILE.business_name,
              address: HARDCODED_BUSINESS_PROFILE.address,
              phone: HARDCODED_BUSINESS_PROFILE.phone,
              bank_name: HARDCODED_BUSINESS_PROFILE.bank_name,
              account_number: HARDCODED_BUSINESS_PROFILE.account_number,
              ifsc: HARDCODED_BUSINESS_PROFILE.ifsc,
              bank_account_name: HARDCODED_BUSINESS_PROFILE.bank_account_name,
              stamp_url: HARDCODED_BUSINESS_PROFILE.stamp_url || parsed?.stamp_url || prev?.stamp_url || null,
              signature_url: HARDCODED_BUSINESS_PROFILE.signature_url || parsed?.signature_url || prev?.signature_url || null,
              payment_qr_url: HARDCODED_BUSINESS_PROFILE.payment_qr_url || parsed?.payment_qr_url || prev?.payment_qr_url || null,
            }));
          }
        } catch {}

        const [custRes, chartsRes, profRes] = await Promise.allSettled([
          apiRequest<Customer[]>("/api/data/customers"),
          apiRequest<RateChart[]>("/api/data/rate-charts"),
          apiRequest<BusinessProfile>("/api/data/business-profile"),
        ]);

        if (!active) return;

        if (custRes.status === "fulfilled" && Array.isArray(custRes.value)) {
          setCustomers(custRes.value);
        }
        if (chartsRes.status === "fulfilled" && Array.isArray(chartsRes.value)) {
          setSavedCharts(chartsRes.value);
        }
        if (profRes.status === "fulfilled" && profRes.value) {
          setBusinessProfile((prev) => ({
            ...(HARDCODED_BUSINESS_PROFILE as unknown as BusinessProfile),
            ...profRes.value,
            business_name: HARDCODED_BUSINESS_PROFILE.business_name,
            address: HARDCODED_BUSINESS_PROFILE.address,
            phone: HARDCODED_BUSINESS_PROFILE.phone,
            bank_name: HARDCODED_BUSINESS_PROFILE.bank_name,
            account_number: HARDCODED_BUSINESS_PROFILE.account_number,
            ifsc: HARDCODED_BUSINESS_PROFILE.ifsc,
            bank_account_name: HARDCODED_BUSINESS_PROFILE.bank_account_name,
            stamp_url: HARDCODED_BUSINESS_PROFILE.stamp_url || profRes.value.stamp_url || prev?.stamp_url || null,
            signature_url: HARDCODED_BUSINESS_PROFILE.signature_url || profRes.value.signature_url || prev?.signature_url || null,
            payment_qr_url: HARDCODED_BUSINESS_PROFILE.payment_qr_url || profRes.value.payment_qr_url || prev?.payment_qr_url || null,
          }));
        }
      } catch (e) {
        console.warn("Failed loading rate chart initial data:", e);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => { active = false; };
  }, []);

  // Filter products by selected category
  const filteredProducts = React.useMemo(() => {
    return BROCHURE_PRODUCTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const firstProduct = BROCHURE_PRODUCTS.find((p) => p.category === category);
    if (firstProduct) {
      setSelectedProduct(firstProduct.product_name);
      setIsCustomProduct(false);
      // Smart default unit based on category
      if (category === "PACKAGING TAPES") {
        setRateUnit("Roll");
      } else if (category === "COMPREHENSIVE PACKAGING SOLUTIONS") {
        setRateUnit("Box");
      } else if (category === "LABELS & STICKERS") {
        setRateUnit("Sheet");
      } else {
        setRateUnit("Pc");
      }
    } else {
      setIsCustomProduct(true);
      setSelectedProduct("");
    }
  };

  // Quick select customer to fill org details
  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    setOrgName(cust.customer_name);
    setContactPerson(cust.contact_person || "");
    setPhone(cust.phone || "");
  };

  // Add item to active chart
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const productName = isCustomProduct ? customProductName.trim() : selectedProduct.trim();
    if (!productName) {
      setMessage({ text: "Please enter or select a product name.", type: "error" });
      return;
    }

    const numRate = parseFloat(rateAmount);
    if (isNaN(numRate) || numRate < 0) {
      setMessage({
        text: "Please enter a valid rate amount (e.g. 37).",
        type: "error",
      });
      return;
    }

    const finalUnit = rateUnit === "CUSTOM" ? customUnitText.trim() || "Unit" : rateUnit;

    let secRate: number | null = null;
    let secUnit: string | null = null;
    if (showSecondaryRate && secondaryAmount) {
      const numSec = parseFloat(secondaryAmount);
      if (!isNaN(numSec) && numSec >= 0) {
        secRate = numSec;
        secUnit = secondaryUnit === "CUSTOM" ? secondaryCustomUnitText.trim() || "Unit" : secondaryUnit;
      }
    }

    // Set legacy fields for backwards compatibility
    let ratePerPiece: number | null = null;
    let ratePerRoll: number | null = null;
    if (finalUnit.toLowerCase() === "pc" || finalUnit.toLowerCase() === "piece") {
      ratePerPiece = numRate;
    } else if (finalUnit.toLowerCase() === "roll") {
      ratePerRoll = numRate;
    }
    if (secUnit) {
      if (secUnit.toLowerCase() === "pc" || secUnit.toLowerCase() === "piece") {
        ratePerPiece = secRate;
      } else if (secUnit.toLowerCase() === "roll") {
        ratePerRoll = secRate;
      }
    }

    const newItem: RateChartItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: selectedCategory,
      product_name: productName,
      specification: specification.trim() || null,
      rate: numRate,
      unit: finalUnit,
      secondary_rate: secRate,
      secondary_unit: secUnit,
      rate_per_piece: ratePerPiece,
      rate_per_roll: ratePerRoll,
    };

    setItems((prev) => [...prev, newItem]);

    // Reset inputs
    setSpecification("");
    setRateAmount("");
    setSecondaryAmount("");
    setShowSecondaryRate(false);
    if (isCustomProduct) {
      setCustomProductName("");
      setIsCustomProduct(false);
    }

    setMessage({ text: `Added "${productName}" (${formatRateDisplay(newItem)}) to rate chart.`, type: "success" });
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Reset form / New Chart
  const handleNewChart = () => {
    setChartId(null);
    setOrgName("");
    setContactPerson("");
    setPhone("");
    setChartDate(new Date().toISOString().split("T")[0]);
    setNotes(DEFAULT_TERMS);
    setItems([]);
    setMessage(null);
  };

  // Save chart
  const handleSaveChart = async () => {
    if (!orgName.trim()) {
      setMessage({ text: "Organization Name is required to save a rate chart.", type: "error" });
      return;
    }
    if (items.length === 0) {
      setMessage({ text: "Please add at least one product to the rate chart before saving.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        id: chartId || undefined,
        organization_name: orgName.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        chart_date: chartDate,
        notes: notes.trim() || null,
        items,
      };

      const url = chartId ? `/api/data/rate-charts/${chartId}` : "/api/data/rate-charts";
      const method = chartId ? "PUT" : "POST";

      const saved = await apiRequest<RateChart>(url, {
        method,
        body: jsonBody(payload),
      });

      setChartId(saved.id);
      setSavedCharts((prev) => {
        const next = prev.filter((c) => c.id !== saved.id);
        return [saved, ...next];
      });

      setMessage({ text: `Rate chart for "${orgName}" saved successfully!`, type: "success" });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to save rate chart.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Load a saved chart
  const handleLoadChart = (chart: RateChart) => {
    setChartId(chart.id);
    setOrgName(chart.organization_name);
    setContactPerson(chart.contact_person || "");
    setPhone(chart.phone || "");
    setChartDate(chart.chart_date || new Date().toISOString().split("T")[0]);
    setNotes(chart.notes || DEFAULT_TERMS);
    setItems(chart.items || []);
    setSavedDialogOpen(false);
    setMessage({ text: `Loaded rate chart for "${chart.organization_name}".`, type: "success" });
  };

  // Delete saved chart
  const handleDeleteChart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved rate chart?")) return;

    try {
      await apiRequest(`/api/data/rate-charts/${id}`, { method: "DELETE" });
      setSavedCharts((prev) => prev.filter((c) => c.id !== id));
      if (chartId === id) handleNewChart();
      setMessage({ text: "Rate chart deleted.", type: "success" });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not delete rate chart.");
    }
  };

  // Filtered items in table
  const displayedItems = React.useMemo(() => {
    if (!filterSearch.trim()) return items;
    const q = filterSearch.toLowerCase();
    return items.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        (it.specification && it.specification.toLowerCase().includes(q))
    );
  }, [items, filterSearch]);

  // Download PDF file directly named "Abira enterprise rate chart.pdf"
  const handleDownloadPdf = async () => {
    if (items.length === 0) {
      alert("Please add at least one product before downloading the PDF.");
      return;
    }
    try {
      setDownloadingPdf(true);
      const activeChart: RateChart = {
        id: chartId || "draft",
        organization_name: orgName.trim() || "Client Organization",
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        chart_date: chartDate,
        notes: notes.trim() || null,
        items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const doc = <RateChartPDFDocument chart={activeChart} profile={businessProfile} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);

      const safeOrg = orgName.trim() ? ` - ${orgName.trim().replace(/[\/\\]/g, "_")}` : "";
      const filename = `Abira enterprise rate chart${safeOrg}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Manual backup of rate chart PDF directly to Google Drive
  const handleBackupToDrive = async () => {
    if (items.length === 0) {
      alert("Please add at least one product before saving to Google Drive.");
      return;
    }
    try {
      setUploadingToDrive(true);
      setDriveNotice(null);

      const activeChart: RateChart = {
        id: chartId || "draft",
        organization_name: orgName.trim() || "Client Organization",
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        chart_date: chartDate,
        notes: notes.trim() || null,
        items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const doc = <RateChartPDFDocument chart={activeChart} profile={businessProfile} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl ? dataUrl.split(",")[1] || "" : "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const localWebhook = typeof window !== "undefined" ? localStorage.getItem("abira_drive_webhook_url") || undefined : undefined;

      const res = await apiRequest<{ success: boolean; webViewLink?: string; error?: string }>("/api/drive/upload", {
        method: "POST",
        body: jsonBody({
          type: "rate-chart",
          orgName: orgName.trim() || "Client Organization",
          pdfBase64,
          webhookUrl: localWebhook,
        }),
      });

      if (res?.success && res?.webViewLink) {
        setDriveBackupUrl(res.webViewLink);
        setDriveNotice({ text: "Rate chart saved to Google Drive successfully!", type: "success" });
        setTimeout(() => setDriveNotice(null), 6000);
      } else {
        throw new Error(res?.error || "Google Drive upload failed.");
      }
    } catch (err) {
      console.error("Rate chart drive backup error:", err);
      setDriveNotice({
        text: err instanceof Error ? err.message : "Could not backup to Google Drive.",
        type: "error",
      });
    } finally {
      setUploadingToDrive(false);
    }
  };

  // Print with document.title set to "Abira enterprise rate chart"
  const handlePrint = () => {
    const prevTitle = document.title;
    const safeOrg = orgName.trim() ? ` - ${orgName.trim()}` : "";
    document.title = `Abira enterprise rate chart${safeOrg}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Print-only CSS styling */}
      <style jsx global>{`
        @media print {
          nav, aside, header, .no-print, [role="navigation"] {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0b1f3a] flex items-center gap-2">
              <TableProperties className="h-6 w-6 text-blue-600" />
              Rate Chart Generator
            </h1>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              ABIRA Price Quotation
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create, manage, and download organization-specific product rate charts with custom unit rates (Roll, Piece, Pack, Box, Sheet, etc.).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNewChart}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Chart
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSavedDialogOpen(true)}
            className="text-xs gap-1.5"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
            Saved Charts ({savedCharts.length})
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || items.length === 0}
            className="text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            title="Download PDF as 'Abira enterprise rate chart.pdf'"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>

          {driveBackupUrl ? (
            <a
              href={driveBackupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
              title="Open rate chart in Google Drive"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in Google Drive
            </a>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackupToDrive}
              disabled={uploadingToDrive || items.length === 0}
              className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
              title="Save this rate chart directly to Google Drive"
            >
              {uploadingToDrive ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Backing up...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>Save to Google Drive</span>
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPrintModalOpen(true)}
            disabled={items.length === 0}
            className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Preview Sheet
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveChart}
            disabled={saving || items.length === 0 || !orgName.trim()}
            className="bg-[#0b1f3a] hover:bg-[#132f57] text-white text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : chartId ? "Update Chart" : "Save Rate Chart"}
          </Button>
        </div>
      </div>

      {/* Drive notice banner */}
      {driveNotice && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between no-print ${
            driveNotice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {driveNotice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span>{driveNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setDriveNotice(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Feedback banner */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between no-print ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Organization & Add Item */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Organization / Client Profile */}
        <Card className="lg:col-span-5 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Target Organization Details
              </CardTitle>
              {customers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
                    onChange={(e) => {
                      if (e.target.value) handleSelectCustomer(e.target.value);
                      e.target.value = "";
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Pick existing customer...
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <CardDescription className="text-xs">
              Specify the client organization or company for this rate quotation.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            <div>
              <Label className="text-xs font-medium text-slate-700">
                Organization / Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Acme Logistics Pvt. Ltd."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700">Contact Person</Label>
                <Input
                  placeholder="e.g. Rajesh Kumar"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Phone / Mobile</Label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700">Rate Chart Date</Label>
                <Input
                  type="date"
                  value={chartDate}
                  onChange={(e) => setChartDate(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Status</Label>
                <div className="mt-1 flex items-center h-9 px-3 border rounded-md bg-slate-50 text-xs text-slate-700 font-medium">
                  {chartId ? (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Saved Rate Chart
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span> Unsaved Draft
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Terms &amp; Notes</Label>
              <Textarea
                rows={3}
                placeholder="Validity, delivery timeline, payment terms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Product Item Card */}
        <Card className="lg:col-span-7 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Add Product to Rate Chart
            </CardTitle>
            <CardDescription className="text-xs">
              Select product (e.g. Transparent Tape, A4 Sheet), enter rate amount, and select unit from dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Category Picker */}
              <div>
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  Product Category
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`text-[11px] font-medium p-2 rounded-md border text-left transition-all ${
                        selectedCategory === cat
                          ? "border-blue-600 bg-blue-50/80 text-blue-900 font-semibold shadow-xs"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-700">Product Name</Label>
                    <button
                      type="button"
                      onClick={() => setIsCustomProduct(!isCustomProduct)}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      {isCustomProduct ? "Pick from catalog" : "+ Custom product"}
                    </button>
                  </div>

                  {isCustomProduct ? (
                    <Input
                      placeholder="e.g. Transparent Tapes - Heavy Duty"
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  ) : (
                    <select
                      className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                    >
                      {filteredProducts.map((p) => (
                        <option key={p.product_name} value={p.product_name}>
                          {p.product_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Size / Specification (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. 48mm x 65m, 40 Micron or 75 GSM"
                    value={specification}
                    onChange={(e) => setSpecification(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Primary Rate & Unit Dropdown */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    Product Rate &amp; Unit Basis
                  </div>
                  {!showSecondaryRate && (
                    <button
                      type="button"
                      onClick={() => setShowSecondaryRate(true)}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      + Add secondary rate (optional)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Amount */}
                  <div className="sm:col-span-6">
                    <Label className="text-xs font-medium text-slate-700">
                      Amount / Rate (₹) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 37.00"
                        value={rateAmount}
                        onChange={(e) => setRateAmount(e.target.value)}
                        className="h-9 pl-7 text-sm font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Unit Dropdown */}
                  <div className={rateUnit === "CUSTOM" ? "sm:col-span-3" : "sm:col-span-6"}>
                    <Label className="text-xs font-medium text-slate-700">
                      Rate Unit (Dropdown)
                    </Label>
                    <select
                      className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                      value={rateUnit}
                      onChange={(e) => setRateUnit(e.target.value)}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Unit Input if selected */}
                  {rateUnit === "CUSTOM" && (
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-medium text-slate-700">Custom Unit</Label>
                      <Input
                        placeholder="e.g. Pkt of 6"
                        value={customUnitText}
                        onChange={(e) => setCustomUnitText(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Secondary Rate (Optional) */}
                {showSecondaryRate && (
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Secondary Rate (Optional, e.g. Pack / Carton rate):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondaryRate(false);
                          setSecondaryAmount("");
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove secondary rate
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6">
                        <Label className="text-xs font-medium text-slate-700">Amount (₹)</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 210.00"
                            value={secondaryAmount}
                            onChange={(e) => setSecondaryAmount(e.target.value)}
                            className="h-9 pl-7 text-sm font-semibold text-slate-900"
                          />
                        </div>
                      </div>

                      <div className={secondaryUnit === "CUSTOM" ? "sm:col-span-3" : "sm:col-span-6"}>
                        <Label className="text-xs font-medium text-slate-700">Unit</Label>
                        <select
                          className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                          value={secondaryUnit}
                          onChange={(e) => setSecondaryUnit(e.target.value)}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {secondaryUnit === "CUSTOM" && (
                        <div className="sm:col-span-3">
                          <Label className="text-xs font-medium text-slate-700">Custom Unit</Label>
                          <Input
                            placeholder="e.g. Box"
                            value={secondaryCustomUnitText}
                            onChange={(e) => setSecondaryCustomUnitText(e.target.value)}
                            className="mt-1 h-9 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 px-4"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to Rate Chart
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Rate Chart Table Card */}
      <Card className="border-slate-200 shadow-sm no-print">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">
                Current Rate Chart Items
              </CardTitle>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                {items.length} {items.length === 1 ? "Product" : "Products"}
              </Badge>
              {orgName && (
                <span className="text-xs text-slate-500">
                  for <span className="font-semibold text-slate-700">{orgName}</span>
                </span>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">
              Review and finalize product rates before printing or saving.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayedItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <TableProperties className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No items added to this rate chart yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select a category above, pick a product (e.g. Transparent Tape or A4 Sheet), enter the rate, select the unit dropdown (e.g. Roll or Piece), and click &ldquo;Add to Rate Chart&rdquo;.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 text-[11px] font-semibold text-slate-600">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead className="text-right">Rate / Unit</TableHead>
                  <TableHead className="w-16 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedItems.map((item, idx) => (
                  <TableRow key={item.id} className="text-xs hover:bg-slate-50/80">
                    <TableCell className="text-center font-medium text-slate-400">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {item.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal py-0">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {item.specification || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="text-blue-900 font-bold bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {formatRateDisplay(item)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        title="Remove product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Saved Rate Charts Dialog */}
      <Dialog open={savedDialogOpen} onOpenChange={setSavedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FolderOpen className="h-5 w-5 text-amber-600" />
              Saved Organization Rate Charts
            </DialogTitle>
            <DialogDescription className="text-xs">
              Load an existing rate chart to edit or export it.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2">
            {savedCharts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No saved rate charts found. Create and save your first chart!
              </p>
            ) : (
              savedCharts.map((chart) => (
                <div
                  key={chart.id}
                  onClick={() => handleLoadChart(chart)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-all"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                      {chart.organization_name}
                      <Badge variant="outline" className="text-[10px]">
                        {chart.items?.length || 0} items
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Date: {chart.chart_date}</span>
                      {chart.contact_person && <span>Contact: {chart.contact_person}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteChart(chart.id, e)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSavedDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print View Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center justify-between">
              <span>Rate Sheet Preview</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-[#0b1f3a] text-white text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Rate Sheet (A4)
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Printable Layout Container */}
          <div className="bg-white p-6 border rounded-md text-slate-900 font-sans print:border-none print:p-0">
            {/* Header: ABIRA Enterprises branding */}
            <div className="border-b-2 border-[#0b1f3a] pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0b1f3a]">
                  {businessProfile?.business_name || "ABIRA Enterprises"}
                </h2>
                <p className="text-xs text-slate-600 max-w-md mt-0.5">
                  {businessProfile?.address ||
                    "Millenia 2, Sector 37D, Gurugram, Haryana – 122001"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Phone: <span className="font-semibold text-slate-800">{businessProfile?.phone || "8882511472"}</span>
                  {businessProfile?.email && <span> | Email: {businessProfile.email}</span>}
                  {businessProfile?.pan && <span> | PAN: {businessProfile.pan}</span>}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block bg-[#0b1f3a] text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded">
                  OFFICIAL RATE CHART
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Date: <span className="font-semibold text-slate-800">{chartDate}</span>
                </p>
              </div>
            </div>

            {/* Target Organization box */}
            <div className="my-4 p-3 bg-slate-50 border rounded-md flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  Quotations Prepared For:
                </span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {orgName || "Valued Client Organization"}
                </div>
                {contactPerson && (
                  <div className="text-slate-600">Attn: {contactPerson}</div>
                )}
              </div>
              {phone && (
                <div className="text-right text-slate-600">
                  <div>Contact: {phone}</div>
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="border rounded-md overflow-hidden my-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0b1f3a] text-white font-semibold">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">Product Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Specification</th>
                    <th className="p-2 text-right">Rate / Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => (
                    <tr key={it.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="p-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-2 font-semibold text-slate-800">{it.product_name}</td>
                      <td className="p-2 text-slate-600">{it.category}</td>
                      <td className="p-2 text-slate-600">{it.specification || "Standard"}</td>
                      <td className="p-2 text-right font-bold text-blue-900">
                        {formatRateDisplay(it)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Terms and Signatory */}
            <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t items-end text-xs">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Standard Terms &amp; Conditions</h4>
                <p className="text-slate-600 whitespace-pre-line text-[11px] leading-relaxed">
                  {notes || DEFAULT_TERMS}
                </p>
              </div>

              <div className="flex flex-col items-end text-right">
                <div className="font-bold text-slate-800">For ABIRA Enterprises</div>
                <div className="h-14 w-40 relative my-1 flex items-center justify-center">
                  {businessProfile?.stamp_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={businessProfile.stamp_url}
                      alt="Company Stamp"
                      className="absolute max-h-12 max-w-12 opacity-80 object-contain left-2"
                    />
                  )}
                  {businessProfile?.signature_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={businessProfile.signature_url}
                      alt="Authorized Signature"
                      className="absolute max-h-12 max-w-28 object-contain right-2"
                    />
                  )}
                </div>
                <div className="border-t border-slate-400 w-44 pt-1 text-[11px] font-medium text-slate-700">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
