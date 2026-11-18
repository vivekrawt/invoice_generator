import "server-only";

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BROCHURE_PRODUCTS } from "../constants/products-seed";
import { AppError } from "../app-error";
import { validateInvoiceWrite } from "../invoice-validation";
import type {
  BusinessProfile,
  Customer,
  Invoice,
  InvoiceItem,
  Product,
} from "@/types/database.types";
import type { Database } from "./database.types";

type StoreContext = {
  supabase: SupabaseClient<Database>;
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

function serializeJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function profileDefaults(ownerId: string) {
  const timestamp = new Date().toISOString();
  return {
    owner_id: ownerId,
    business_name: "ABIRA Enterprises",
    address: "ABIRA Enterprises, Millenia 2, Sector 37D, Gurugram, Haryana – 122001",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122001",
    phone: "8882511472",
    email: null,
    pan: null,
    bank_account_name: null,
    bank_name: null,
    account_number: null,
    ifsc: null,
    upi_id: null,
    logo_url: null,
    payment_qr_url: null,
    default_terms: `Payment Terms:
Payment should be initiated within 15 days of delivery.

Delivery Policy:
Products are generally delivered within 3 days of ordering.

Return and Exchange Policy:
No returns or exchanges are accepted after delivery, except in cases involving defective or damaged products.`,
    catalogue_seeded_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getBusinessProfile({ supabase, user }: StoreContext): Promise<BusinessProfile> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return ensureProductCatalogue({ supabase, user }, data);

  const { data: created, error: createError } = await supabase
    .from("business_profiles")
    .insert(profileDefaults(user.id))
    .select("*")
    .single();
  if (!createError) return ensureProductCatalogue({ supabase, user }, created);
  if (createError.code !== "23505") throw createError;

  const { data: raced, error: readError } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("owner_id", user.id)
    .single();
  if (readError) throw readError;
  return ensureProductCatalogue({ supabase, user }, raced);
}

async function ensureProductCatalogue(context: StoreContext, profile: Database["public"]["Tables"]["business_profiles"]["Row"]) {
  if (profile.catalogue_seeded_at) return profile;
  await syncBrochureProducts(context);
  const timestamp = new Date().toISOString();
  const { data, error } = await context.supabase
    .from("business_profiles")
    .update({ catalogue_seeded_at: timestamp })
    .eq("owner_id", context.user.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveBusinessProfile(context: StoreContext, value: unknown): Promise<BusinessProfile> {
  const profile = asRecord(value, "Business profile");
  await getBusinessProfile(context);
  const fields = {
    business_name: requiredText(profile, "business_name", "Business name"),
    address: requiredText(profile, "address", "Address"),
    city: requiredText(profile, "city", "City"),
    state: requiredText(profile, "state", "State"),
    pincode: requiredText(profile, "pincode", "PIN code"),
    phone: requiredText(profile, "phone", "Phone"),
    email: optionalText(profile, "email"),
    pan: optionalText(profile, "pan")?.toUpperCase() ?? null,
    bank_account_name: optionalText(profile, "bank_account_name"),
    bank_name: optionalText(profile, "bank_name"),
    account_number: optionalText(profile, "account_number"),
    ifsc: optionalText(profile, "ifsc")?.toUpperCase() ?? null,
    upi_id: optionalText(profile, "upi_id"),
    logo_url: optionalText(profile, "logo_url"),
    payment_qr_url: optionalText(profile, "payment_qr_url"),
    default_terms: optionalText(profile, "default_terms"),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await context.supabase
    .from("business_profiles")
    .update(fields)
    .eq("owner_id", context.user.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listCustomers({ supabase, user }: StoreContext): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveCustomer(context: StoreContext, value: unknown, id?: string): Promise<Customer> {
  const input = asRecord(value, "Customer");
  const fields = {
    customer_name: requiredText(input, "customer_name", "Customer name"),
    contact_person: optionalText(input, "contact_person"),
    phone: requiredText(input, "phone", "Phone"),
    email: optionalText(input, "email"),
    billing_address: requiredText(input, "billing_address", "Billing address"),
    city: requiredText(input, "city", "City"),
    state: requiredText(input, "state", "State"),
    pincode: requiredText(input, "pincode", "PIN code"),
    gstin: optionalText(input, "gstin")?.toUpperCase() ?? null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await context.supabase
      .from("customers")
      .update(fields)
      .eq("id", id)
      .eq("owner_id", context.user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new AppError("Customer was not found.", 404);
    return data;
  }

  const { data, error } = await context.supabase
    .from("customers")
    .insert({ ...fields, owner_id: context.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer({ supabase, user }: StoreContext, id: string) {
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Customer was not found.", 404);
}

export async function listProducts({ supabase, user }: StoreContext): Promise<Product[]> {
  await getBusinessProfile({ supabase, user });
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("owner_id", user.id)
    .order("category")
    .order("product_name");
  if (error) throw error;
  return data;
}

export async function saveProduct(context: StoreContext, value: unknown, id?: string): Promise<Product> {
  const input = asRecord(value, "Product");
  const fields = {
    category: requiredText(input, "category", "Category"),
    product_name: requiredText(input, "product_name", "Product name"),
    description: optionalText(input, "description"),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await context.supabase
      .from("products")
      .update(fields)
      .eq("id", id)
      .eq("owner_id", context.user.id)
      .select("*")
      .maybeSingle();
    if (error?.code === "23505") throw new AppError(`A product named "${fields.product_name}" already exists.`, 409);
    if (error) throw error;
    if (!data) throw new AppError("Product was not found.", 404);
    return data;
  }

  const { data, error } = await context.supabase
    .from("products")
    .insert({ ...fields, owner_id: context.user.id })
    .select("*")
    .single();
  if (error?.code === "23505") throw new AppError(`A product named "${fields.product_name}" already exists.`, 409);
  if (error) throw error;
  return data;
}

export async function syncBrochureProducts({ supabase, user }: StoreContext) {
  const timestamp = new Date().toISOString();
  const products = BROCHURE_PRODUCTS.map((product) => ({
    owner_id: user.id,
    category: product.category,
    product_name: product.product_name,
    description: product.description,
    updated_at: timestamp,
  }));
  const { error } = await supabase
    .from("products")
    .upsert(products, { onConflict: "owner_id,product_name" });
  if (error) throw error;
  return products.length;
}

export async function deleteProduct({ supabase, user }: StoreContext, id: string) {
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Product was not found.", 404);
}

async function addInvoiceItems(context: StoreContext, invoices: Invoice[]): Promise<Invoice[]> {
  if (!invoices.length) return invoices;
  const { data, error } = await context.supabase
    .from("invoice_items")
    .select("*")
    .eq("owner_id", context.user.id)
    .in("invoice_id", invoices.map((invoice) => invoice.id))
    .order("position", { ascending: true });
  if (error) throw error;

  const itemsByInvoice = new Map<string, InvoiceItem[]>();
  for (const item of data) {
    const current = itemsByInvoice.get(item.invoice_id) ?? [];
    current.push(item);
    itemsByInvoice.set(item.invoice_id, current);
  }
  return invoices.map((invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    adjustments: Number(invoice.adjustments),
    total_amount: Number(invoice.total_amount),
    items: itemsByInvoice.get(invoice.id) ?? [],
  }));
}

export async function listInvoices({ supabase, user }: StoreContext): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return addInvoiceItems({ supabase, user }, data);
}

export async function getInvoice(context: StoreContext, id: string): Promise<Invoice> {
  const { data, error } = await context.supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("owner_id", context.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Invoice was not found.", 404);
  const [invoice] = await addInvoiceItems(context, [data]);
  return invoice;
}

export async function saveInvoice(
  context: StoreContext,
  value: unknown,
  itemValues: unknown,
  invoiceId?: string,
): Promise<Invoice> {
  const { invoice, items } = validateInvoiceWrite(value, itemValues);
  const { data, error } = await context.supabase.rpc("save_invoice", {
    p_invoice_id: invoiceId ?? null,
    p_invoice: serializeJson(invoice),
    p_items: serializeJson(items),
  });
  if (error?.code === "23505") {
    throw new AppError(`Invoice number "${invoice.invoice_number}" already exists. Choose a unique number.`, 409);
  }
  if (error?.code === "P0002") throw new AppError("Invoice was not found.", 404);
  if (error?.code === "23503") throw new AppError("The selected customer or product no longer exists.", 400);
  if (error?.code === "23514") throw new AppError(error.message, 400);
  if (error) throw error;
  return getInvoice(context, data);
}

export async function deleteInvoice({ supabase, user }: StoreContext, id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Invoice was not found.", 404);
}

export async function getDashboardSummary(context: StoreContext) {
  const { supabase, user } = context;
  const businessProfile = await getBusinessProfile(context);
  const [invoiceCount, customerCount, productCount, recentResult] = await Promise.all([
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("invoices").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);
  if (invoiceCount.error) throw invoiceCount.error;
  if (customerCount.error) throw customerCount.error;
  if (productCount.error) throw productCount.error;
  if (recentResult.error) throw recentResult.error;
  const recentInvoices = await addInvoiceItems(context, recentResult.data);

  return {
    invoicesCount: invoiceCount.count ?? 0,
    customersCount: customerCount.count ?? 0,
    productsCount: productCount.count ?? 0,
    recentInvoices,
    businessProfile,
  };
}

export async function addAsset(
  context: StoreContext,
  asset: {
    id: string;
    type: "logo" | "qr";
    object_path: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  },
) {
  const { data, error } = await context.supabase
    .from("assets")
    .insert({ ...asset, owner_id: context.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getAsset({ supabase, user }: StoreContext, id: string) {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
