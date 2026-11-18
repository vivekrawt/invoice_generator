"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoicePDFActions } from "@/components/invoices/invoice-pdf-actions";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types/database.types";

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [financialYear, setFinancialYear] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const [page, setPage] = React.useState(1);
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadInvoices = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      setInvoices(await apiRequest<Invoice[]>("/api/data/invoices"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? `Invoices could not be loaded: ${error.message}` : "Invoices could not be loaded.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const financialYears = React.useMemo(
    () => [...new Set(invoices.map((invoice) => invoice.financial_year).filter(Boolean))].sort().reverse(),
    [invoices]
  );

  const filteredInvoices = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return invoices
      .filter((invoice) => {
        const customer = invoice.customer_snapshot?.customer_name || invoice.customer_name || "";
        const invoiceDate = invoice.invoice_date;
        return (
          (!query ||
            invoice.invoice_number.toLocaleLowerCase().includes(query) ||
            customer.toLocaleLowerCase().includes(query)) &&
          (!financialYear || invoice.financial_year === financialYear) &&
          (!fromDate || invoiceDate >= fromDate) &&
          (!toDate || invoiceDate <= toDate)
        );
      })
      .sort((a, b) => {
        const difference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === "newest" ? -difference : difference;
      });
  }, [financialYear, fromDate, invoices, searchQuery, sortOrder, toDate]);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, financialYear, fromDate, toDate, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const pageInvoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/data/invoices/${invoiceToDelete.id}`, { method: "DELETE" });
      setInvoices((current) => current.filter((invoice) => invoice.id !== invoiceToDelete.id));
      setInvoiceToDelete(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? `Invoice could not be deleted: ${error.message}` : "Invoice could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Invoices</h1>
          <p className="mt-1 text-xs text-slate-500">Search, filter, and manage saved invoice records.</p>
        </div>
        <Link href="/invoices/new">
          <Button size="sm" className="gap-1.5 bg-[#0b1f3a] text-xs hover:bg-[#132c50]">
            <Plus className="h-3.5 w-3.5" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {errorMessage && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Search invoice number or customer name"
              placeholder="Invoice number or customer name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <label className="space-y-1 text-xs text-slate-600">
            Financial year
            <select
              aria-label="Filter by financial year"
              value={financialYear}
              onChange={(event) => setFinancialYear(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
            >
              <option value="">All years</option>
              {financialYears.map((year) => <option key={year} value={year}>FY {year}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            From date
            <Input aria-label="Filter from invoice date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-9 text-xs" />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            To date
            <Input aria-label="Filter through invoice date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-9 text-xs" />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            Sort by creation
            <select
              aria-label="Sort invoice list"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">Invoices ({filteredInvoices.length})</CardTitle>
            <CardDescription className="text-xs text-slate-500">Snapshots preserve the details recorded at issue time.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading invoices...
            </div>
          ) : pageInvoices.length ? (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice number</TableHead>
                    <TableHead>Invoice date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="min-w-[330px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">{invoice.invoice_number}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="min-w-[160px] text-xs">
                        {invoice.customer_snapshot?.customer_name || invoice.customer_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">
                        {formatCurrency(Number(invoice.total_amount))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {formatDate(invoice.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <InvoicePDFActions invoice={invoice} size="sm" />
                          <Link href={`/invoices/${invoice.id}/edit`} aria-label={`Edit ${invoice.invoice_number}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8" title="Edit invoice">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/invoices/new?duplicate=${encodeURIComponent(invoice.id)}`} aria-label={`Duplicate ${invoice.invoice_number}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8" title="Duplicate invoice">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-700 hover:bg-red-50"
                            title="Delete invoice"
                            aria-label={`Delete ${invoice.invoice_number}`}
                            onClick={() => setInvoiceToDelete(invoice)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">
              {invoices.length ? <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" /> : <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />}
              <p className="font-medium text-slate-700">{invoices.length ? "No invoices match these filters" : "No invoices saved yet"}</p>
              {!invoices.length && (
                <Link href="/invoices/new" className="mt-4 inline-block">
                  <Button size="sm" className="gap-1.5 bg-[#0b1f3a] text-xs hover:bg-[#132c50]">
                    <Plus className="h-3.5 w-3.5" /> Create first invoice
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={Boolean(invoiceToDelete)} onOpenChange={(open) => !open && !deleting && setInvoiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice permanently?</DialogTitle>
            <DialogDescription>
              This permanently deletes invoice {invoiceToDelete?.invoice_number} and its item rows. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setInvoiceToDelete(null)}>Cancel</Button>
            <Button type="button" disabled={deleting} onClick={deleteInvoice} className="bg-red-700 text-white hover:bg-red-800">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
