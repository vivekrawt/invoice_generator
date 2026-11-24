import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAppAuth } from "@/lib/supabase/http";
import { listInvoices, updateInvoiceDriveUrl } from "@/lib/supabase/store";
import { uploadInvoicePdfToDrive, getDriveConfig } from "@/lib/google-drive";
import { InvoicePDFDocument } from "@/components/invoices/invoice-pdf-document";

export const maxDuration = 120; // 2 minutes for bulk operations

export async function POST() {
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
    const allInvoices = await listInvoices(context);

    // Filter invoices not yet synced to Google Drive
    const unbackedInvoices = allInvoices.filter((inv) => !inv.drive_file_url);

    if (unbackedInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All invoices are already backed up to Google Drive.",
        total: allInvoices.length,
        synced: 0,
        failed: 0,
      });
    }

    let synced = 0;
    let failed = 0;
    const errors: Array<{ invoiceNumber: string; error: string }> = [];

    for (const inv of unbackedInvoices) {
      try {
        const doc = React.createElement(InvoicePDFDocument, { invoice: inv });
        const pdfBuffer = await renderToBuffer(doc as any);

        const uploadResult = await uploadInvoicePdfToDrive(inv, pdfBuffer);

        await updateInvoiceDriveUrl(
          context,
          inv.id,
          uploadResult.fileId,
          uploadResult.webViewLink
        );

        synced++;
      } catch (err) {
        failed++;
        errors.push({
          invoiceNumber: inv.invoice_number,
          error: err instanceof Error ? err.message : "Sync error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: unbackedInvoices.length,
      synced,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error during bulk Drive sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bulk sync failed.",
      },
      { status: 500 }
    );
  }
}
