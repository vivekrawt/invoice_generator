"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Search,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Truck,
  Package,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomerSelect } from "@/components/customers/customer-select";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { convertNumberToIndianWords, getIndianFinancialYear } from "@/lib/number-to-words";
import { BROCHURE_PRODUCTS, PRODUCT_CATEGORIES } from "@/lib/constants/products-seed";
import type {
  Customer,
  BusinessProfile,
  ShippingAddress,
  CustomerSnapshot,
  BusinessSnapshot,
  Invoice,
} from "@/types/database.types";
import { InvoicePDFActions } from "@/components/invoices/invoice-pdf-actions";

interface FormItem {
  id: string;
  product_id?: string | null;
  category: string;
  product_name: string;
  description: string;
  hsn_sac: string;
  quantity: number | "";
  unit: string;
  unit_price: number | "";
  line_amount: number;
}

const STANDARD_UNITS = [
  "Pcs",
  "Rolls",
  "Boxes",
  "Packs",
  "Bundles",
  "Reams",
  "Meters",
  "Sets",
  "Kg",
];

export function InvoiceForm({ invoiceId }: { invoiceId?: string }) {
  const [duplicateId, setDuplicateId] = React.useState<string | null>(null);
  const sourceInvoiceId = invoiceId || duplicateId;
  const isEditing = Boolean(invoiceId);
  const isDuplicating = Boolean(duplicateId && !invoiceId);

  // 1. Invoice Meta States
  const [invoiceDate, setInvoiceDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [serialNumber, setSerialNumber] = React.useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [recordLoading, setRecordLoading] = React.useState(true);
  const [poNumber, setPoNumber] = React.useState<string>("");
  const [poDate, setPoDate] = React.useState<string>("");

  // 2. Customer & Shipping
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [shipToDifferent, setShipToDifferent] = React.useState<boolean>(false);
  const [shippingAddress, setShippingAddress] = React.useState<ShippingAddress>({
    recipient_name: "",
    delivery_address: "",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122001",
  });

  // 3. Products / Line Items
  const [items, setItems] = React.useState<FormItem[]>([]);
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");

  // Custom Product inline add modal
  const [customModalOpen, setCustomModalOpen] = React.useState(false);
  const [customCategory, setCustomCategory] = React.useState<string>(PRODUCT_CATEGORIES[0]);
  const [customName, setCustomName] = React.useState<string>("");
  const [customDesc, setCustomDesc] = React.useState<string>("");

  // 4. Calculations & Adjustments
  const [adjustments, setAdjustments] = React.useState<number | "">("");
  const [additionalNotes, setAdditionalNotes] = React.useState<string>("");
  const [terms, setTerms] = React.useState<string>("");

  // Business Profile Snapshot
  const [businessProfile, setBusinessProfile] = React.useState<BusinessProfile | null>(null);

  // Status & Validation states
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = React.useState<Invoice | null>(null);

  // Auto FY calculation from Invoice Date
  const { financialYear, prefix } = React.useMemo(() => {
    return getIndianFinancialYear(invoiceDate);
  }, [invoiceDate]);

  const fullInvoiceNumber = React.useMemo(() => {
    const cleanedSerial = serialNumber.trim();
    return cleanedSerial ? `${prefix}${cleanedSerial}` : `${prefix}...`;
  }, [prefix, serialNumber]);

  React.useEffect(() => {
    setDuplicateId(new URLSearchParams(window.location.search).get("duplicate"));
  }, []);

  // Load snapshots for edits and copies; never replace historical details with current master data.
  React.useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        if (!active) return;

        if (sourceInvoiceId) {
          const source = await apiRequest<Invoice>(`/api/data/invoices/${sourceInvoiceId}`);
          const customer = source.customer_snapshot;
          const business = source.business_snapshot;
          if (!customer || !business || !Array.isArray(source.items)) {
            throw new Error("The saved invoice is missing required historical snapshot data.");
          }

          setInvoiceDate(isDuplicating ? new Date().toISOString().slice(0, 10) : source.invoice_date);
          setSerialNumber(isDuplicating ? "" : source.serial_number || "");
          setInvoiceNumber(source.invoice_number);
          setPoNumber(source.po_number || "");
          setPoDate(source.po_date || "");
          setSelectedCustomer({
            id: source.customer_id || `snapshot-${source.id}`,
            customer_name: customer.customer_name,
            contact_person: customer.contact_person || null,
            phone: customer.phone,
            email: customer.email || null,
            billing_address: customer.billing_address,
            city: customer.city,
            state: customer.state,
            pincode: customer.pincode,
            gstin: customer.gstin || null,
            created_at: "",
            updated_at: "",
          });
          setShipToDifferent(Boolean(source.shipping_snapshot));
          if (source.shipping_snapshot) setShippingAddress(source.shipping_snapshot);
          setItems(source.items.map((item, index) => ({
            id: item.id || `saved-${index}`,
            product_id: item.product_id || null,
            category: item.category || "",
            product_name: item.product_name,
            description: item.description || "",
            hsn_sac: item.hsn_sac || "",
            quantity: Number(item.quantity),
            unit: item.unit || "Pcs",
            unit_price: Number(item.unit_price),
            line_amount: Number(item.line_amount),
          })));
          setAdjustments(Number(source.adjustments) || "");
          setAdditionalNotes(source.additional_notes || "");
          setTerms(source.terms || "");
          setBusinessProfile({
            id: "",
            business_name: business.business_name,
            address: business.address,
            city: business.city,
            state: business.state,
            pincode: business.pincode,
            phone: business.phone,
            email: business.email || null,
            pan: business.pan || null,
            bank_account_name: business.bank_account_name || null,
            bank_name: business.bank_name || null,
            account_number: business.account_number || null,
            ifsc: business.ifsc || null,
            upi_id: business.upi_id || null,
            logo_url: business.logo_url || null,
            payment_qr_url: business.payment_qr_url || null,
            default_terms: source.terms || null,
            created_at: source.created_at,
            updated_at: source.updated_at,
          });
          return;
        }

        const businessProfileData = await apiRequest<BusinessProfile>("/api/data/business-profile");
        if (active) {
          setBusinessProfile(businessProfileData);
          if (businessProfileData.default_terms) {
            setTerms(businessProfileData.default_terms);
          }
        }
      } catch (err) {
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : "Could not load invoice data.");
        }
      } finally {
        if (active) setRecordLoading(false);
      }
    }

    setRecordLoading(true);
    void loadInitialData();
    return () => { active = false; };
  }, [sourceInvoiceId, isDuplicating]);

  // Decimal-safe calculations
  const subtotal = React.useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.line_amount) || 0), 0);
  }, [items]);

  const totalPayable = React.useMemo(() => {
    const adj = typeof adjustments === "number" ? adjustments : 0;
    const tot = subtotal + adj;
    return Math.max(0, Math.round(tot * 100) / 100);
  }, [subtotal, adjustments]);

  const amountInWords = React.useMemo(() => {
    return convertNumberToIndianWords(totalPayable);
  }, [totalPayable]);

  // Handle item changes
  const updateItem = (
    index: number,
    field: keyof FormItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      if (field === "quantity" || field === "unit_price") {
        const q = typeof target.quantity === "number" ? target.quantity : 0;
        const r = typeof target.unit_price === "number" ? target.unit_price : 0;
        target.line_amount = Math.round(q * r * 100) / 100;
      }

      copy[index] = target;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add Product from Brochure catalogue
  const selectBrochureProduct = (prod: (typeof BROCHURE_PRODUCTS)[0]) => {
    const newItem: FormItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      product_id: null,
      category: prod.category,
      product_name: prod.product_name,
      description: prod.description || "",
      hsn_sac: "",
      quantity: 1,
      unit: "Pcs",
      unit_price: "", // STRICT RULE: pricing is always entered manually!
      line_amount: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setProductPickerOpen(false);
  };

  // Add custom product
  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newItem: FormItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      product_id: null,
      category: customCategory,
      product_name: customName.trim(),
      description: customDesc.trim(),
      hsn_sac: "",
      quantity: 1,
      unit: "Pcs",
      unit_price: "", // manual
      line_amount: 0,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomName("");
    setCustomDesc("");
    setCustomModalOpen(false);
  };

  // Save Invoice & Validate
  const handleSaveInvoice = async () => {
    setErrorMessage(null);

    // 1. Validate Serial Number
    const cleanedSerial = serialNumber.trim();
    if (!isEditing && !cleanedSerial) {
      setErrorMessage("Please enter an invoice serial number (e.g. 001).");
      return;
    }
    if (isEditing && !invoiceNumber.trim()) {
      setErrorMessage("Please enter a valid invoice number.");
      return;
    }

    if (!businessProfile) {
      setErrorMessage("Business settings could not be loaded. Please reload and try again.");
      return;
    }

    // 2. Validate Customer
    if (!selectedCustomer) {
      setErrorMessage("Please select or add a customer to bill to.");
      return;
    }

    // 3. Validate Line Items
    if (items.length === 0) {
      setErrorMessage("Please add at least one product row to the invoice.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_name.trim()) {
        setErrorMessage(`Item #${i + 1} is missing a product name.`);
        return;
      }
      if (typeof it.quantity !== "number" || !Number.isFinite(it.quantity) || it.quantity <= 0) {
        setErrorMessage(`Item #${i + 1} (${it.product_name}) must have a positive quantity greater than 0.`);
        return;
      }
      if (Math.round(it.quantity * 100) / 100 !== it.quantity) {
        setErrorMessage(`Item #${i + 1} quantity must have no more than two decimal places.`);
        return;
      }
      if (typeof it.unit_price !== "number" || !Number.isFinite(it.unit_price) || it.unit_price < 0) {
        setErrorMessage(`Item #${i + 1} (${it.product_name}) must have a valid non-negative unit rate.`);
        return;
      }
      if (Math.round(it.unit_price * 100) / 100 !== it.unit_price) {
        setErrorMessage(`Item #${i + 1} unit rate must have no more than two decimal places.`);
        return;
      }
      if (!Number.isFinite(it.line_amount)) {
        setErrorMessage(`Item #${i + 1} amount is too large to calculate.`);
        return;
      }
    }

    if (subtotal + (typeof adjustments === "number" ? adjustments : 0) < 0) {
      setErrorMessage("Adjustments cannot reduce the invoice total below zero.");
      return;
    }

    if (shipToDifferent && (!shippingAddress.recipient_name.trim() || !shippingAddress.delivery_address.trim())) {
      setErrorMessage("Enter a recipient name and delivery address for separate shipping.");
      return;
    }

    const finalInvoiceNumber = isEditing ? invoiceNumber.trim() : `${prefix}${cleanedSerial}`;
    const parsedInvoiceNumber = finalInvoiceNumber.match(/^ABR\/(\d{4}-\d{2})\/(.+)$/);
    if (!parsedInvoiceNumber) {
      setErrorMessage("Invoice number must use the format ABR/YYYY-YY/serial.");
      return;
    }
    try {
      setSaving(true);

      // 5. Construct Immutable Snapshots
      const customerSnapshot: CustomerSnapshot = {
        customer_id: selectedCustomer.id.startsWith("snapshot-") ? null : selectedCustomer.id,
        customer_name: selectedCustomer.customer_name,
        contact_person: selectedCustomer.contact_person,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email,
        billing_address: selectedCustomer.billing_address,
        city: selectedCustomer.city,
        state: selectedCustomer.state,
        pincode: selectedCustomer.pincode,
        gstin: selectedCustomer.gstin,
      };

      const businessSnapshot: BusinessSnapshot = {
        business_name: businessProfile.business_name,
        address: businessProfile.address,
        city: businessProfile.city,
        state: businessProfile.state,
        pincode: businessProfile.pincode,
        phone: businessProfile.phone,
        email: businessProfile?.email || null,
        pan: businessProfile?.pan || null,
        bank_account_name: businessProfile?.bank_account_name || null,
        bank_name: businessProfile?.bank_name || null,
        account_number: businessProfile?.account_number || null,
        ifsc: businessProfile?.ifsc || null,
        upi_id: businessProfile?.upi_id || null,
        logo_url: businessProfile?.logo_url || null,
        payment_qr_url: businessProfile?.payment_qr_url || null,
      };

      const finalShippingSnapshot = shipToDifferent ? shippingAddress : null;
      const finalAdjustments = typeof adjustments === "number" ? adjustments : 0;

      // 6. Save the invoice and items atomically through Supabase.
      const invoicePayload = {
        invoice_number: finalInvoiceNumber,
        financial_year: parsedInvoiceNumber[1],
        serial_number: parsedInvoiceNumber[2],
        invoice_date: invoiceDate,
        po_number: poNumber.trim() || null,
        po_date: poDate || null,
        customer_id:
          selectedCustomer.id.startsWith("cust-") ||
          selectedCustomer.id.startsWith("local-") ||
          selectedCustomer.id.startsWith("snapshot-")
            ? null
            : selectedCustomer.id,
        customer_name: selectedCustomer.customer_name,
        customer_phone: selectedCustomer.phone,
        customer_email: selectedCustomer.email || null,
        customer_address: selectedCustomer.billing_address,
        customer_city: selectedCustomer.city,
        customer_state: selectedCustomer.state,
        customer_pincode: selectedCustomer.pincode,
        customer_gstin: selectedCustomer.gstin || null,
        customer_snapshot: customerSnapshot,
        shipping_snapshot: finalShippingSnapshot,
        business_snapshot: businessSnapshot,
        subtotal: subtotal,
        adjustments: finalAdjustments,
        tax_amount: finalAdjustments,
        total_amount: totalPayable,
        amount_in_words: amountInWords,
        terms: terms.trim() || null,
        additional_notes: additionalNotes.trim() || null,
      };

      const itemsPayload = items.map((it) => ({
        product_id: it.product_id || null,
        category: it.category || null,
        product_name: it.product_name,
        description: it.description || null,
        hsn_sac: it.hsn_sac.trim() || null,
        quantity: Number(it.quantity),
        unit: it.unit || "Pcs",
        unit_price: Number(it.unit_price),
        line_amount: Number(it.line_amount),
        total_price: Number(it.line_amount),
      }));

      const savedInvoice = await apiRequest<Invoice>(
        invoiceId ? `/api/data/invoices/${invoiceId}` : "/api/data/invoices",
        {
          method: invoiceId ? "PUT" : "POST",
          body: jsonBody({ invoice: invoicePayload, items: itemsPayload }),
        },
      );
      setCreatedInvoice(savedInvoice);
    } catch (err: unknown) {
      console.error("Error creating invoice:", err);
      setErrorMessage(err instanceof Error ? err.message : "Could not save invoice.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered brochure items in picker
  const filteredBrochure = React.useMemo(() => {
    return BROCHURE_PRODUCTS.filter((p) => {
      const matchCat =
        selectedCategory === "ALL" || p.category === selectedCategory;
      const q = productSearch.toLowerCase();
      const matchSearch =
        p.product_name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [productSearch, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEditing ? "Edit Invoice" : isDuplicating ? "Duplicate Invoice" : "Generate Invoice"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? "Historical customer and business snapshots are preserved unless you change them."
                : <>Title strictly formatted as <span className="font-semibold text-slate-800">INVOICE</span> • Financial Year FY {financialYear}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/invoices">
            <Button variant="outline" size="sm" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSaveInvoice}
            disabled={saving || recordLoading}
            className="text-xs gap-1.5 bg-[#0b1f3a] hover:bg-[#132c50] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Invoice...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{isEditing ? "Save Changes" : "Save & Issue Invoice"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Modal / Banner when invoice is saved */}
      {createdInvoice && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                Invoice {createdInvoice.invoice_number} {isEditing ? "updated" : "saved"} successfully.
              </p>
              <p className="text-emerald-700 text-[11px] mt-0.5">
                Total Payable: {formatCurrency(createdInvoice.total_amount)} • Billed to {createdInvoice.customer_snapshot.customer_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InvoicePDFActions invoice={createdInvoice} size="sm" />
            <Link href="/invoices">
              <Button size="sm" variant="outline" className="text-xs h-8 bg-white">
                View All
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION A: INVOICE INFORMATION                                 */}
      {/* ============================================================== */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0b1f3a]" />
            <CardTitle className="text-sm font-semibold text-slate-900">
              A. Invoice Identification & Financial Year
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-white">
            Heading: INVOICE
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* New invoice numbers use a generated FY prefix and a manually entered serial. */}
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="serial_number">
                {isEditing ? "Invoice Number *" : "Invoice Serial No. *"}
              </Label>
              {isEditing ? (
                <>
                  <Input
                    id="serial_number"
                    required
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    aria-describedby="invoice-number-help"
                    className="h-9 text-xs font-mono"
                  />
                  <p id="invoice-number-help" className="text-[10px] text-slate-500">
                    You may change the number; duplicate invoice numbers are rejected.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-slate-900">
                    <span className="select-none border-r border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-600">
                      {prefix}
                    </span>
                    <input
                      id="serial_number"
                      type="text"
                      required
                      placeholder="001"
                      value={serialNumber}
                      onChange={(event) => setSerialNumber(event.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Full No: <span className="font-semibold text-slate-900">{fullInvoiceNumber}</span>
                  </p>
                </>
              )}
            </div>

            {/* Invoice Date */}
            <div className="space-y-1.5">
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Input
                id="invoice_date"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Auto-detected Financial Year: <span className="font-semibold text-slate-700">FY {financialYear}</span>
              </p>
            </div>

            {/* PO Number & PO Date */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="po_number">PO Number (Optional)</Label>
                <Input
                  id="po_number"
                  placeholder="e.g. PO-8921"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po_date">PO Date</Label>
                <Input
                  id="po_date"
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* SECTION B & C: CUSTOMER & SHIPPING INFORMATION                 */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-900">
              B. Customer & Billing Address
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select an existing client or register a new one inline
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <CustomerSelect
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
            />
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#0b1f3a]" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                C. Shipping Address
              </CardTitle>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={shipToDifferent}
                onChange={(e) => setShipToDifferent(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-[#0b1f3a] focus:ring-slate-900"
              />
              <span className="text-slate-700">Ship to different address?</span>
            </label>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {shipToDifferent ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="recipient_name">Recipient / Contact Name</Label>
                  <Input
                    id="recipient_name"
                    placeholder="e.g. Haryana Warehouse Unit 3"
                    value={shippingAddress.recipient_name}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        recipient_name: e.target.value,
                      })
                    }
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="delivery_address">Delivery Address</Label>
                  <Input
                    id="delivery_address"
                    placeholder="Plot 10, Logistics Hub, NH-8"
                    value={shippingAddress.delivery_address}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        delivery_address: e.target.value,
                      })
                    }
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="ship_city">City</Label>
                    <Input
                      id="ship_city"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          city: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ship_state">State</Label>
                    <Input
                      id="ship_state"
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          state: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ship_pincode">PIN</Label>
                    <Input
                      id="ship_pincode"
                      value={shippingAddress.pincode}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          pincode: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/60 rounded-md border border-dashed border-slate-200">
                <p className="font-medium text-slate-700">Same as Billing Address</p>
                <p className="text-slate-400 mt-0.5 text-[11px]">
                  Goods will be dispatched directly to the customer&apos;s registered address.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* SECTION D: PRODUCT DETAILS (DYNAMIC PRODUCT TABLE)             */}
      {/* ============================================================== */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              D. Product & Service Line Items
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select items from the 70+ brochure products or enter custom rows. Unit pricing is entered manually.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomModalOpen(true)}
              className="text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Custom Item</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setProductPickerOpen(true)}
              className="text-xs gap-1.5 bg-[#0b1f3a] hover:bg-[#132c50] text-white"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Select from Catalogue</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Product / Specification</th>
                    <th className="py-2.5 px-3 w-24">HSN/SAC</th>
                    <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                    <th className="py-2.5 px-3 w-24">Unit</th>
                    <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Product Name & Description */}
                      <td className="py-2.5 px-3">
                        <Input
                          value={item.product_name}
                          onChange={(e) =>
                            updateItem(idx, "product_name", e.target.value)
                          }
                          placeholder="Product Name"
                          className="h-8 text-xs font-semibold text-slate-900 mb-1"
                        />
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(idx, "description", e.target.value)
                          }
                          placeholder="Description / ply / finish (optional)"
                          className="h-7 text-[11px] text-slate-500"
                        />
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-2.5 px-3">
                        <Input
                          value={item.hsn_sac}
                          onChange={(e) =>
                            updateItem(idx, "hsn_sac", e.target.value)
                          }
                          placeholder="4819"
                          className="h-8 text-xs font-mono"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "quantity",
                              e.target.value === "" ? "" : parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="1"
                          className="h-8 text-xs text-right font-medium"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          {STANDARD_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Unit Price (Rate) - Strictly Manual Input */}
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "unit_price",
                              e.target.value === "" ? "" : parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0.00"
                          className="h-8 text-xs text-right font-semibold text-slate-900"
                        />
                      </td>

                      {/* Computed Amount */}
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                        {formatCurrency(item.line_amount)}
                      </td>

                      {/* Remove */}
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No items added to invoice</p>
              <p className="text-slate-400 mt-0.5 mb-3">
                Browse the 70+ products catalogue or insert custom line items.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductPickerOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Package className="h-3.5 w-3.5" />
                  Browse Catalogue
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* SECTION E & F: TOTALS, ADJUSTMENTS & AMOUNT IN WORDS           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amount in words & Notes */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Amount in Words (Indian Currency)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[#0b1f3a] italic leading-relaxed">
                {amountInWords}
              </p>
            </CardContent>
          </Card>

          {/* Special Notes */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Special Notes / Delivery Instructions (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea
                rows={2}
                placeholder="e.g. Dispatched via Truck HR-55-1234. Contact gate on delivery."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="text-xs"
              />
            </CardContent>
          </Card>
        </div>

        {/* Calculations / Summary */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Subtotal (Line Items Sum):</span>
              <span className="font-semibold text-slate-900 font-mono">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
              <div className="space-y-0.5">
                <span className="text-slate-600 font-medium">Explicit Adjustments / Taxes:</span>
                <span className="text-[10px] text-slate-400 block">
                  Disabled by default. Only enter if explicitly required.
                </span>
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={adjustments}
                  onChange={(e) =>
                    setAdjustments(
                      e.target.value === "" ? "" : parseFloat(e.target.value) || 0
                    )
                  }
                  className="h-8 text-xs text-right font-mono"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-sm pt-3 border-t-2 border-slate-900">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Total Payable:
              </span>
              <span className="text-lg font-bold text-[#0b1f3a] font-mono">
                {formatCurrency(totalPayable)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* SECTION G & H: TERMS AND REMITTANCE PREVIEW                    */}
      {/* ============================================================== */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Default Terms & Conditions (Appended to Invoice)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Textarea
            rows={4}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="text-xs font-mono leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* BOTTOM ACTIONS                                                 */}
      {/* ============================================================== */}
      <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-200">
        <Link href="/invoices">
          <Button variant="outline" size="sm">
            Discard
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={handleSaveInvoice}
          disabled={saving || recordLoading}
          className="bg-[#0b1f3a] hover:bg-[#132c50] text-white gap-2 px-6"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isEditing ? "Saving Changes..." : "Generating Invoice..."}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{isEditing ? "Save Changes" : "Save & Issue Invoice"}</span>
            </>
          )}
        </Button>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: BROWSE CATALOGUE PICKER                               */}
      {/* ============================================================== */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] flex flex-col"
          onClose={() => setProductPickerOpen(false)}
        >
          <DialogHeader>
            <DialogTitle>Select Product from Catalogue</DialogTitle>
            <DialogDescription>
              Choose a standardized product from the ABIRA Enterprises brochure. Unit price is left for manual entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products by title or specification..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                  selectedCategory === "ALL"
                    ? "bg-[#0b1f3a] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({BROCHURE_PRODUCTS.length})
              </button>
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-[#0b1f3a] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Scrollable Products List */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 max-h-80">
              {filteredBrochure.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => selectBrochureProduct(p)}
                  className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-semibold text-slate-900">
                      {p.product_name}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {p.description}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {p.category}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL 2: CUSTOM PRODUCT INLINE ADD                             */}
      {/* ============================================================== */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent onClose={() => setCustomModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>
              Insert a bespoke product or specialized packing specification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomProduct} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="customCategory">Category</Label>
              <select
                id="customCategory"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="customName">Product / Item Name *</Label>
              <Input
                id="customName"
                required
                placeholder="e.g. Custom Double-Wall Flute Shipping Cartons"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="customDesc">Description / Dimensions (Optional)</Label>
              <Textarea
                id="customDesc"
                rows={2}
                placeholder="Dimensions, ply specs, printing colorways..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#0b1f3a] hover:bg-[#132c50] text-white"
              >
                Insert Row
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
