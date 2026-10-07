import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/goods-receipt", () => import("../../../entities/goods-receipt"));
vi.mock("@/server/rms/client", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/one-c/client", () => ({ fetchOneCJson: vi.fn(), fetchOneCResponse: vi.fn(), ONE_C_API_URL: "http://one-c.test" }));

import { requireSession } from "@/server/rms/client";
import { fetchOneCJson, fetchOneCResponse } from "@/server/one-c/client";
import { GET } from "./route";
import { POST } from "./confirm/route";
import { GET as print } from "./print/route";

beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); });

describe("goods receipt routes", () => {
  it("loads all pages and forwards store/historyDays to 1C", async () => {
    vi.mocked(fetchOneCJson)
      .mockResolvedValueOnce({ page: 1, perPage: 1, totalPages: 2, totalItems: 2, items: [{ id: "receipt" }] })
      .mockResolvedValueOnce({ page: 2, perPage: 1, totalPages: 2, totalItems: 2, items: [{ id: "transfer" }] });
    const response = await GET(new Request("http://app.test/api/goods-receipts?store=store-id&historyDays=30"));
    expect(await response.json()).toEqual({ page: 1, perPage: 2, totalPages: 1, totalItems: 2, items: [{ id: "receipt" }, { id: "transfer" }] });
    expect(vi.mocked(fetchOneCJson).mock.calls.map(([path]) => path)).toEqual([
      "/GetGoodsReceipts?store=store-id&historyDays=30", "/GetGoodsReceipts?store=store-id&historyDays=30&page=2"
    ]);
  });

  it("does not contact 1C without a session", async () => {
    vi.mocked(requireSession).mockResolvedValue(new NextResponse(null, { status: 401 }));
    expect((await GET(new Request("http://app.test/api/goods-receipts"))).status).toBe(401);
    expect(fetchOneCJson).not.toHaveBeenCalled();
  });

  it("validates confirmation and preserves the 1C error response", async () => {
    const request = (body: unknown) => new Request("http://app.test/api/goods-receipts/confirm", { method: "POST", body: JSON.stringify(body) });
    expect((await POST(request({ invoiceId: "receipt" }))).status).toBe(400);
    expect(fetchOneCResponse).not.toHaveBeenCalled();
    const data = { code: 0, mess: "Документ уже принят" };
    vi.mocked(fetchOneCResponse).mockResolvedValue({ data, status: 400, ok: false, url: "" });
    const response = await POST(request({ invoiceId: "receipt", seller: "seller-id" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(data);
    expect(fetchOneCResponse).toHaveBeenCalledWith("/ConfirmInvoice", expect.anything(), expect.objectContaining({ method: "POST", body: '{"invoiceId":"receipt","seller":"seller-id"}' }));
  });

  it("prints through PrintInvoice and unwraps a JSON encoded base64 string", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('"JVBERi0="'));
    try {
      const response = await print(new Request("http://app.test/api/goods-receipts/print?id=receipt-id"));
      expect(await response.text()).toBe("JVBERi0=");
      expect(String(fetch.mock.calls[0][0])).toBe("http://one-c.test/PrintInvoice?id=receipt-id");
    } finally { fetch.mockRestore(); }
  });
});
