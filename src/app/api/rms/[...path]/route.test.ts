import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/rms/client", () => ({ requireSession: vi.fn(), proxyRMS: vi.fn(), authError: (status: number) => new Response(null, { status }) }));
import { requireSession, proxyRMS } from "@/server/rms/client";
import { DELETE, GET, POST, PUT } from "./route";
import { NextResponse } from "next/server";
const handlers = { GET, POST, PUT, DELETE };
type Method = keyof typeof handlers;
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const call = (method: Method, path: string) => handlers[method](new Request(`http://app.test/api/rms/${path}`, { method }), context(path.split("?")[0]));
beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); vi.mocked(proxyRMS).mockResolvedValue(new NextResponse()); });
it.each<[Method, string, string]>([
  ["GET", "admin/stores", "/admin/stores/"],
  ["PUT", "admin/stores/00000000-0000-0000-0000-000000000001", "/admin/stores/00000000-0000-0000-0000-000000000001"],
])("checks admin access for %s %s", async (method, path, target) => {
  vi.mocked(requireSession).mockResolvedValueOnce(new NextResponse(null, { status: 403 }));
  expect((await call(method, path)).status).toBe(403);
  expect(requireSession).toHaveBeenCalledWith(expect.any(Request), true);
  expect(proxyRMS).not.toHaveBeenCalled();

  expect((await call(method, path)).status).toBe(200);
  expect(proxyRMS).toHaveBeenCalledWith(expect.any(Request), target);
});
it.each<[Method, string, string]>([
  ["GET", "stoppers", "/stoppers/"],
  ["POST", "stoppers", "/stoppers/"],
  ["PUT", "stoppers/3", "/stoppers/3"],
  ["DELETE", "stoppers/3", "/stoppers/3"],
  ["GET", "stoppers/positions?from=2026-11-02&to=2026-11-16&store_id=a&store_id=b", "/stoppers/positions?from=2026-11-02&to=2026-11-16&store_id=a&store_id=b"],
  ["POST", "stoppers/positions", "/stoppers/positions"],
  ["PUT", "stoppers/positions/stopper", "/stoppers/positions/stopper"],
  ["PUT", "stoppers/positions/period", "/stoppers/positions/period"],
  ["GET", "stoppers/products?q=%D0%B8%D0%BA", "/stoppers/products?q=%D0%B8%D0%BA"],
  ["GET", "tasks/types", "/tasks/types"],
  ["POST", "tasks/manual", "/tasks/manual"],
  ["GET", "tasks/7/stoppers", "/tasks/7/stoppers"],
  ["PUT", "tasks/7/stoppers/check", "/tasks/7/stoppers/check"],
  ["GET", "tasks/7/price_tags", "/tasks/7/price_tags"],
  ["POST", "tasks/7/price_tags", "/tasks/7/price_tags"],
  ["PUT", "tasks/7/price_tags/printed", "/tasks/7/price_tags/printed"],
  ["GET", "tasks/7/price_tags/products?q=%D1%87%D0%B0%D0%B9", "/tasks/7/price_tags/products?q=%D1%87%D0%B0%D0%B9"],
  ["PUT", "tasks/7/price_tags/12", "/tasks/7/price_tags/12"],
  ["DELETE", "tasks/7/price_tags/12", "/tasks/7/price_tags/12"],
  ["GET", "tasks/price_tags/product?store_id=s&product_id=p", "/tasks/price_tags/product?store_id=s&product_id=p"],
  ["POST", "tasks/price_tags/product", "/tasks/price_tags/product"]
])("forwards %s %s", async (method, path, target) => {
  await call(method, path);
  expect(proxyRMS).toHaveBeenCalledWith(expect.any(Request), target);
});
it.each<[Method, string]>([["PUT", "stoppers"], ["GET", "stoppers/3"], ["DELETE", "stoppers/positions"], ["PUT", "stoppers/0"], ["GET", "stoppers/positions/period"], ["PUT", "stoppers/products"], ["PUT", "stoppers/storage_modes"], ["GET", "promotions"], ["POST", "tasks/types"], ["GET", "tasks/manual"], ["PUT", "tasks/0/stoppers/check"], ["POST", "tasks/7/stoppers"], ["DELETE", "tasks/7/price_tags"], ["GET", "tasks/7/price_tags/12"], ["DELETE", "tasks/7/price_tags/printed"], ["PUT", "tasks/7/price_tags/0"], ["POST", "tasks/7/price_tags/products"], ["PUT", "tasks/price_tags/product"]])("rejects %s %s before contacting RMS", async (method, path) => {
  const response = await call(method, path);
  expect(response.status).toBe(404);
  expect(requireSession).not.toHaveBeenCalled();
  expect(proxyRMS).not.toHaveBeenCalled();
});
