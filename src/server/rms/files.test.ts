import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleFiles } from "./files";
const secret = "01234567890123456789012345678901";
function request(admin: boolean, method = "GET", csrf = "csrf", body = '{"name":"docs"}') {
  const header = Buffer.from('{"alg":"HS256"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ id: 1, user_token: "invite", purpose: "access", csrfToken: "csrf", sid: "session", exp: Date.now() / 1000 + 60, is_admin: admin })).toString("base64url");
  const token = `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
  return new Request("https://app.test/api/admin/files?include_deleted=true", { method, headers: { Cookie: `access_token=${token}`, "X-CSRF-Token": csrf }, ...(["POST", "PUT"].includes(method) ? { body } : {}) });
}
beforeEach(() => { vi.stubEnv("RMS_SIGNING_KEY", secret); vi.stubEnv("RMS_API_URL", "http://rms.test"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("rejects regular users without contacting files", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", fetch);
  expect((await handleFiles(request(false))).status).toBe(403);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("rejects forged client roles and missing CSRF", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect((await handleFiles(new Request("https://app.test/api/admin/files", { headers: { role: "admin" } }))).status).toBe(401);
  expect((await handleFiles(request(true, "POST", ""))).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
it("proxies admin writes with original body and query", async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}"))); vi.stubGlobal("fetch", fetch);
  expect((await handleFiles(request(true, "POST"))).status).toBe(200);
  expect(fetch).toHaveBeenLastCalledWith("http://rms.test/files/?include_deleted=true", expect.objectContaining({ method: "POST", body: '{"name":"docs"}' }));
});

it("rejects unsupported file formats before forwarding to RMS files", async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}"))); vi.stubGlobal("fetch", fetch);
  expect((await handleFiles(request(true, "POST", "csrf", JSON.stringify({ is_file: true, name: "report.docx" })))).status).toBe(400);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(["report.pdf", "page.html", "REPORT.PDF"])("accepts supported file %s", async name => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}"))); vi.stubGlobal("fetch", fetch);
  expect((await handleFiles(request(true, "POST", "csrf", JSON.stringify({ is_file: true, name })))).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(2);
});

const directoryId = "a7954397-4aee-48e1-8b90-d5bbca8bf5f3";
const directory = { id: directoryId, name: "Updated", priority: 12, parent_id: null, is_file: false, icon: null };
it("confirms a committed directory update after RMS loses the write response", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response("{}"))
    .mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValueOnce(Response.json({ ...directory, deleted_at: null }));
  vi.stubGlobal("fetch", fetch);
  const response = await handleFiles(request(true, "PUT", "csrf", JSON.stringify(directory)), directoryId);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject(directory);
  expect(fetch).toHaveBeenLastCalledWith(`http://rms.test/files/${directoryId}`, expect.objectContaining({ method: "GET", body: undefined }));
  expect(fetch).toHaveBeenCalledTimes(3);
});
it.each([
  { ...directory, name: "Old name" },
  { ...directory, priority: 0 },
  { ...directory, icon: "different" },
  { ...directory, parent_id: "another-folder" },
  { ...directory, deleted_at: "2026-10-25" }
])("keeps the failure when read-back does not confirm the saved directory: %j", async saved => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}"))
    .mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValueOnce(Response.json(saved)));
  expect((await handleFiles(request(true, "PUT", "csrf", JSON.stringify(directory)), directoryId)).status).toBe(502);
});
it("does not hide RMS validation conflicts", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response("{}"))
    .mockResolvedValueOnce(Response.json({ error: "conflict" }, { status: 409 }));
  vi.stubGlobal("fetch", fetch);
  expect((await handleFiles(request(true, "PUT", "csrf", JSON.stringify(directory)), directoryId)).status).toBe(409);
  expect(fetch).toHaveBeenCalledTimes(2);
});
