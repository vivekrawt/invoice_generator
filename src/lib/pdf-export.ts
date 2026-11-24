import React from "react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/components/invoices/invoice-pdf-document";
import type { Invoice } from "@/types/database.types";

/**
 * Generates a PDF Blob for the given invoice in the browser.
 */
export async function generateInvoicePdfBlob(invoice: Invoice): Promise<Blob> {
  const doc = React.createElement(InvoicePDFDocument, { invoice });
  const instance = pdf(doc as any);
  return await instance.toBlob();
}

/**
 * Generates a base64 encoded PDF string for the given invoice in the browser.
 * Useful for transferring directly to upload APIs without triggering server-side rendering.
 */
export async function generateInvoicePdfBase64(invoice: Invoice): Promise<string> {
  const blob = await generateInvoicePdfBlob(invoice);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl ? dataUrl.split(",")[1] || "" : "";
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}
