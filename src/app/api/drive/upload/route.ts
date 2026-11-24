import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAppAuth } from "@/lib/supabase/http";
import { getInvoice, updateInvoiceDriveUrl } from "@/lib/supabase/store";
import {
  uploadInvoicePdfToDrive,
  uploadRateChartPdfToDrive,
  getDriveConfig,
  UploadResult,
} from "@/lib/google-drive";
import { InvoicePDFDocument } from "@/components/invoices/invoice-pdf-document";
import type { Invoice } from "@/types/database.types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const body = await req.json();
    const {
      type = "invoice",
      invoiceId,
      pdfBase64,
      invoice: inlineInvoice,
      orgName,
      webhookUrl,
    } = body as {
      type?: "invoice" | "rate-chart";
      invoiceId?: string;
      pdfBase64?: string;
      invoice?: Invoice;
      orgName?: string;
      webhookUrl?: string;
    };

    const config = getDriveConfig();
    const hasWebhook = Boolean(webhookUrl?.trim() || config.webhookUrl);
    if (!config.isConfigured && !hasWebhook) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Drive is not configured. Please paste your Google Apps Script Webhook URL in Settings or set GOOGLE_DRIVE_WEBHOOK_URL in Vercel.",
        },
        { status: 400 }
      );
    }

    if (type === "rate-chart") {
      if (!pdfBase64) {
        return NextResponse.json(
          { success: false, error: "Missing pdfBase64 for rate chart backup." },
          { status: 400 }
        );
      }

      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const uploadResult = await uploadRateChartPdfToDrive({
        orgName,
        pdfBuffer,
        customWebhookUrl: webhookUrl,
      });

      return NextResponse.json({
        success: true,
        fileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
        fileName: uploadResult.fileName,
      });
    }

    // Invoice backup
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
      const doc = React.createElement(InvoicePDFDocument, { invoice });
      pdfBuffer = await renderToBuffer(doc as any);
    }

    const uploadResult: UploadResult = await uploadInvoicePdfToDrive(
      invoice,
      pdfBuffer,
      webhookUrl
    );

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
    console.error("Error uploading to Google Drive:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload to Google Drive failed.",
      },
      { status: 500 }
    );
  }
}
