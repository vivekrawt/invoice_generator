"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  Package,
  ArrowRight,
  Plus,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, BusinessProfile } from "@/types/database.types";

interface DashboardData {
  invoicesCount: number;
  customersCount: number;
  productsCount: number;
  recentInvoices: Invoice[];
  businessProfile: BusinessProfile;
}

export default function DashboardPage() {
  const [invoicesCount, setInvoicesCount] = React.useState<number>(0);
  const [customersCount, setCustomersCount] = React.useState<number>(0);
  const [productsCount, setProductsCount] = React.useState<number>(0);
  const [recentInvoices, setRecentInvoices] = React.useState<Invoice[]>([]);
  const [businessProfile, setBusinessProfile] = React.useState<BusinessProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const data = await apiRequest<DashboardData>("/api/data/dashboard");
        setInvoicesCount(data.invoicesCount);
        setCustomersCount(data.customersCount);
        setProductsCount(data.productsCount);
        setRecentInvoices(data.recentInvoices);
        setBusinessProfile(data.businessProfile);
      } catch (err) {
        console.error("Could not load local dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome to the ABIRA Enterprises billing and catalogue management dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Package className="h-3.5 w-3.5" />
              Catalogue
            </Button>
          </Link>
          <Link href="/customers">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Customers
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5 text-xs bg-[#0b1f3a] hover:bg-[#132c50]">
              <Plus className="h-3.5 w-3.5" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Invoices */}
        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Invoices Generated
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "..." : invoicesCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All finalized & generated documents
            </p>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Customers
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center text-blue-800">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "..." : customersCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registered corporate & retail clients
            </p>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Products in Catalogue
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-800">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "..." : productsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Spanning 6 core packaging & stationery categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Recent Invoices & Business Profile Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices Card (2 columns) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Recent Invoices
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Latest billing documents generated
              </CardDescription>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading recent invoices...
              </div>
            ) : recentInvoices.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {inv.invoice_number}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.customer_snapshot?.customer_name || inv.customer_name || "Customer"} • {formatDate(inv.invoice_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(Number(inv.total_amount) || 0)}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        INVOICE
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-slate-800">
                  No invoices generated yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Create the first saved invoice to begin tracking billing documents.
                </p>
                <Link href="/invoices/new">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Profile Sidebar Card (1 column) */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">
                Business Profile
              </CardTitle>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                  Edit
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Verified business identification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Legal Entity
                </span>
                <span className="font-semibold text-slate-900 text-sm">
                  {businessProfile?.business_name || "ABIRA Enterprises"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Registered Address
                </span>
                <span className="text-slate-600 leading-relaxed block mt-0.5">
                  {businessProfile?.address ||
                    "Millenia 2, Sector 37D, Gurugram, Haryana – 122001"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Phone
                  </span>
                  <span className="font-medium text-slate-700">
                    {businessProfile?.phone || "8882511472"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Invoice Heading
                  </span>
                  <span className="font-semibold text-slate-900">
                    INVOICE
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-blue-50/60 p-3 border border-blue-100 flex items-start gap-2 text-slate-700">
              <ShieldCheck className="h-4 w-4 text-[#0b1f3a] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Standard compliance: All billing documents strictly use the heading <strong>INVOICE</strong> without unverified tax assumptions.
              </p>
            </div>
          </CardContent>
          <div className="p-4 pt-0">
            <Link href="/settings" className="w-full">
              <Button variant="outline" className="w-full text-xs">
                Manage Bank Details & QR
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
