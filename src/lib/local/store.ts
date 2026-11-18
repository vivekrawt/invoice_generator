import { randomUUID } from "node:crypto";
import { BROCHURE_PRODUCTS } from "../constants/products-seed.ts";
import type {
  BusinessProfile,
  Customer,
  Invoice,
  InvoiceItem,
  Product,
} from "../../types/database.types.ts";
import { convertNumberToIndianWords, getIndianFinancialYear } from "../number-to-words.ts";
import { getDatabase } from "./db.ts";

export class LocalStoreError extends Error {
  public readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LocalStoreError";
    this.status = status;
  }
}

type RecordData = Record<string, unknown>;

function asRecord(value: unknown, label: string): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LocalStoreError(`${label} must be an object.`);
  }
  return value as RecordData;
}

function requiredText(record: RecordData, key: string, label = key): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new LocalStoreError(`${label} is required.`);
  }
  return value.trim();
}

function optionalText(record: RecordData, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function now() {
  return new Date().toISOString();
}

export function getBusinessProfile(): BusinessProfile {
  const row = getDatabase()
    .prepare("SELECT * FROM business_profiles ORDER BY created_at LIMIT 1")
    .get() as BusinessProfile | undefined;
  if (!row) throw new LocalStoreError("Business settings could not be loaded.", 500);
  return row;
}

export function saveBusinessProfile(value: unknown): BusinessProfile {
  const profile = asRecord(value, "Business profile");
  const current = getBusinessProfile();
  const updatedAt = now();
  getDatabase().prepare(`
    UPDATE business_profiles SET
      business_name = ?, address = ?, city = ?, state = ?, pincode = ?, phone = ?,
      email = ?, pan = ?, bank_account_name = ?, bank_name = ?, account_number = ?,
      ifsc = ?, upi_id = ?, logo_url = ?, payment_qr_url = ?, default_terms = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    requiredText(profile, "business_name", "Business name"),
    requiredText(profile, "address", "Address"),
    requiredText(profile, "city", "City"),
    requiredText(profile, "state", "State"),
    requiredText(profile, "pincode", "PIN code"),
    requiredText(profile, "phone", "Phone"),
    optionalText(profile, "email"),
    optionalText(profile, "pan")?.toUpperCase() ?? null,
    optionalText(profile, "bank_account_name"),
    optionalText(profile, "bank_name"),
    optionalText(profile, "account_number"),
    optionalText(profile, "ifsc")?.toUpperCase() ?? null,
    optionalText(profile, "upi_id"),
    optionalText(profile, "logo_url"),
    optionalText(profile, "payment_qr_url"),
    optionalText(profile, "default_terms"),
    updatedAt,
    current.id,
  );
  return getBusinessProfile();
}

export function listCustomers(): Customer[] {
  return getDatabase()
    .prepare("SELECT * FROM customers ORDER BY created_at DESC")
    .all() as Customer[];
}

export function saveCustomer(value: unknown, id?: string): Customer {
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
  };
  const database = getDatabase();
  const updatedAt = now();

  if (id) {
    const result = database.prepare(`
      UPDATE customers SET customer_name = ?, contact_person = ?, phone = ?, email = ?,
        billing_address = ?, city = ?, state = ?, pincode = ?, gstin = ?, updated_at = ?
      WHERE id = ?
    `).run(
      fields.customer_name,
      fields.contact_person,
      fields.phone,
      fields.email,
      fields.billing_address,
      fields.city,
      fields.state,
      fields.pincode,
      fields.gstin,
      updatedAt,
      id,
    );
    if (!result.changes) throw new LocalStoreError("Customer was not found.", 404);
  } else {
    const createdAt = updatedAt;
    id = randomUUID();
    database.prepare(`
      INSERT INTO customers (
        id, customer_name, contact_person, phone, email, billing_address,
        city, state, pincode, gstin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      fields.customer_name,
      fields.contact_person,
      fields.phone,
      fields.email,
      fields.billing_address,
      fields.city,
      fields.state,
      fields.pincode,
      fields.gstin,
      createdAt,
      updatedAt,
    );
  }

  return database.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Customer;
}

export function deleteCustomer(id: string) {
  const result = getDatabase().prepare("DELETE FROM customers WHERE id = ?").run(id);
  if (!result.changes) throw new LocalStoreError("Customer was not found.", 404);
}

export function listProducts(): Product[] {
  return getDatabase()
    .prepare("SELECT * FROM products ORDER BY category, product_name")
    .all() as Product[];
}

export function saveProduct(value: unknown, id?: string): Product {
  const input = asRecord(value, "Product");
  const fields = {
    category: requiredText(input, "category", "Category"),
    product_name: requiredText(input, "product_name", "Product name"),
    description: optionalText(input, "description"),
  };
  const database = getDatabase();
  const updatedAt = now();

  try {
    if (id) {
      const result = database.prepare(`
        UPDATE products
        SET category = ?, product_name = ?, description = ?, updated_at = ?
        WHERE id = ?
      `).run(fields.category, fields.product_name, fields.description, updatedAt, id);
      if (!result.changes) throw new LocalStoreError("Product was not found.", 404);
    } else {
      id = randomUUID();
      database.prepare(`
        INSERT INTO products (id, category, product_name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, fields.category, fields.product_name, fields.description, updatedAt, updatedAt);
    }
  } catch (error) {
    if (error instanceof LocalStoreError) throw error;
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new LocalStoreError(`A product named "${fields.product_name}" already exists.`, 409);
    }
    throw error;
  }

  return database.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product;
}

export function syncBrochureProducts() {
  const database = getDatabase();
  const timestamp = now();
  const upsert = database.prepare(`
    INSERT INTO products (id, category, product_name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_name) DO UPDATE SET
      category = excluded.category,
      description = excluded.description,
      updated_at = excluded.updated_at
  `);
  const sync = database.transaction(() => {
    for (const product of BROCHURE_PRODUCTS) {
      upsert.run(randomUUID(), product.category, product.product_name, product.description, timestamp, timestamp);
    }
  });
  sync();
  return BROCHURE_PRODUCTS.length;
}

export function deleteProduct(id: string) {
  const result = getDatabase().prepare("DELETE FROM products WHERE id = ?").run(id);
  if (!result.changes) throw new LocalStoreError("Product was not found.", 404);
}

function parseJson<T>(value: string | null, label: string): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new LocalStoreError(`Saved ${label} data is invalid.`, 500);
  }
}

type InvoiceRow = Omit<Invoice, "customer_snapshot" | "shipping_snapshot" | "business_snapshot" | "items"> & {
  customer_snapshot: string;
  shipping_snapshot: string | null;
  business_snapshot: string;
};

function mapInvoice(row: InvoiceRow): Invoice {
  const items = getDatabase()
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid")
    .all(row.id) as InvoiceItem[];

  return {
    ...row,
    customer_snapshot: parseJson(row.customer_snapshot, "customer snapshot")!,
    shipping_snapshot: parseJson(row.shipping_snapshot, "shipping snapshot"),
    business_snapshot: parseJson(row.business_snapshot, "business snapshot")!,
    subtotal: Number(row.subtotal),
    adjustments: Number(row.adjustments),
    total_amount: Number(row.total_amount),
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_amount: Number(item.line_amount),
    })),
  };
}

export function listInvoices(): Invoice[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM invoices ORDER BY created_at DESC")
    .all() as InvoiceRow[];
  return rows.map(mapInvoice);
}

export function getInvoice(id: string): Invoice {
  const row = getDatabase().prepare("SELECT * FROM invoices WHERE id = ?").get(id) as InvoiceRow | undefined;
  if (!row) throw new LocalStoreError("Invoice was not found.", 404);
  return mapInvoice(row);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function numericValue(record: RecordData, key: string, label: string) {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) throw new LocalStoreError(`${label} must be a valid number.`);
  return value;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function saveInvoice(value: unknown, itemValues: unknown, invoiceId?: string): Invoice {
  const input = asRecord(value, "Invoice");
  if (!Array.isArray(itemValues) || itemValues.length < 1 || itemValues.length > 500) {
    throw new LocalStoreError("An invoice must contain between 1 and 500 product rows.");
  }

  const invoiceNumber = requiredText(input, "invoice_number", "Invoice number");
  const parsedNumber = invoiceNumber.match(/^ABR\/(\d{4}-\d{2})\/(.+)$/);
  if (!parsedNumber) throw new LocalStoreError("Invoice number must use the format ABR/YYYY-YY/serial.");

  const invoiceDate = requiredText(input, "invoice_date", "Invoice date");
  if (!isValidDate(invoiceDate)) throw new LocalStoreError("Invoice date must be a valid calendar date.");
  if (parsedNumber[1] !== getIndianFinancialYear(invoiceDate).financialYear) {
    throw new LocalStoreError("Invoice number financial year must match the invoice date.");
  }
  if (input.financial_year !== parsedNumber[1] || input.serial_number !== parsedNumber[2]) {
    throw new LocalStoreError("Invoice number, financial year, and serial number must match.");
  }

  const customerSnapshot = asRecord(input.customer_snapshot, "Customer snapshot");
  const businessSnapshot = asRecord(input.business_snapshot, "Business snapshot");
  requiredText(customerSnapshot, "customer_name", "Snapshot customer name");
  requiredText(businessSnapshot, "business_name", "Snapshot business name");
  requiredText(input, "customer_name", "Customer name");
  requiredText(input, "customer_phone", "Customer phone");

  const items = itemValues.map((value, index) => {
    const item = asRecord(value, `Item ${index + 1}`);
    const productName = requiredText(item, "product_name", `Item ${index + 1} product name`);
    const quantity = numericValue(item, "quantity", `Item ${index + 1} quantity`);
    const unitPrice = numericValue(item, "unit_price", `Item ${index + 1} rate`);
    const lineAmount = numericValue(item, "line_amount", `Item ${index + 1} amount`);
    if (quantity <= 0 || unitPrice < 0 || lineAmount < 0) {
      throw new LocalStoreError(`Item ${index + 1} must have a positive quantity and non-negative rate and amount.`);
    }
    if (roundMoney(quantity) !== quantity || roundMoney(unitPrice) !== unitPrice || roundMoney(lineAmount) !== lineAmount) {
      throw new LocalStoreError(`Item ${index + 1} values must have at most two decimal places.`);
    }
    if (roundMoney(quantity * unitPrice) !== lineAmount) {
      throw new LocalStoreError(`Item ${index + 1} amount does not match quantity multiplied by rate.`);
    }
    return {
      product_id: optionalText(item, "product_id"),
      category: optionalText(item, "category"),
      product_name: productName,
      description: optionalText(item, "description"),
      hsn_sac: optionalText(item, "hsn_sac"),
      quantity,
      unit: optionalText(item, "unit") || "Pcs",
      unit_price: unitPrice,
      line_amount: lineAmount,
    };
  });

  const subtotal = numericValue(input, "subtotal", "Subtotal");
  const adjustments = numericValue(input, "adjustments", "Adjustments");
  const totalAmount = numericValue(input, "total_amount", "Total amount");
  if (
    subtotal < 0 ||
    totalAmount < 0 ||
    roundMoney(items.reduce((total, item) => total + item.line_amount, 0)) !== roundMoney(subtotal) ||
    roundMoney(subtotal + adjustments) !== roundMoney(totalAmount)
  ) {
    throw new LocalStoreError("Invoice totals do not match the submitted line items.");
  }
  const amountInWords = convertNumberToIndianWords(roundMoney(totalAmount));
  const shippingSnapshot = input.shipping_snapshot === null || input.shipping_snapshot === undefined
    ? null
    : asRecord(input.shipping_snapshot, "Shipping snapshot");
  if (shippingSnapshot) {
    requiredText(shippingSnapshot, "recipient_name", "Shipping recipient");
    requiredText(shippingSnapshot, "delivery_address", "Shipping address");
    requiredText(shippingSnapshot, "city", "Shipping city");
    requiredText(shippingSnapshot, "state", "Shipping state");
    requiredText(shippingSnapshot, "pincode", "Shipping PIN code");
  }

  const database = getDatabase();
  const timestamp = now();
  const id = invoiceId || randomUUID();
  const insertInvoice = database.prepare(`
    INSERT INTO invoices (
      id, invoice_number, financial_year, serial_number, invoice_date, po_number, po_date,
      customer_id, customer_name, customer_phone, customer_email, customer_address,
      customer_city, customer_state, customer_pincode, customer_gstin, customer_snapshot,
      shipping_snapshot, business_snapshot, subtotal, adjustments, tax_amount, total_amount,
      amount_in_words, terms, additional_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateInvoice = database.prepare(`
    UPDATE invoices SET
      invoice_number = ?, financial_year = ?, serial_number = ?, invoice_date = ?, po_number = ?,
      po_date = ?, customer_id = ?, customer_name = ?, customer_phone = ?, customer_email = ?,
      customer_address = ?, customer_city = ?, customer_state = ?, customer_pincode = ?,
      customer_gstin = ?, customer_snapshot = ?, shipping_snapshot = ?, business_snapshot = ?,
      subtotal = ?, adjustments = ?, tax_amount = ?, total_amount = ?, amount_in_words = ?,
      terms = ?, additional_notes = ?, updated_at = ?
    WHERE id = ?
  `);
  const insertItem = database.prepare(`
    INSERT INTO invoice_items (
      id, invoice_id, product_id, category, product_name, description, hsn_sac,
      quantity, unit, unit_price, line_amount, total_price, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const save = database.transaction(() => {
      const oldInvoice = invoiceId
        ? database.prepare("SELECT created_at FROM invoices WHERE id = ?").get(invoiceId) as { created_at: string } | undefined
        : undefined;
      if (invoiceId && !oldInvoice) throw new LocalStoreError("Invoice was not found.", 404);

      const common = [
        invoiceNumber,
        parsedNumber[1],
        parsedNumber[2],
        invoiceDate,
        optionalText(input, "po_number"),
        optionalText(input, "po_date"),
        optionalText(input, "customer_id"),
        requiredText(input, "customer_name", "Customer name"),
        requiredText(input, "customer_phone", "Customer phone"),
        optionalText(input, "customer_email"),
        typeof input.customer_address === "string" ? input.customer_address : "",
        typeof input.customer_city === "string" ? input.customer_city : "",
        typeof input.customer_state === "string" ? input.customer_state : "",
        typeof input.customer_pincode === "string" ? input.customer_pincode : "",
        optionalText(input, "customer_gstin"),
        JSON.stringify(customerSnapshot),
        shippingSnapshot ? JSON.stringify(shippingSnapshot) : null,
        JSON.stringify(businessSnapshot),
        roundMoney(subtotal),
        roundMoney(adjustments),
        roundMoney(adjustments),
        roundMoney(totalAmount),
        amountInWords,
        optionalText(input, "terms"),
        optionalText(input, "additional_notes"),
      ] as const;

      if (invoiceId && oldInvoice) {
        updateInvoice.run(...common, timestamp, invoiceId);
        database.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(invoiceId);
      } else {
        insertInvoice.run(id, ...common, timestamp, timestamp);
      }

      for (const item of items) {
        insertItem.run(
          randomUUID(),
          id,
          item.product_id,
          item.category,
          item.product_name,
          item.description,
          item.hsn_sac,
          item.quantity,
          item.unit,
          item.unit_price,
          roundMoney(item.line_amount),
          roundMoney(item.line_amount),
          timestamp,
        );
      }
    });
    save();
  } catch (error) {
    if (error instanceof LocalStoreError) throw error;
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new LocalStoreError(`Invoice number "${invoiceNumber}" already exists. Choose a unique number.`, 409);
    }
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      throw new LocalStoreError("The selected customer or product no longer exists.", 400);
    }
    throw error;
  }

  return getInvoice(id);
}

export function deleteInvoice(id: string) {
  const result = getDatabase().prepare("DELETE FROM invoices WHERE id = ?").run(id);
  if (!result.changes) throw new LocalStoreError("Invoice was not found.", 404);
}

export function getDashboardSummary() {
  const database = getDatabase();
  const counts = {
    invoicesCount: (database.prepare("SELECT COUNT(*) AS count FROM invoices").get() as { count: number }).count,
    customersCount: (database.prepare("SELECT COUNT(*) AS count FROM customers").get() as { count: number }).count,
    productsCount: (database.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number }).count,
  };
  return {
    ...counts,
    recentInvoices: (database
      .prepare("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5")
      .all() as InvoiceRow[]).map(mapInvoice),
    businessProfile: getBusinessProfile(),
  };
}

export function getLocalAsset(id: string) {
  return getDatabase()
    .prepare("SELECT id, type, file_name, mime_type FROM local_assets WHERE id = ?")
    .get(id) as { id: string; type: "logo" | "qr"; file_name: string; mime_type: string } | undefined;
}

export function addLocalAsset(asset: {
  id: string;
  type: "logo" | "qr";
  file_name: string;
  mime_type: string;
}) {
  getDatabase().prepare(`
    INSERT INTO local_assets (id, type, file_name, mime_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(asset.id, asset.type, asset.file_name, asset.mime_type, now());
}
