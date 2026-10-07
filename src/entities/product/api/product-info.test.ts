import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/shared/api/fetch-json", () => ({ fetchJson: vi.fn() }));
import { fetchJson } from "@/shared/api/fetch-json";
import { fetchProductInfo } from "./product-info";

const result = (data: unknown[], resultCode = 0) => ({ data: { resultCode, messages: ["Ошибка RMS"], data }, status: 200 });
beforeEach(() => vi.resetAllMocks());

describe("product information search", () => {
  it.each(["Соус & сыр", "$$$Камбала вяленая", "Рыба + соль 50% #1 ?"])("preserves special characters in code and name searches: %s", async (value) => {
    vi.mocked(fetchJson).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([{ id: "found" }]));
    expect(await fetchProductInfo("store", value, [])).toEqual([{ id: "found", receipts: [] }]);
    expect(vi.mocked(fetchJson).mock.calls.map(([url]) => Object.fromEntries(new URL(url, "http://app.test").searchParams))).toEqual([
      { store_id: "store", code: value }, { store_id: "store", name: value }
    ]);
  });
  it("searches known GUIDs by product_id before falling back to code and name", async () => {
    const uid = "ed901a67-5fc4-11ef-8da0-00155d1a6906";
    vi.mocked(fetchJson).mockResolvedValue(result([]));
    await fetchProductInfo("store", uid, [{ uid }]);
    expect(vi.mocked(fetchJson).mock.calls.map(([url]) => Object.fromEntries(new URL(url, "http://app.test").searchParams))).toEqual([
      { store_id: "store", product_id: uid }, { store_id: "store", code: uid }, { store_id: "store", name: uid }
    ]);
  });
  it("does not send unknown GUIDs as product_id", async () => {
    vi.mocked(fetchJson).mockResolvedValue(result([]));
    await fetchProductInfo("store", "ed901a67-5fc4-11ef-8da0-00155d1a6906", [{ uid: "another-id" }]);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    for (const [url] of vi.mocked(fetchJson).mock.calls) expect(new URL(url, "http://app.test").searchParams.has("product_id")).toBe(false);
  });
  it("does not query RMS for an unresolved scanned product", async () => {
    expect(await fetchProductInfo("store", "unknown", [], true)).toEqual([]);
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it("stops on the first nonempty response and preserves all choices", async () => {
    vi.mocked(fetchJson).mockResolvedValue(result([{ id: "a" }, { id: "b" }]));
    expect(await fetchProductInfo("store", "code", [])).toHaveLength(2);
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });
  it("does not fall back for scanned product IDs", async () => {
    vi.mocked(fetchJson).mockResolvedValue(result([]));
    expect(await fetchProductInfo("store", "scanned-id", [{ uid: "scanned-id" }], true)).toEqual([]);
    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledWith("/api/entities/product/info?store_id=store&product_id=scanned-id", expect.anything(), expect.anything());
  });
  it("does not hide RMS failures with fallback searches", async () => {
    vi.mocked(fetchJson).mockResolvedValue(result([], 1));
    await expect(fetchProductInfo("store", "code", [])).rejects.toThrow("Ошибка RMS");
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });
});

it("assigns receipts from the response only to the matching product and store", async () => {
  const receipt = { type: "Перемещение", date: "2025-11-20T09:41:56", number: "ИКЦБ-025735", supplier: "101_Сочи_РЦ", store_id: "store", product_id: "a" };
  vi.mocked(fetchJson).mockResolvedValue({ data: { resultCode: 0, messages: [], data: [{ id: "a" }, { id: "b" }], receipts: [receipt, { ...receipt, store_id: "other" }] }, status: 200 });
  const products = await fetchProductInfo("store", "code", []);
  expect(products[0].receipts).toEqual([receipt]);
  expect(products[1].receipts).toEqual([]);
});

it("preserves receipts nested in a product", async () => {
  const receipt = { type: "Перемещение", date: "2025-12-27T12:39:59", number: "ИКЦБ-028703", supplier: "101_Сочи_РЦ", store_id: "store", product_id: "a" };
  vi.mocked(fetchJson).mockResolvedValue(result([{ id: "a", receipts: [receipt] }]));
  expect((await fetchProductInfo("store", "code", []))[0].receipts).toEqual([receipt]);
});
