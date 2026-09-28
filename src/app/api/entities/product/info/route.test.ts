import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/rms/client", () => ({ requireSession: vi.fn(), proxyRMS: vi.fn(), authError: (status: number) => new Response(null, { status }) }));
import { requireSession, proxyRMS } from "@/server/rms/client";
import { GET } from "./route";
import { NextResponse } from "next/server";
beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); vi.mocked(proxyRMS).mockResolvedValue(new NextResponse()); });
it("forwards the current store and only the search field to RMS", async () => {
  const request = new Request("http://app.test/api/entities/product/info?store_id=store&code=123&ignored=x");
  await GET(request);
  expect(proxyRMS).toHaveBeenCalledWith(request, "/product_info?store_id=store&code=123");
});
it("requires an authenticated session", async () => {
  vi.mocked(requireSession).mockResolvedValue(new NextResponse(null, { status: 401 }));
  expect((await GET(new Request("http://app.test/api/entities/product/info?store_id=store&name=abc"))).status).toBe(401);
  expect(proxyRMS).not.toHaveBeenCalled();
});
it("rejects missing stores and ambiguous searches", async () => {
  for (const query of ["name=abc", "store_id=store", "store_id=store&code=1&name=abc"]) {
    expect((await GET(new Request(`http://app.test/api/entities/product/info?${query}`))).status).toBe(400);
  }
  expect(proxyRMS).not.toHaveBeenCalled();
});

it.each(["code", "name"])("preserves dollar signs and Cyrillic when forwarding %s to RMS", async (field) => {
  const value = "$$$Камбала вяленая";
  const query = new URLSearchParams({ store_id: "store", [field]: value });
  await GET(new Request(`http://app.test/api/entities/product/info?${query}`));
  const path = vi.mocked(proxyRMS).mock.calls[0][1];
  expect(path).toContain(`${field}=%24%24%24`);
  expect(path).not.toContain("%2524");
  expect(Object.fromEntries(new URL(path, "http://rms.test").searchParams)).toEqual({ store_id: "store", [field]: value });
});
