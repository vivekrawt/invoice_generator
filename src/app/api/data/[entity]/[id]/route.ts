import { NextResponse } from "next/server";
import { apiError, requireAppAuth, requireSameOrigin } from "@/lib/supabase/http";
import {
  deleteCustomer,
  deleteInvoice,
  deleteProduct,
  deleteRateChart,
  getInvoice,
  getRateChart,
  saveCustomer,
  saveInvoice,
  saveProduct,
  saveRateChart,
} from "@/lib/supabase/store";

type RouteContext = { params: Promise<{ entity: string; id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const { entity, id } = await params;
    if (entity === "invoices") {
      return NextResponse.json({ data: await getInvoice(auth.context, id) });
    }
    if (entity === "rate-charts") {
      return NextResponse.json({ data: await getRateChart(auth.context, id) });
    }
    return NextResponse.json({ error: "This data resource cannot be read by ID." }, { status: 404 });
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
    const { entity, id } = await params;
    const body = await request.json() as Record<string, unknown>;

    switch (entity) {
      case "customers":
        return NextResponse.json({ data: await saveCustomer(auth.context, body, id) });
      case "products":
        return NextResponse.json({ data: await saveProduct(auth.context, body, id) });
      case "invoices":
        return NextResponse.json({ data: await saveInvoice(auth.context, body.invoice, body.items, id) });
      case "rate-charts":
        return NextResponse.json({ data: await saveRateChart(auth.context, body, id) });
      default:
        return NextResponse.json({ error: "This data resource cannot be updated." }, { status: 405 });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const auth = await requireAppAuth();
    if (!auth.ok) return auth.response;
    const { entity, id } = await params;

    switch (entity) {
      case "customers":
        await deleteCustomer(auth.context, id);
        break;
      case "products":
        await deleteProduct(auth.context, id);
        break;
      case "invoices":
        await deleteInvoice(auth.context, id);
        break;
      case "rate-charts":
        await deleteRateChart(auth.context, id);
        break;
      default:
        return NextResponse.json({ error: "This data resource cannot be deleted." }, { status: 405 });
    }
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return apiError(error);
  }
}
