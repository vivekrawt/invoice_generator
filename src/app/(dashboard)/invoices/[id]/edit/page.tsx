import { InvoiceForm } from "@/components/invoices/invoice-form";

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  return <InvoiceForm invoiceId={params.id} />;
}
