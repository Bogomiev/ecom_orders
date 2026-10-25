import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/rms/client", () => ({ requireSession: vi.fn(), proxyRMS: vi.fn(), authError: (status: number) => new Response(null, { status }) }));
import { requireSession, proxyRMS } from "@/server/rms/client";
import { NextResponse } from "next/server";
import { GET } from "./route";
beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); vi.mocked(proxyRMS).mockResolvedValue(new NextResponse("[]")); });
it("allows authenticated users and strips deleted and unrelated query parameters", async () => {
  const request = new Request("http://app.test/api/documents?include_deleted=true&other=1");
  expect((await GET(request)).status).toBe(200);
  expect(proxyRMS).toHaveBeenCalledWith(request, "/files/");
});
it("requires a session before requesting RMS metadata", async () => {
  vi.mocked(requireSession).mockResolvedValue(new NextResponse(null, { status: 401 }));
  expect((await GET(new Request("http://app.test/api/documents"))).status).toBe(401);
  expect(proxyRMS).not.toHaveBeenCalled();
});
