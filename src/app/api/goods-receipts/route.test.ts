import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/goods-receipt", () => import("../../../entities/goods-receipt"));
vi.mock("@/server/rms/client", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/one-c/client", () => ({ fetchOneCJson: vi.fn(), fetchOneCResponse: vi.fn(), ONE_C_API_URL: "http://one-c.test" }));

import { requireSession } from "@/server/rms/client";
import { fetchOneCJson, fetchOneCResponse } from "@/server/one-c/client";
import { GET } from "./route";
import { POST } from "./confirm/route";
import { POST as complete } from "./complete/route";
import { GET as print } from "./print/route";

beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); });

describe("goods receipt routes", () => {
  it("requires a session and validates receipt type, id and seller before completing", async () => {
    const request = (body: unknown) => new Request("http://app.test/api/goods-receipts/complete", { method: "POST", body: JSON.stringify(body) });
    vi.mocked(requireSession).mockResolvedValueOnce(new NextResponse(null, { status: 401 }));
    expect((await complete(request({}))).status).toBe(401);
    for (const body of [
      { type: "RECEIPT", receiptsId: "receipt" },
      { type: "RECEIPT", receiptsId: "receipt", seller: " " },
      { type: "RECEIPT", receiptsId: "", seller: "seller" },
      { type: "UNKNOWN", receiptsId: "receipt", seller: "seller" }
    ]) {
      expect((await complete(request(body))).status).toBe(400);
    }
    expect(fetchOneCResponse).not.toHaveBeenCalled();
  });

  it.each([200, 400])("forwards completion to 1C and preserves response status %s", async (status) => {
    const body = { type: "TRANSFER", receiptsId: "receipt-id", seller: "seller-id" };
    const data = { code: status === 200 ? 1 : 0, mess: "Ответ 1С", data: { status: "accepted" } };
    vi.mocked(fetchOneCResponse).mockResolvedValue({ data, status, ok: status === 200, url: "" });
    const response = await complete(new Request("http://app.test/api/goods-receipts/complete", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(data);
    expect(fetchOneCResponse).toHaveBeenCalledWith("/CompleteGoodsReceipts", expect.anything(), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store"
    });
  });

  it("returns a completion error when 1C is unavailable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.mocked(fetchOneCResponse).mockRejectedValue(new Error("Unavailable"));
      const response = await complete(new Request("http://app.test/api/goods-receipts/complete", { method: "POST", body: JSON.stringify({ type: "RECEIPT", receiptsId: "receipt", seller: "seller" }) }));
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ code: 0, mess: "Не удалось подтвердить получение товара в 1С" });
    } finally { log.mockRestore(); }
  });

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
