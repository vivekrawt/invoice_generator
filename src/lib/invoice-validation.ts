import { AppError } from "./app-error.ts";
import { convertNumberToIndianWords, getIndianFinancialYear } from "./number-to-words.ts";
import type {
  BusinessSnapshot,
  CustomerSnapshot,
  Invoice,
  InvoiceItem,
} from "../types/database.types.ts";

type RecordData = Record<string, unknown>;

export type InvoicePayload = Omit<Invoice, "id" | "created_at" | "updated_at" | "items"> & {
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  customer_gstin: string | null;
};

export type InvoiceItemPayload = Omit<InvoiceItem, "id" | "invoice_id" | "created_at">;

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

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function numericValue(record: RecordData, key: string, label: string) {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) throw new AppError(`${label} must be a valid number.`);
  return value;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateInvoiceWrite(value: unknown, itemValues: unknown): {
  invoice: InvoicePayload;
  items: InvoiceItemPayload[];
} {
  const input = asRecord(value, "Invoice");
  if (!Array.isArray(itemValues) || itemValues.length < 1 || itemValues.length > 500) {
    throw new AppError("An invoice must contain between 1 and 500 product rows.");
  }

  const invoiceNumber = requiredText(input, "invoice_number", "Invoice number");
  const parsedNumber = invoiceNumber.match(/^ABR\/(\d{4}-\d{2})\/(.+)$/);
  if (!parsedNumber) throw new AppError("Invoice number must use the format ABR/YYYY-YY/serial.");

  const invoiceDate = requiredText(input, "invoice_date", "Invoice date");
  if (!isValidDate(invoiceDate)) throw new AppError("Invoice date must be a valid calendar date.");
  if (parsedNumber[1] !== getIndianFinancialYear(invoiceDate).financialYear) {
    throw new AppError("Invoice number financial year must match the invoice date.");
  }
  if (input.financial_year !== parsedNumber[1] || input.serial_number !== parsedNumber[2]) {
    throw new AppError("Invoice number, financial year, and serial number must match.");
  }

  const customerSnapshot = asRecord(input.customer_snapshot, "Customer snapshot");
  const businessSnapshot = asRecord(input.business_snapshot, "Business snapshot");
  const validatedCustomerSnapshot: CustomerSnapshot = {
    customer_id: optionalText(customerSnapshot, "customer_id"),
    customer_name: requiredText(customerSnapshot, "customer_name", "Snapshot customer name"),
    contact_person: optionalText(customerSnapshot, "contact_person"),
    phone: requiredText(customerSnapshot, "phone", "Snapshot customer phone"),
    email: optionalText(customerSnapshot, "email"),
    billing_address: requiredText(customerSnapshot, "billing_address", "Snapshot billing address"),
    city: requiredText(customerSnapshot, "city", "Snapshot city"),
    state: requiredText(customerSnapshot, "state", "Snapshot state"),
    pincode: requiredText(customerSnapshot, "pincode", "Snapshot PIN code"),
    gstin: optionalText(customerSnapshot, "gstin"),
  };
  const validatedBusinessSnapshot: BusinessSnapshot = {
    business_name: requiredText(businessSnapshot, "business_name", "Snapshot business name"),
    address: requiredText(businessSnapshot, "address", "Snapshot business address"),
    city: requiredText(businessSnapshot, "city", "Snapshot business city"),
    state: requiredText(businessSnapshot, "state", "Snapshot business state"),
    pincode: requiredText(businessSnapshot, "pincode", "Snapshot business PIN code"),
    phone: requiredText(businessSnapshot, "phone", "Snapshot business phone"),
    email: optionalText(businessSnapshot, "email"),
    pan: optionalText(businessSnapshot, "pan"),
    bank_account_name: optionalText(businessSnapshot, "bank_account_name"),
    bank_name: optionalText(businessSnapshot, "bank_name"),
    account_number: optionalText(businessSnapshot, "account_number"),
    ifsc: optionalText(businessSnapshot, "ifsc"),
    upi_id: optionalText(businessSnapshot, "upi_id"),
    logo_url: optionalText(businessSnapshot, "logo_url"),
    payment_qr_url: optionalText(businessSnapshot, "payment_qr_url"),
  };
  requiredText(input, "customer_name", "Customer name");
  requiredText(input, "customer_phone", "Customer phone");

  const items = itemValues.map((value, index): InvoiceItemPayload => {
    const item = asRecord(value, `Item ${index + 1}`);
    const productName = requiredText(item, "product_name", `Item ${index + 1} product name`);
    const quantity = numericValue(item, "quantity", `Item ${index + 1} quantity`);
    const unitPrice = numericValue(item, "unit_price", `Item ${index + 1} rate`);
    const lineAmount = numericValue(item, "line_amount", `Item ${index + 1} amount`);
    if (quantity <= 0 || unitPrice < 0 || lineAmount < 0) {
      throw new AppError(`Item ${index + 1} must have a positive quantity and non-negative rate and amount.`);
    }
    if (roundMoney(quantity) !== quantity || roundMoney(unitPrice) !== unitPrice || roundMoney(lineAmount) !== lineAmount) {
      throw new AppError(`Item ${index + 1} values must have at most two decimal places.`);
    }
    if (roundMoney(quantity * unitPrice) !== lineAmount) {
      throw new AppError(`Item ${index + 1} amount does not match quantity multiplied by rate.`);
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
    throw new AppError("Invoice totals do not match the submitted line items.");
  }

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

  return {
    invoice: {
      invoice_number: invoiceNumber,
      financial_year: parsedNumber[1],
      serial_number: parsedNumber[2],
      invoice_date: invoiceDate,
      po_number: optionalText(input, "po_number"),
      po_date: optionalText(input, "po_date"),
      customer_id: optionalText(input, "customer_id"),
      customer_name: requiredText(input, "customer_name", "Customer name"),
      customer_phone: requiredText(input, "customer_phone", "Customer phone"),
      customer_email: optionalText(input, "customer_email"),
      customer_address: typeof input.customer_address === "string" ? input.customer_address : "",
      customer_city: typeof input.customer_city === "string" ? input.customer_city : "",
      customer_state: typeof input.customer_state === "string" ? input.customer_state : "",
      customer_pincode: typeof input.customer_pincode === "string" ? input.customer_pincode : "",
      customer_gstin: optionalText(input, "customer_gstin"),
      customer_snapshot: validatedCustomerSnapshot,
      shipping_snapshot: shippingSnapshot as Invoice["shipping_snapshot"],
      business_snapshot: validatedBusinessSnapshot,
      subtotal: roundMoney(subtotal),
      adjustments: roundMoney(adjustments),
      total_amount: roundMoney(totalAmount),
      amount_in_words: convertNumberToIndianWords(roundMoney(totalAmount)),
      terms: optionalText(input, "terms"),
      additional_notes: optionalText(input, "additional_notes"),
    },
    items,
  };
}
