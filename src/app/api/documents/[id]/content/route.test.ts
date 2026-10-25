import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/rms/client", () => ({ requireSession: vi.fn(), fetchRMS: vi.fn(), rmsHeaders: () => new Headers(), authError: (status: number, _code: number, message: string) => Response.json({ messages: [message] }, { status }) }));
import { requireSession, fetchRMS } from "@/server/rms/client";
import { NextResponse } from "next/server";
import { GET } from "./route";
const id = "a7954397-4aee-48e1-8b90-d5bbca8bf5f3";
const context = { params: Promise.resolve({ id }) };
const request = () => new Request(`http://app.test/api/documents/${id}/content`);
beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); });
it("requires an authenticated session for document bytes", async () => {
  vi.mocked(requireSession).mockResolvedValue(new NextResponse(null, { status: 401 }));
  expect((await GET(request(), context)).status).toBe(401);
  expect(fetchRMS).not.toHaveBeenCalled();
});
it.each(["application/pdf", "text/html; charset=utf-8"])("serves %s with isolated no-store headers", async type => {
  vi.mocked(fetchRMS).mockResolvedValue(new Response("document", { headers: { "Content-Type": type } }));
  const response = await GET(request(), context);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Security-Policy")).toContain("sandbox");
  expect(await response.text()).toBe("document");
});
it("preserves not-found without exposing content", async () => {
  vi.mocked(fetchRMS).mockResolvedValue(Response.json({ error: "file not found" }, { status: 404 }));
  vi.mocked(fetchRMS).mockResolvedValueOnce(Response.json({ error: "file not found" }, { status: 404 })).mockResolvedValueOnce(Response.json({ error: "file not found" }, { status: 404 }));
  expect((await GET(request(), context)).status).toBe(404);
});

it("distinguishes an outdated RMS route from a missing document", async () => {
  vi.mocked(fetchRMS).mockResolvedValue(new Response("404 page not found", { status: 404 }));
  expect((await GET(request(), context)).status).toBe(502);
});
it("explains missing S3 content when the metadata still exists", async () => {
  vi.mocked(fetchRMS).mockResolvedValueOnce(Response.json({ error: "file not found" }, { status: 404 }))
    .mockResolvedValueOnce(Response.json({ is_file: true, deleted_at: null }));
  const response = await GET(request(), context);
  expect(response.status).toBe(404);
  expect((await response.json()).messages[0]).toContain("содержимое отсутствует");
});
