import { NextResponse } from "next/server";
import { apiError, requireLocalAuth, requireSameOrigin } from "@/lib/local/http";
import {
  deleteCustomer,
  deleteInvoice,
  deleteProduct,
  getInvoice,
  saveCustomer,
  saveInvoice,
  saveProduct,
} from "@/lib/local/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ entity: string; id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const { entity, id } = await params;
  if (entity !== "invoices") {
    return NextResponse.json({ error: "This local data resource cannot be read by ID." }, { status: 404 });
  }

  try {
    return NextResponse.json({ data: getInvoice(id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { entity, id } = await params;

  try {
    const body = await request.json() as Record<string, unknown>;
    switch (entity) {
      case "customers":
        return NextResponse.json({ data: saveCustomer(body, id) });
      case "products":
        return NextResponse.json({ data: saveProduct(body, id) });
      case "invoices":
        return NextResponse.json({ data: saveInvoice(body.invoice, body.items, id) });
      default:
        return NextResponse.json({ error: "This local data resource cannot be updated." }, { status: 405 });
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authError = requireLocalAuth(request);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { entity, id } = await params;

  try {
    switch (entity) {
      case "customers":
        deleteCustomer(id);
        break;
      case "products":
        deleteProduct(id);
        break;
      case "invoices":
        deleteInvoice(id);
        break;
      default:
        return NextResponse.json({ error: "This local data resource cannot be deleted." }, { status: 405 });
    }
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return apiError(error);
  }
}
