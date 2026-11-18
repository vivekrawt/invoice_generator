import { NextResponse } from "next/server";
import { requireLocalAuth, requireSameOrigin, apiError } from "@/lib/local/http";
import {
  getBusinessProfile,
  getDashboardSummary,
  listCustomers,
  listInvoices,
  listProducts,
  saveBusinessProfile,
  saveCustomer,
  saveInvoice,
  saveProduct,
  syncBrochureProducts,
} from "@/lib/local/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ entity: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const { entity } = await params;

  try {
    switch (entity) {
      case "dashboard":
        return NextResponse.json({ data: getDashboardSummary() });
      case "business-profile":
        return NextResponse.json({ data: getBusinessProfile() });
      case "customers":
        return NextResponse.json({ data: listCustomers() });
      case "products":
        return NextResponse.json({ data: listProducts() });
      case "invoices":
        return NextResponse.json({ data: listInvoices() });
      default:
        return NextResponse.json({ error: "Unknown local data resource." }, { status: 404 });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { entity } = await params;

  try {
    const body = await request.json() as Record<string, unknown>;
    switch (entity) {
      case "customers":
        return NextResponse.json({ data: saveCustomer(body) }, { status: 201 });
      case "products":
        if (body.action === "sync-brochure") {
          return NextResponse.json({ data: { count: syncBrochureProducts() } });
        }
        return NextResponse.json({ data: saveProduct(body) }, { status: 201 });
      case "invoices":
        return NextResponse.json({
          data: saveInvoice(body.invoice, body.items),
        }, { status: 201 });
      default:
        return NextResponse.json({ error: "This local data resource cannot be created." }, { status: 405 });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { entity } = await params;

  try {
    if (entity !== "business-profile") {
      return NextResponse.json({ error: "This local data resource cannot be updated here." }, { status: 405 });
    }
    return NextResponse.json({ data: saveBusinessProfile(await request.json()) });
  } catch (error) {
    return apiError(error);
  }
}
