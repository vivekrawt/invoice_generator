import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { BROCHURE_PRODUCTS } from "../constants/products-seed";
import { HARDCODED_BUSINESS_PROFILE } from "../constants/business-defaults";
import { AppError } from "../app-error";
import { validateInvoiceWrite } from "../invoice-validation";
import type {
  BusinessProfile,
  Customer,
  Invoice,
  InvoiceItem,
  Product,
  RateChart,
  RateChartItem,
} from "@/types/database.types";
import type { Database } from "./database.types";

export type StoreContext = {
  supabase: SupabaseClient<Database> | null;
  user: User;
};

type RecordData = Record<string, unknown>;

function asRecord(value: unknown, label: string): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(`${label} must be an object.`);
  }
  return value as RecordData;
}

function requiredText(record: RecordData, key: string, label = key): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${label} is required.`);
  }
  return value.trim();
}

function optionalText(record: RecordData, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Default preconfigured business profile with hardcoded bank and business coordinates
function profileDefaults(): BusinessProfile {
  const timestamp = new Date().toISOString();
  return {
    ...HARDCODED_BUSINESS_PROFILE,
    created_at: timestamp,
    updated_at: timestamp,
  } as unknown as BusinessProfile;
}

// Helpers for server filesystem storage fallback
function tryReadLocalJson<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(process.cwd(), "data", filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data) as T;
    }
  } catch {
    // Ignore read errors
  }
  return fallback;
}

function tryWriteLocalJson(filename: string, data: unknown) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignore write errors in read-only environments
  }
}

// In-Memory store fallback (ensures the website runs 100% on Vercel even without Supabase credentials)
interface MemoryStorage {
  profile: BusinessProfile;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  assets: Array<{ id: string; type: "logo" | "qr" | "signature" | "stamp"; object_path: string; mime_type: string }>;
  rateCharts: RateChart[];
}

const memoryStore: MemoryStorage = {
  profile: tryReadLocalJson<BusinessProfile>("business-profile.json", profileDefaults()),
  customers: tryReadLocalJson<Customer[]>("customers.json", []),
  products: BROCHURE_PRODUCTS.map((p, idx) => ({
    id: `prod-${idx + 1}`,
    category: p.category,
    product_name: p.product_name,
    description: p.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  invoices: tryReadLocalJson<Invoice[]>("invoices.json", []),
  assets: [],
  rateCharts: tryReadLocalJson<RateChart[]>("rate-charts.json", []),
};

// BUSINESS PROFILE
export async function getBusinessProfile({ supabase }: StoreContext): Promise<BusinessProfile> {
  let profile: BusinessProfile = {
    ...profileDefaults(),
    ...memoryStore.profile,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const row = data as Partial<BusinessProfile>;
        // CRITICAL: Terms and conditions can be customized, but NEVER let null or empty fields from Supabase wipe out hardcoded bank details or images!
        profile = {
          ...profile,
          default_terms: row.default_terms || profile.default_terms,
          business_name: row.business_name || profile.business_name,
          address: row.address || profile.address,
          city: row.city || profile.city,
          state: row.state || profile.state,
          pincode: row.pincode || profile.pincode,
          phone: row.phone || profile.phone,
          email: row.email ?? profile.email,
          pan: row.pan ?? profile.pan,
          bank_account_name: row.bank_account_name || profile.bank_account_name,
          bank_name: row.bank_name || profile.bank_name,
          account_number: row.account_number || profile.account_number,
          ifsc: row.ifsc || profile.ifsc,
          upi_id: row.upi_id ?? profile.upi_id,
          account1_label: row.account1_label || profile.account1_label || HARDCODED_BUSINESS_PROFILE.account1_label,
          account2_label: row.account2_label || profile.account2_label || HARDCODED_BUSINESS_PROFILE.account2_label,
          account2_bank_name: row.account2_bank_name ?? profile.account2_bank_name ?? "",
          account2_account_number: row.account2_account_number ?? profile.account2_account_number ?? "",
          account2_ifsc: row.account2_ifsc ?? profile.account2_ifsc ?? "",
          account2_bank_account_name: row.account2_bank_account_name ?? profile.account2_bank_account_name ?? "",
          account2_upi_id: row.account2_upi_id ?? profile.account2_upi_id ?? null,
          account2_payment_qr_url: row.account2_payment_qr_url ?? profile.account2_payment_qr_url ?? null,
          default_payment_account: (row.default_payment_account as any) || profile.default_payment_account || "account1",
          logo_url: row.logo_url ?? profile.logo_url,
          payment_qr_url: row.payment_qr_url || profile.payment_qr_url,
          signature_url: row.signature_url || profile.signature_url,
          stamp_url: row.stamp_url || profile.stamp_url,
        };
        memoryStore.profile = profile;
        return profile;
      }
    } catch (e) {
      console.warn("Supabase profile read notice, using hardcoded fallback:", e);
    }
  }
  return profile;
}

export async function saveBusinessProfile(context: StoreContext, value: unknown): Promise<BusinessProfile> {
  const profile = asRecord(value, "Business profile");
  const fields = {
    business_name: optionalText(profile, "business_name") || HARDCODED_BUSINESS_PROFILE.business_name,
    address: optionalText(profile, "address") || HARDCODED_BUSINESS_PROFILE.address,
    city: optionalText(profile, "city") || HARDCODED_BUSINESS_PROFILE.city,
    state: optionalText(profile, "state") || HARDCODED_BUSINESS_PROFILE.state,
    pincode: optionalText(profile, "pincode") || HARDCODED_BUSINESS_PROFILE.pincode,
    phone: optionalText(profile, "phone") || HARDCODED_BUSINESS_PROFILE.phone,
    email: optionalText(profile, "email") || HARDCODED_BUSINESS_PROFILE.email,
    pan: optionalText(profile, "pan")?.toUpperCase() ?? HARDCODED_BUSINESS_PROFILE.pan,
    bank_account_name: optionalText(profile, "bank_account_name") || HARDCODED_BUSINESS_PROFILE.bank_account_name,
    bank_name: optionalText(profile, "bank_name") || HARDCODED_BUSINESS_PROFILE.bank_name,
    account_number: optionalText(profile, "account_number") || HARDCODED_BUSINESS_PROFILE.account_number,
    ifsc: optionalText(profile, "ifsc")?.toUpperCase() ?? HARDCODED_BUSINESS_PROFILE.ifsc,
    upi_id: optionalText(profile, "upi_id") || HARDCODED_BUSINESS_PROFILE.upi_id,
    account1_label: optionalText(profile, "account1_label") || HARDCODED_BUSINESS_PROFILE.account1_label,
    account2_label: optionalText(profile, "account2_label") || HARDCODED_BUSINESS_PROFILE.account2_label,
    account2_bank_name: optionalText(profile, "account2_bank_name") ?? "",
    account2_account_number: optionalText(profile, "account2_account_number") ?? "",
    account2_ifsc: optionalText(profile, "account2_ifsc")?.toUpperCase() ?? "",
    account2_bank_account_name: optionalText(profile, "account2_bank_account_name") ?? "",
    account2_upi_id: optionalText(profile, "account2_upi_id") || null,
    account2_payment_qr_url: optionalText(profile, "account2_payment_qr_url") || null,
    default_payment_account: (optionalText(profile, "default_payment_account") as "account1" | "account2") || "account1",
    logo_url: optionalText(profile, "logo_url") || HARDCODED_BUSINESS_PROFILE.logo_url,
    payment_qr_url: optionalText(profile, "payment_qr_url") || HARDCODED_BUSINESS_PROFILE.payment_qr_url,
    signature_url: optionalText(profile, "signature_url") || HARDCODED_BUSINESS_PROFILE.signature_url,
    stamp_url: optionalText(profile, "stamp_url") || HARDCODED_BUSINESS_PROFILE.stamp_url,
    default_terms: optionalText(profile, "default_terms") || HARDCODED_BUSINESS_PROFILE.default_terms,
    updated_at: new Date().toISOString(),
  };

  memoryStore.profile = {
    ...memoryStore.profile,
    ...fields,
  };

  // Persist to local fallback json
  tryWriteLocalJson("business-profile.json", memoryStore.profile);

  if (context.supabase) {
    try {
      const { data: existingRow } = await context.supabase
        .from("business_profiles")
        .select("id")
        .limit(1)
        .maybeSingle();

      const targetId = existingRow?.id || memoryStore.profile.id || "00000000-0000-0000-0000-000000000001";

      await context.supabase
        .from("business_profiles")
        .upsert(
          { id: targetId, ...fields } as any,
          { onConflict: "id" }
        );
    } catch (e) {
      console.warn("Supabase profile save notice:", e);
    }
  }

  return memoryStore.profile;
}

// CUSTOMERS
export async function listCustomers({ supabase, user }: StoreContext): Promise<Customer[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("customer_name", { ascending: true });
      if (!error && data) return data as unknown as Customer[];
    } catch (e) {
      console.warn("Supabase listCustomers notice:", e);
    }
  }
  return memoryStore.customers;
}

export async function saveCustomer(
  context: StoreContext,
  value: unknown,
  customerId?: string
): Promise<Customer> {
  const customer = asRecord(value, "Customer");
  const fields = {
    customer_name: requiredText(customer, "customer_name", "Customer or company legal name"),
    contact_person: optionalText(customer, "contact_person"),
    phone: requiredText(customer, "phone", "Phone number"),
    email: optionalText(customer, "email"),
    billing_address: requiredText(customer, "billing_address", "Billing address"),
    city: requiredText(customer, "city", "City"),
    state: requiredText(customer, "state", "State"),
    pincode: requiredText(customer, "pincode", "PIN code"),
    gstin: optionalText(customer, "gstin")?.toUpperCase() ?? null,
    updated_at: new Date().toISOString(),
  };

  const id = customerId || `cust-${Date.now()}`;
  const record: Customer = {
    id,
    ...fields,
    created_at: new Date().toISOString(),
  };

  if (customerId) {
    const idx = memoryStore.customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      memoryStore.customers[idx] = { ...memoryStore.customers[idx], ...fields };
    } else {
      memoryStore.customers.unshift(record);
    }
  } else {
    memoryStore.customers.unshift(record);
  }

  if (context.supabase) {
    try {
      if (customerId) {
        const { data, error } = await context.supabase
          .from("customers")
          .update({ ...fields, owner_id: context.user.id } as any)
          .eq("id", customerId)
          .select("*")
          .single();
        if (!error && data) return data as unknown as Customer;
      } else {
        const { data, error } = await context.supabase
          .from("customers")
          .insert({ ...fields, owner_id: context.user.id } as any)
          .select("*")
          .single();
        if (!error && data) return data as unknown as Customer;
      }
    } catch (e) {
      console.warn("Supabase saveCustomer notice:", e);
    }
  }

  return record;
}

export async function deleteCustomer({ supabase, user }: StoreContext, id: string) {
  memoryStore.customers = memoryStore.customers.filter((c) => c.id !== id);
  if (supabase) {
    try {
      await supabase.from("customers").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase deleteCustomer notice:", e);
    }
  }
}

// PRODUCTS
export async function listProducts({ supabase, user }: StoreContext): Promise<Product[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true })
        .order("product_name", { ascending: true });
      if (!error && data && data.length > 0) return data as unknown as Product[];
    } catch (e) {
      console.warn("Supabase listProducts notice:", e);
    }
  }
  return memoryStore.products;
}

export async function saveProduct(
  context: StoreContext,
  value: unknown,
  productId?: string
): Promise<Product> {
  const product = asRecord(value, "Product");
  const fields = {
    category: requiredText(product, "category", "Category"),
    product_name: requiredText(product, "product_name", "Product name"),
    description: optionalText(product, "description"),
    updated_at: new Date().toISOString(),
  };

  const id = productId || `prod-${Date.now()}`;
  const record: Product = {
    id,
    ...fields,
    created_at: new Date().toISOString(),
  };

  if (productId) {
    const idx = memoryStore.products.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      memoryStore.products[idx] = { ...memoryStore.products[idx], ...fields };
    } else {
      memoryStore.products.unshift(record);
    }
  } else {
    memoryStore.products.unshift(record);
  }

  if (context.supabase) {
    try {
      if (productId) {
        const { data, error } = await context.supabase
          .from("products")
          .update({ ...fields, owner_id: context.user.id } as any)
          .eq("id", productId)
          .select("*")
          .single();
        if (!error && data) return data as unknown as Product;
      } else {
        const { data, error } = await context.supabase
          .from("products")
          .insert({ ...fields, owner_id: context.user.id } as any)
          .select("*")
          .single();
        if (!error && data) return data as unknown as Product;
      }
    } catch (e) {
      console.warn("Supabase saveProduct notice:", e);
    }
  }

  return record;
}

export async function syncBrochureProducts({ supabase, user }: StoreContext) {
  memoryStore.products = BROCHURE_PRODUCTS.map((p, idx) => ({
    id: `prod-${idx + 1}`,
    category: p.category,
    product_name: p.product_name,
    description: p.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  if (supabase) {
    try {
      const timestamp = new Date().toISOString();
      const products = BROCHURE_PRODUCTS.map((product) => ({
        owner_id: user.id,
        category: product.category,
        product_name: product.product_name,
        description: product.description,
        updated_at: timestamp,
      }));
      await supabase.from("products").upsert(products as any, { onConflict: "product_name" });
    } catch (e) {
      console.warn("Supabase syncBrochureProducts notice:", e);
    }
  }

  return memoryStore.products.length;
}

export async function deleteProduct({ supabase, user }: StoreContext, id: string) {
  memoryStore.products = memoryStore.products.filter((p) => p.id !== id);
  if (supabase) {
    try {
      await supabase.from("products").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase deleteProduct notice:", e);
    }
  }
}

// INVOICES
export async function listInvoices({ supabase, user }: StoreContext): Promise<Invoice[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*)
        `)
        .order("created_at", { ascending: false });
      if (!error && data) return data as unknown as Invoice[];
    } catch (e) {
      console.warn("Supabase listInvoices notice:", e);
    }
  }
  return memoryStore.invoices;
}

export async function getInvoice(context: StoreContext, id: string): Promise<Invoice> {
  const local = memoryStore.invoices.find((inv) => inv.id === id);
  if (local) return local;

  if (context.supabase) {
    try {
      const { data, error } = await context.supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq("id", id)
        .maybeSingle();
      if (!error && data) return data as unknown as Invoice;
    } catch (e) {
      console.warn("Supabase getInvoice notice:", e);
    }
  }

  throw new AppError("Invoice was not found.", 404);
}

export async function saveInvoice(
  context: StoreContext,
  value: unknown,
  itemValues: unknown,
  invoiceId?: string
): Promise<Invoice> {
  const { invoice, items } = validateInvoiceWrite(value, itemValues);

  // Check duplicate invoice number
  const duplicate = memoryStore.invoices.find(
    (inv) => inv.invoice_number === invoice.invoice_number && inv.id !== invoiceId
  );
  if (duplicate) {
    throw new AppError(
      `Invoice number "${invoice.invoice_number}" already exists. Please choose a unique serial number.`,
      409
    );
  }

  const id = invoiceId || `inv-${Date.now()}`;
  const timestamp = new Date().toISOString();

  const formattedItems: InvoiceItem[] = items.map((it, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    invoice_id: id,
    product_id: it.product_id || null,
    category: it.category || null,
    product_name: it.product_name,
    description: it.description || null,
    hsn_sac: it.hsn_sac || null,
    quantity: Number(it.quantity),
    unit: it.unit || "Pcs",
    unit_price: Number(it.unit_price),
    line_amount: Number(it.line_amount),
    created_at: timestamp,
  }));

  const existingInv = invoiceId ? memoryStore.invoices.find((inv) => inv.id === invoiceId) : undefined;
  const fullInvoice: Invoice = {
    id,
    invoice_number: invoice.invoice_number,
    financial_year: invoice.financial_year,
    serial_number: invoice.serial_number,
    invoice_date: invoice.invoice_date,
    po_number: invoice.po_number || null,
    po_date: invoice.po_date || null,
    customer_id: invoice.customer_id || null,
    customer_name: invoice.customer_name,
    customer_phone: invoice.customer_phone,
    customer_snapshot: invoice.customer_snapshot,
    shipping_snapshot: invoice.shipping_snapshot || null,
    business_snapshot: invoice.business_snapshot,
    subtotal: Number(invoice.subtotal),
    adjustments: Number(invoice.adjustments),
    total_amount: Number(invoice.total_amount),
    amount_in_words: invoice.amount_in_words,
    terms: invoice.terms || null,
    additional_notes: invoice.additional_notes || null,
    drive_file_id: (invoice as any).drive_file_id || existingInv?.drive_file_id || null,
    drive_file_url: (invoice as any).drive_file_url || existingInv?.drive_file_url || null,
    drive_synced_at: (invoice as any).drive_synced_at || existingInv?.drive_synced_at || null,
    created_at: timestamp,
    updated_at: timestamp,
    items: formattedItems,
  };

  if (invoiceId) {
    const idx = memoryStore.invoices.findIndex((inv) => inv.id === invoiceId);
    if (idx !== -1) {
      memoryStore.invoices[idx] = fullInvoice;
    } else {
      memoryStore.invoices.unshift(fullInvoice);
    }
  } else {
    memoryStore.invoices.unshift(fullInvoice);
  }

  // Attempt Supabase insert if client is active
  if (context.supabase) {
    try {
      const { error: invError } = await context.supabase.from("invoices").upsert({
        id,
        owner_id: context.user.id,
        invoice_number: invoice.invoice_number,
        financial_year: invoice.financial_year,
        serial_number: invoice.serial_number,
        invoice_date: invoice.invoice_date,
        po_number: invoice.po_number || null,
        po_date: invoice.po_date || null,
        customer_id: invoice.customer_id || null,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        customer_snapshot: invoice.customer_snapshot,
        shipping_snapshot: invoice.shipping_snapshot || null,
        business_snapshot: invoice.business_snapshot,
        subtotal: Number(invoice.subtotal),
        adjustments: Number(invoice.adjustments),
        total_amount: Number(invoice.total_amount),
        amount_in_words: invoice.amount_in_words,
        terms: invoice.terms || null,
        additional_notes: invoice.additional_notes || null,
      } as any);

      if (invError) {
        console.error("Supabase invoice insert error:", invError);
      } else if (formattedItems.length > 0) {
        const { error: itemsError } = await context.supabase.from("invoice_items").upsert(
          formattedItems.map((it, pIdx) => ({
            id: it.id,
            owner_id: context.user.id,
            invoice_id: id,
            product_id: it.product_id,
            category: it.category,
            product_name: it.product_name,
            description: it.description,
            hsn_sac: it.hsn_sac,
            quantity: it.quantity,
            unit: it.unit,
            unit_price: it.unit_price,
            line_amount: it.line_amount,
            position: pIdx + 1,
            total_price: it.line_amount,
          })) as any
        );
        if (itemsError) {
          console.error("Supabase invoice_items error:", itemsError);
        }
      }
    } catch (e) {
      console.warn("Supabase saveInvoice notice (saved in memory):", e);
    }
  }

  tryWriteLocalJson("invoices.json", memoryStore.invoices);
  return fullInvoice;
}

export async function deleteInvoice({ supabase, user }: StoreContext, id: string) {
  memoryStore.invoices = memoryStore.invoices.filter((inv) => inv.id !== id);
  tryWriteLocalJson("invoices.json", memoryStore.invoices);
  if (supabase) {
    try {
      await supabase.from("invoices").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase deleteInvoice notice:", e);
    }
  }
}

export async function updateInvoiceDriveUrl(
  context: StoreContext,
  invoiceId: string,
  driveFileId: string,
  driveFileUrl: string
): Promise<Invoice> {
  const timestamp = new Date().toISOString();
  const inv = memoryStore.invoices.find((i) => i.id === invoiceId);
  if (inv) {
    inv.drive_file_id = driveFileId;
    inv.drive_file_url = driveFileUrl;
    inv.drive_synced_at = timestamp;
  }
  if (context.supabase) {
    try {
      await context.supabase
        .from("invoices")
        .update({
          drive_file_id: driveFileId,
          drive_file_url: driveFileUrl,
          drive_synced_at: timestamp,
        } as any)
        .eq("id", invoiceId);
    } catch (e) {
      console.warn("Supabase updateInvoiceDriveUrl notice:", e);
    }
  }
  tryWriteLocalJson("invoices.json", memoryStore.invoices);
  return inv || ({ id: invoiceId, drive_file_id: driveFileId, drive_file_url: driveFileUrl } as any);
}

// DASHBOARD
export async function getDashboardSummary(context: StoreContext) {
  const profile = await getBusinessProfile(context);
  let invs = memoryStore.invoices;
  let custs = memoryStore.customers;
  let prods = memoryStore.products;

  if (context.supabase) {
    try {
      const [invRes, custRes, prodRes] = await Promise.all([
        context.supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(5),
        context.supabase.from("customers").select("*"),
        context.supabase.from("products").select("*"),
      ]);
      if (invRes.data) invs = invRes.data as unknown as Invoice[];
      if (custRes.data) custs = custRes.data as unknown as Customer[];
      if (prodRes.data && prodRes.data.length > 0) prods = prodRes.data as unknown as Product[];
    } catch (e) {
      console.warn("Supabase dashboard notice:", e);
    }
  }

  return {
    invoicesCount: invs.length,
    customersCount: custs.length,
    productsCount: prods.length,
    recentInvoices: invs.slice(0, 5),
    businessProfile: profile,
  };
}

export async function addAsset(
  context: StoreContext,
  asset: {
    id: string;
    type: "logo" | "qr" | "signature" | "stamp";
    object_path: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  }
) {
  memoryStore.assets.push(asset);
  return asset;
}

export async function getAsset({ supabase, user }: StoreContext, id: string) {
  return memoryStore.assets.find((a) => a.id === id) || null;
}

// RATE CHARTS
export async function listRateCharts({ supabase }: StoreContext): Promise<RateChart[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("rate_charts" as any)
        .select("*")
        .order("updated_at", { ascending: false });

      if (!error && data) {
        memoryStore.rateCharts = data as unknown as RateChart[];
        return memoryStore.rateCharts;
      }
    } catch (e) {
      console.warn("Supabase rate_charts fetch notice:", e);
    }
  }
  return [...memoryStore.rateCharts].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getRateChart({ supabase }: StoreContext, id: string): Promise<RateChart> {
  const chart = memoryStore.rateCharts.find((c) => c.id === id);
  if (chart) return chart;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("rate_charts" as any)
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return data as unknown as RateChart;
      }
    } catch (e) {
      console.warn("Supabase getRateChart notice:", e);
    }
  }
  throw new AppError("Rate chart not found.", 404);
}

export async function saveRateChart(
  context: StoreContext,
  value: unknown,
  existingId?: string
): Promise<RateChart> {
  const raw = asRecord(value, "Rate chart");
  const organization_name = requiredText(raw, "organization_name", "Organization name");
  const contact_person = optionalText(raw, "contact_person");
  const phone = optionalText(raw, "phone");
  const chart_date = optionalText(raw, "chart_date") || new Date().toISOString().split("T")[0];
  const notes = optionalText(raw, "notes");

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: RateChartItem[] = rawItems.map((item: any, idx: number) => ({
    id: item.id || `item-${Date.now()}-${idx}`,
    category: String(item.category || "").trim() || "Packaging Tapes",
    product_name: String(item.product_name || "").trim() || "Item",
    specification: item.specification ? String(item.specification).trim() : null,
    rate: typeof item.rate === "number" ? item.rate : item.rate ? Number(item.rate) : null,
    unit: item.unit ? String(item.unit).trim() : null,
    rate_per_piece: typeof item.rate_per_piece === "number" ? item.rate_per_piece : item.rate_per_piece ? Number(item.rate_per_piece) : null,
    rate_per_roll: typeof item.rate_per_roll === "number" ? item.rate_per_roll : item.rate_per_roll ? Number(item.rate_per_roll) : null,
    custom_unit: item.custom_unit ? String(item.custom_unit).trim() : null,
    custom_rate: typeof item.custom_rate === "number" ? item.custom_rate : item.custom_rate ? Number(item.custom_rate) : null,
    secondary_rate: typeof item.secondary_rate === "number" ? item.secondary_rate : item.secondary_rate ? Number(item.secondary_rate) : null,
    secondary_unit: item.secondary_unit ? String(item.secondary_unit).trim() : null,
  }));

  const now = new Date().toISOString();
  const id = existingId || (typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `rc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const existingIdx = memoryStore.rateCharts.findIndex((c) => c.id === id);
  const created_at = existingIdx >= 0 ? memoryStore.rateCharts[existingIdx].created_at : now;

  const chartRecord: RateChart = {
    id,
    organization_name,
    contact_person,
    phone,
    chart_date,
    notes,
    items,
    created_at,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    memoryStore.rateCharts[existingIdx] = chartRecord;
  } else {
    memoryStore.rateCharts.unshift(chartRecord);
  }

  tryWriteLocalJson("rate-charts.json", memoryStore.rateCharts);

  if (context.supabase) {
    try {
      await context.supabase
        .from("rate_charts" as any)
        .upsert({ ...chartRecord, owner_id: context.user.id });
    } catch (e) {
      console.warn("Supabase rate_charts save notice:", e);
    }
  }

  return chartRecord;
}

export async function deleteRateChart(context: StoreContext, id: string): Promise<void> {
  memoryStore.rateCharts = memoryStore.rateCharts.filter((c) => c.id !== id);
  tryWriteLocalJson("rate-charts.json", memoryStore.rateCharts);

  if (context.supabase) {
    try {
      await context.supabase.from("rate_charts" as any).delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase rate_charts delete notice:", e);
    }
  }
}
