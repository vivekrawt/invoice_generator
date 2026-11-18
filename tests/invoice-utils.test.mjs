import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { convertNumberToIndianWords, getIndianFinancialYear } from "../src/lib/number-to-words.ts";
import {
  hasValidBusinessImageSignature,
  isAllowedBusinessImageType,
  MAX_BUSINESS_ASSET_SIZE,
} from "../src/lib/asset-validation.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("financial year starts on 1 April", () => {
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

test("business image validation checks allowed MIME types, size, and file signatures", () => {
  assert.equal(MAX_BUSINESS_ASSET_SIZE, 2 * 1024 * 1024);
  assert.equal(isAllowedBusinessImageType("image/svg+xml"), false);
  assert.equal(hasValidBusinessImageSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(hasValidBusinessImageSignature(new Uint8Array([255, 216, 255]), "image/jpeg"), true);
  assert.equal(
    hasValidBusinessImageSignature(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), "image/webp"),
    true
  );
  assert.equal(hasValidBusinessImageSignature(new Uint8Array([0, 1, 2]), "image/png"), false);
});

test("local SQLite CRUD preserves invoice snapshots and validates invoice writes", () => {
  const dataDirectory = mkdtempSync(path.join(os.tmpdir(), "abira-invoice-test-"));
  const script = `
    import assert from "node:assert/strict";
    const databaseModule = await import("./src/lib/local/db.ts");
    const store = await import("./src/lib/local/store.ts");
    const auth = await import("./src/lib/local/auth.ts");
    const database = databaseModule.getDatabase();

    assert.equal(store.getBusinessProfile().business_name, "ABIRA Enterprises");
    assert.equal(store.listInvoices().length, 0);

    const customer = store.saveCustomer({
      customer_name: "Test Customer",
      phone: "1234567890",
      billing_address: "1 Test Street",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122001",
    });
    const editedCustomer = store.saveCustomer({
      customer_name: "Updated Customer",
      phone: "1234567890",
      billing_address: "2 Test Street",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122001",
    }, customer.id);
    assert.equal(editedCustomer.customer_name, "Updated Customer");

    const product = store.saveProduct({ category: "Testing", product_name: "Test Product", description: "Original description" });
    assert.equal(store.listProducts().some((row) => row.id === product.id), true);

    const makeInvoice = (overrides = {}) => ({
      invoice_number: "ABR/2025-26/0001",
      financial_year: "2025-26",
      serial_number: "0001",
      invoice_date: "2026-03-31",
      customer_id: customer.id,
      customer_name: "Test Customer",
      customer_phone: "1234567890",
      customer_address: "1 Test Street",
      customer_city: "Gurugram",
      customer_state: "Haryana",
      customer_pincode: "122001",
      customer_snapshot: {
        customer_id: customer.id,
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
      amount_in_words: "Incorrect client value is replaced",
      ...overrides,
    });
    const makeItem = (overrides = {}) => ({
      product_id: product.id,
      category: product.category,
      product_name: product.product_name,
      description: product.description,
      quantity: 2,
      unit: "Pcs",
      unit_price: 125,
      line_amount: 250,
      ...overrides,
    });

    const invoice = store.saveInvoice(makeInvoice(), [makeItem()]);
    assert.equal(invoice.invoice_number, "ABR/2025-26/0001");
    assert.equal(invoice.amount_in_words, "Rupees Two Hundred Fifty Only");
    assert.equal(invoice.items.length, 1);
    assert.throws(
      () => store.saveInvoice(makeInvoice(), [makeItem({ quantity: 0, line_amount: 0 })]),
      (error) => error.status === 400
    );
    assert.throws(
      () => store.saveInvoice(makeInvoice(), [makeItem({ unit_price: -1, line_amount: -2 })]),
      (error) => error.status === 400
    );
    assert.throws(
      () => store.saveInvoice(makeInvoice({ invoice_date: "2026-04-01" }), [makeItem()]),
      (error) => error.status === 400
    );
    assert.throws(
      () => store.saveInvoice(makeInvoice(), [makeItem()]),
      (error) => error.status === 409
    );

    const createInvoiceWithRows = (rowCount, serialNumber) => {
      const total = rowCount;
      return store.saveInvoice(
        makeInvoice({
          invoice_number: \`ABR/2025-26/\${serialNumber}\`,
          serial_number: serialNumber,
          subtotal: total,
          total_amount: total,
        }),
        Array.from({ length: rowCount }, (_, index) => makeItem({
          product_id: null,
          product_name: \`Custom Product \${index + 1}\`,
          quantity: 1,
          unit_price: 1,
          line_amount: 1,
        }))
      );
    };
    const fiveRowInvoice = createInvoiceWithRows(5, "0002");
    const twentyRowInvoice = createInvoiceWithRows(20, "0003");
    assert.equal(fiveRowInvoice.items.length, 5);
    assert.equal(twentyRowInvoice.items.length, 20);

    const editedInvoice = store.saveInvoice(
      makeInvoice({ subtotal: 500, total_amount: 500 }),
      [makeItem({ quantity: 4, line_amount: 500 })],
      invoice.id
    );
    assert.equal(editedInvoice.invoice_number, invoice.invoice_number);
    assert.equal(editedInvoice.items[0].quantity, 4);
    assert.equal(editedInvoice.created_at, invoice.created_at);

    store.saveBusinessProfile({
      ...store.getBusinessProfile(),
      business_name: "Changed Business Name",
    });
    assert.equal(store.getInvoice(invoice.id).business_snapshot.business_name, "ABIRA Enterprises");

    store.deleteCustomer(customer.id);
    store.deleteProduct(product.id);
    const afterMasterDeletes = store.getInvoice(invoice.id);
    assert.equal(afterMasterDeletes.customer_snapshot.customer_name, "Test Customer");
    assert.equal(afterMasterDeletes.items[0].product_name, "Test Product");
    assert.equal(afterMasterDeletes.items[0].product_id, null);

    store.deleteInvoice(invoice.id);
    store.deleteInvoice(fiveRowInvoice.id);
    store.deleteInvoice(twentyRowInvoice.id);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM invoice_items").get().count, 0);
    assert.equal(store.listInvoices().length, 0);

    assert.equal(auth.hasLocalPassword(), false);
    assert.throws(() => auth.setInitialLocalPassword("short"));
    auth.setInitialLocalPassword("correct horse battery staple");
    assert.equal(auth.verifyLocalPassword("correct horse battery staple"), true);
    assert.equal(auth.verifyLocalPassword("wrong password"), false);
    const session = auth.createLocalSession();
    assert.equal(auth.isLocalSessionValid(session.token), true);
    auth.deleteLocalSession(session.token);
    assert.equal(auth.isLocalSessionValid(session.token), false);
    const activeSession = auth.createLocalSession();
    assert.equal(auth.changeLocalPassword("wrong password", "another secure password"), false);
    assert.equal(auth.changeLocalPassword("correct horse battery staple", "another secure password"), true);
    assert.equal(auth.verifyLocalPassword("correct horse battery staple"), false);
    assert.equal(auth.verifyLocalPassword("another secure password"), true);
    assert.equal(auth.isLocalSessionValid(activeSession.token), false);
    database.close();
  `;

  try {
    execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
      cwd: projectRoot,
      env: { ...process.env, ABIRA_DATA_DIR: dataDirectory },
      encoding: "utf8",
    });
  } catch (error) {
    assert.fail(error.stderr?.toString() || `Integration subprocess exited with status ${error.status}.`);
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});
