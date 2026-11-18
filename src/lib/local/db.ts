import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { BROCHURE_PRODUCTS } from "../constants/products-seed.ts";

type GlobalWithDatabase = typeof globalThis & {
  abiraDatabase?: Database.Database;
};

const globalWithDatabase = globalThis as GlobalWithDatabase;

export function getDataDirectory() {
  return path.resolve(process.env.ABIRA_DATA_DIR || path.join(process.cwd(), "data"));
}

export function getDatabase() {
  if (globalWithDatabase.abiraDatabase) return globalWithDatabase.abiraDatabase;

  const dataDirectory = getDataDirectory();
  mkdirSync(path.join(dataDirectory, "assets"), { recursive: true });

  const database = new Database(path.join(dataDirectory, "abira-invoices.sqlite"));
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS business_profiles (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      pan TEXT,
      bank_account_name TEXT,
      bank_name TEXT,
      account_number TEXT,
      ifsc TEXT,
      upi_id TEXT,
      logo_url TEXT,
      payment_qr_url TEXT,
      default_terms TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      billing_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      gstin TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      product_name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      financial_year TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      po_number TEXT,
      po_date TEXT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      customer_address TEXT NOT NULL,
      customer_city TEXT NOT NULL,
      customer_state TEXT NOT NULL,
      customer_pincode TEXT NOT NULL,
      customer_gstin TEXT,
      customer_snapshot TEXT NOT NULL,
      shipping_snapshot TEXT,
      business_snapshot TEXT NOT NULL,
      subtotal REAL NOT NULL,
      adjustments REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      amount_in_words TEXT NOT NULL,
      terms TEXT,
      additional_notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_financial_year ON invoices(financial_year);

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      category TEXT,
      product_name TEXT NOT NULL,
      description TEXT,
      hsn_sac TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'Pcs',
      unit_price REAL NOT NULL,
      line_amount REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

    CREATE TABLE IF NOT EXISTS local_credentials (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_assets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('logo', 'qr')),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  database.prepare(`
    INSERT OR IGNORE INTO business_profiles (
      id, business_name, address, city, state, pincode, phone, email, pan,
      bank_account_name, bank_name, account_number, ifsc, upi_id, logo_url,
      payment_qr_url, default_terms, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "00000000-0000-0000-0000-000000000001",
    "ABIRA Enterprises",
    "ABIRA Enterprises, Millenia 2, Sector 37D, Gurugram, Haryana – 122001",
    "Gurugram",
    "Haryana",
    "122001",
    "8882511472",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    `Payment Terms:
Payment should be initiated within 15 days of delivery.

Delivery Policy:
Products are generally delivered within 3 days of ordering.

Return and Exchange Policy:
No returns or exchanges are accepted after delivery, except in cases involving defective or damaged products.`,
    now,
    now,
  );

  const insertProduct = database.prepare(`
    INSERT OR IGNORE INTO products (id, category, product_name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seedProducts = database.transaction(() => {
    for (const product of BROCHURE_PRODUCTS) {
      insertProduct.run(
        randomUUID(),
        product.category,
        product.product_name,
        product.description,
        now,
        now,
      );
    }
  });
  seedProducts();

  globalWithDatabase.abiraDatabase = database;
  return database;
}
