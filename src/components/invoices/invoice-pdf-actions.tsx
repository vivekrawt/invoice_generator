"use client";

import * as React from "react";
import { Download, Printer, Eye, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "./invoice-pdf-document";
import type { Invoice } from "@/types/database.types";

interface InvoicePDFActionsProps {
  invoice: Invoice;
  size?: "default" | "sm";
  variant?: "outline" | "default";
}

export function InvoicePDFActions({
  invoice,
  size = "sm",
}: InvoicePDFActionsProps) {
  const [generating, setGenerating] = React.useState(false);
  const [printing, setPrinting] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const generateBlob = async (): Promise<Blob> => {
    if (!invoice.business_snapshot || !invoice.customer_snapshot || !invoice.items?.length) {
      throw new Error("Invoice snapshot or line-item data is missing. Reload the saved invoice and try again.");
    }

    let enrichedInvoice = invoice;
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem("abira_business_profile") : null;
      if (cached) {
        const bp = JSON.parse(cached) as Partial<any>;
        if (bp) {
          enrichedInvoice = {
            ...enrichedInvoice,
            business_snapshot: {
              ...enrichedInvoice.business_snapshot,
              stamp_url: enrichedInvoice.business_snapshot.stamp_url || bp.stamp_url || null,
              signature_url: enrichedInvoice.business_snapshot.signature_url || bp.signature_url || null,
              payment_qr_url: enrichedInvoice.business_snapshot.payment_qr_url || bp.payment_qr_url || null,
              logo_url: enrichedInvoice.business_snapshot.logo_url || bp.logo_url || null,
            },
          };
        }
      }
    } catch {}

    const doc = <InvoicePDFDocument invoice={enrichedInvoice} />;
    const asPdf = pdf(doc);
    return await asPdf.toBlob();
  };

  const handleDownload = async () => {
    try {
      setGenerating(true);
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);
      const safeInvoiceNo = (invoice.invoice_number || "Invoice").replace(/[\/\\]/g, "_");

      const link = document.createElement("a");
      link.href = url;
      link.download = `ABIRA_${safeInvoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Could not generate PDF. Please check invoice details and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);

      // Open in a hidden iframe or new window for immediate print dialog
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.focus();
      } else {
        // Fallback: download
        handleDownload();
      }
    } catch (err) {
      console.error("Error preparing invoice for printing:", err);
      alert(err instanceof Error ? `Could not prepare PDF for printing: ${err.message}` : "Could not prepare PDF for printing.");
    } finally {
      setPrinting(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      setPreviewOpen(true);
      if (!pdfBlobUrl) {
        const blob = await generateBlob();
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      }
    } catch (err) {
      console.error("Error loading PDF preview:", err);
      setPreviewOpen(false);
      alert(err instanceof Error ? `Could not load PDF preview: ${err.message}` : "Could not load PDF preview.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size={size}
          onClick={handleOpenPreview}
          className="text-xs gap-1 border-slate-300 hover:bg-slate-50"
          title="Preview PDF"
        >
          <Eye className="h-3.5 w-3.5 text-slate-600" />
          <span className="hidden sm:inline">Preview</span>
        </Button>

        <Button
          variant="outline"
          size={size}
          onClick={handlePrint}
          disabled={printing}
          className="text-xs gap-1 border-slate-300 hover:bg-slate-50"
          title="Print Invoice"
        >
          {printing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Printer className="h-3.5 w-3.5 text-slate-600" />
          )}
          <span className="hidden sm:inline">Print</span>
        </Button>

        <Button
          size={size}
          onClick={handleDownload}
          disabled={generating}
          className="text-xs gap-1.5 bg-[#0b1f3a] hover:bg-[#132c50] text-white"
          title="Download genuine A4 PDF"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </>
          )}
        </Button>
      </div>

      {/* Fullscreen PDF Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-w-4xl w-[95vw] h-[88vh] flex flex-col p-4"
          onClose={() => setPreviewOpen(false)}
        >
          <DialogHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0b1f3a]" />
              <DialogTitle className="text-sm font-semibold">
                PDF Preview: {invoice.invoice_number}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={generating}
                className="text-xs gap-1 bg-[#0b1f3a] hover:bg-[#132c50] h-8"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save PDF</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full bg-slate-100 rounded-md overflow-hidden mt-2 border border-slate-200">
            {pdfBlobUrl ? (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="Invoice PDF Preview"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span>Rendering PDF document...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
