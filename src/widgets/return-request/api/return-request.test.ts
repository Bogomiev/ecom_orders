import { expect, it, vi } from "vitest";
import { authenticatedFetch } from "@/shared/api/auth";
import { cancelReturnRequest, fetchReturnRequestStatus } from "./return-request";

vi.mock("@/shared/api/auth", () => ({ authenticatedFetch: vi.fn() }));

it("uses the 1C error message from a failed return request", async () => {
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    Response.json({ mess: "Не удалось обработать заявку в 1С" }, { status: 501 })
  );

  await expect(cancelReturnRequest("store", "request"))
    .rejects.toThrow("Не удалось обработать заявку в 1С");
});

it("reads the confirmed status from RMS", async () => {
  const signal = new AbortController().signal;
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    Response.json({ resultCode: 0, data: { status: "COMPLETED" } })
  );

  await expect(fetchReturnRequestStatus("store", "request", signal))
    .resolves.toEqual({ status: "COMPLETED" });
  expect(authenticatedFetch).toHaveBeenLastCalledWith(
    "/api/rms/return_request/request/status?store_id=store",
    { signal, cache: "no-store" }
  );
});
