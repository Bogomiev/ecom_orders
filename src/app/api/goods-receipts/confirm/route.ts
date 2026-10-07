import { NextResponse } from "next/server";
import { ConfirmInvoiceRequestSchema, InvoiceActionResponseSchema } from "@/entities/goods-receipt";
import { requireSession } from "@/server/rms/client";
import { fetchOneCResponse } from "@/server/one-c/client";

export async function POST(request: Request) {
  const authError = await requireSession(request);
  if (authError) return authError;
  const body = ConfirmInvoiceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ code: 0, mess: "Некорректные параметры приемки" }, { status: 400 });
  }
  try {
    const response = await fetchOneCResponse("/ConfirmInvoice", InvoiceActionResponseSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.data),
      cache: "no-store"
    });
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    console.error("Failed to confirm invoice in 1C", error);
    return NextResponse.json({ code: 0, mess: "Не удалось принять товар в 1С" }, { status: 502 });
  }
}
