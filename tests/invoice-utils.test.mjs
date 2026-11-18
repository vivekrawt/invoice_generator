import assert from "node:assert/strict";
import test from "node:test";
import { convertNumberToIndianWords, getIndianFinancialYear } from "../src/lib/number-to-words.ts";
import {
  hasValidBusinessImageSignature,
  isAllowedBusinessImageType,
  MAX_BUSINESS_ASSET_SIZE,
} from "../src/lib/asset-validation.ts";
import { validateInvoiceWrite } from "../src/lib/invoice-validation.ts";

function makeInvoice(overrides = {}) {
  return {
    invoice_number: "ABR/2025-26/0001",
    financial_year: "2025-26",
    serial_number: "0001",
    invoice_date: "2026-03-31",
    customer_name: "Test Customer",
    customer_phone: "1234567890",
    customer_snapshot: {
      customer_id: null,
      customer_name: "Test Customer",
      phone: "1234567890",
      billing_address: "1 Test Street",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122001",
    },
    shipping_snapshot: null,
    business_snapshot: {
      business_name: "ABIRA Enterprises",
      address: "Original business address",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122001",
      phone: "8882511472",
    },
    subtotal: 250,
    adjustments: 0,
    total_amount: 250,
    ...overrides,
  };
}

function makeItem(overrides = {}) {
  return {
    product_id: null,
    category: "Custom",
    product_name: "Custom product",
    description: "Customer-specific description",
    quantity: 2,
    unit: "Pcs",
    unit_price: 125,
    line_amount: 250,
    ...overrides,
  };
}

test("financial year changes on 1 April", () => {
  assert.deepEqual(getIndianFinancialYear("2026-03-31"), {
    financialYear: "2025-26",
    prefix: "ABR/2025-26/",
  });
  assert.deepEqual(getIndianFinancialYear("2026-04-01"), {
    financialYear: "2026-27",
    prefix: "ABR/2026-27/",
  });
});

test("amount in words handles zero and paise", () => {
  assert.equal(convertNumberToIndianWords(0), "Rupees Zero Only");
  assert.equal(convertNumberToIndianWords(12500.5), "Rupees Twelve Thousand Five Hundred and Fifty Paise Only");
});

test("server validation accepts 1, 5, and 20 rows with snapshots and optional GSTIN", () => {
  for (const rowCount of [1, 5, 20]) {
    const items = Array.from({ length: rowCount }, (_, index) =>
      makeItem({
        product_name: `Custom product ${index + 1}`,
        quantity: 1,
        unit_price: 25,
        line_amount: 25,
      }),
    );
    const { invoice, items: validatedItems } = validateInvoiceWrite(
      makeInvoice({ subtotal: rowCount * 25, total_amount: rowCount * 25 }),
      items,
    );
    assert.equal(validatedItems.length, rowCount);
    assert.equal(invoice.customer_gstin, null);
    assert.equal(invoice.total_amount, rowCount * 25);
    assert.equal(invoice.amount_in_words, convertNumberToIndianWords(rowCount * 25));
  }
});

test("server validation preserves shipping and custom-item details and manual pricing", () => {
  const { invoice, items } = validateInvoiceWrite(
    makeInvoice({
      customer_gstin: undefined,
      shipping_snapshot: {
        recipient_name: "Receiver",
        delivery_address: "2 Delivery Road",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
      },
      subtotal: 246.9,
      total_amount: 246.9,
    }),
    [makeItem({ quantity: 2, unit_price: 123.45, line_amount: 246.9 })],
  );
  assert.equal(invoice.shipping_snapshot.delivery_address, "2 Delivery Road");
  assert.equal(items[0].product_id, null);
  assert.equal(items[0].description, "Customer-specific description");
  assert.equal(items[0].unit_price, 123.45);
  assert.equal(invoice.amount_in_words, convertNumberToIndianWords(246.9));
});

test("server validation rejects invalid dates, fiscal years, quantities, rates, and totals", () => {
  assert.throws(() => validateInvoiceWrite(makeInvoice({ invoice_date: "2026-02-30" }), [makeItem()]));
  assert.throws(() => validateInvoiceWrite(makeInvoice({ financial_year: "2026-27" }), [makeItem()]));
  assert.throws(() => validateInvoiceWrite(makeInvoice(), [makeItem({ quantity: 0, line_amount: 0 })]));
  assert.throws(() => validateInvoiceWrite(makeInvoice(), [makeItem({ quantity: -1, line_amount: -125 })]));
  assert.throws(() => validateInvoiceWrite(makeInvoice(), [makeItem({ unit_price: -1, line_amount: -2 })]));
  assert.throws(() => validateInvoiceWrite(makeInvoice(), [makeItem({ unit_price: "invalid" })]));
  assert.throws(() => validateInvoiceWrite(makeInvoice(), [makeItem({ line_amount: 249 })]));
  assert.throws(() => validateInvoiceWrite(makeInvoice(), []));
});

test("business image validation checks allowed MIME types, size, and file signatures", () => {
  assert.equal(MAX_BUSINESS_ASSET_SIZE, 2 * 1024 * 1024);
  assert.equal(isAllowedBusinessImageType("image/svg+xml"), false);
  assert.equal(hasValidBusinessImageSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(hasValidBusinessImageSignature(new Uint8Array([255, 216, 255]), "image/jpeg"), true);
  assert.equal(
    hasValidBusinessImageSignature(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), "image/webp"),
    true,
  );
  assert.equal(hasValidBusinessImageSignature(new Uint8Array([0, 1, 2]), "image/png"), false);
});
