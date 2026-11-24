import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { requireAppAuth } from "@/lib/supabase/http";
import { getInvoice, updateInvoiceDriveUrl } from "@/lib/supabase/store";
import { uploadInvoicePdfToDrive, getDriveConfig } from "@/lib/google-drive";
import { InvoicePDFDocument } from "@/components/invoices/invoice-pdf-document";
import type { Invoice } from "@/types/database.types";

export const maxDuration = 60; // Allow sufficient time for PDF rendering and Drive upload

export async function POST(req: NextRequest) {
  try {
    const config = getDriveConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Drive is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID.",
        },
        { status: 400 }
      );
    }

    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const body = await req.json();
    const { invoiceId, pdfBase64, invoice: inlineInvoice } = body as {
      invoiceId?: string;
      pdfBase64?: string;
      invoice?: Invoice;
    };

    let invoice: Invoice;
    if (inlineInvoice && inlineInvoice.invoice_number) {
      invoice = inlineInvoice;
    } else {
      if (!invoiceId) {
        return NextResponse.json(
          { success: false, error: "Missing invoiceId parameter." },
          { status: 400 }
        );
      }
      invoice = await getInvoice(context, invoiceId);
    }

    let pdfBuffer: Buffer;
    if (pdfBase64) {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } else {
      // Render PDF server-side using React PDF
      const doc = React.createElement(InvoicePDFDocument, { invoice });
      const blob = await pdf(doc as any).toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    }

    const uploadResult = await uploadInvoicePdfToDrive(invoice, pdfBuffer);

    // Update invoice record with the Google Drive link
    try {
      await updateInvoiceDriveUrl(
        context,
        invoice.id,
        uploadResult.fileId,
        uploadResult.webViewLink
      );
    } catch (dbErr) {
      console.warn("Could not update invoice in database with Drive URL:", dbErr);
    }

    return NextResponse.json({
      success: true,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      fileName: uploadResult.fileName,
    });
  } catch (error) {
    console.error("Error uploading invoice to Drive:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload to Google Drive failed.",
      },
      { status: 500 }
    );
  }
}
