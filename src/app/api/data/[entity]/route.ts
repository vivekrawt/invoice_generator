import { NextResponse } from "next/server";
import { apiError, requireAppAuth, requireSameOrigin } from "@/lib/supabase/http";
import {
  getBusinessProfile,
  getDashboardSummary,
  listCustomers,
  listInvoices,
  listProducts,
  listRateCharts,
  saveBusinessProfile,
  saveCustomer,
  saveInvoice,
  saveProduct,
  saveRateChart,
  syncBrochureProducts,
} from "@/lib/supabase/store";

type RouteContext = { params: Promise<{ entity: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const { entity } = await params;

    switch (entity) {
      case "dashboard":
        return NextResponse.json({ data: await getDashboardSummary(auth.context) });
      case "business-profile":
        return NextResponse.json({ data: await getBusinessProfile(auth.context) });
      case "customers":
        return NextResponse.json({ data: await listCustomers(auth.context) });
      case "products":
        return NextResponse.json({ data: await listProducts(auth.context) });
      case "invoices":
        return NextResponse.json({ data: await listInvoices(auth.context) });
      case "rate-charts":
        return NextResponse.json({ data: await listRateCharts(auth.context) });
      default:
        return NextResponse.json({ error: "Unknown data resource." }, { status: 404 });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const { entity } = await params;
    const body = await request.json() as Record<string, unknown>;

    switch (entity) {
      case "customers":
        return NextResponse.json({ data: await saveCustomer(auth.context, body) }, { status: 201 });
      case "products":
        if (body.action === "sync-brochure") {
          return NextResponse.json({ data: { count: await syncBrochureProducts(auth.context) } });
        }
        return NextResponse.json({ data: await saveProduct(auth.context, body) }, { status: 201 });
      case "invoices":
        return NextResponse.json({
          data: await saveInvoice(auth.context, body.invoice, body.items),
        }, { status: 201 });
      case "rate-charts":
        return NextResponse.json({ data: await saveRateChart(auth.context, body) }, { status: 201 });
      default:
        return NextResponse.json({ error: "This data resource cannot be created." }, { status: 405 });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const { entity } = await params;
    if (entity !== "business-profile") {
      return NextResponse.json({ error: "This data resource cannot be updated here." }, { status: 405 });
    }
    return NextResponse.json({
      data: await saveBusinessProfile(auth.context, await request.json()),
    });
  } catch (error) {
    return apiError(error);
  }
}
