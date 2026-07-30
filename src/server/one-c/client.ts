export const ONE_C_API_URL =
  process.env.ONE_C_API_URL ??
  "http://dev.1c.ikorniysrv.ru:85/eshop/hs/PAPI/v1";

type OneCFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

export async function fetchOneCJson<T>(
  path: string,
  schema: ZodType<T>,
  init: OneCFetchInit = {}
): Promise<T> {
  const result = await fetchOneCResponse(path, schema, init);
  if (!result.ok) {
    throw new Error(
      `1C request ${result.url} failed with status ${result.status}`
    );
  }
  return result.data;
}

export async function fetchOneCResponse<T>(
  path: string,
  schema: ZodType<T>,
  init: OneCFetchInit = {}
) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const requestUrl = `${ONE_C_API_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

  const response = await fetch(requestUrl, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(90_000)
  });

  return {
    data: schema.parse(await response.json()),
    ok: response.ok,
    status: response.status,
    url: requestUrl
  };
}
import type { ZodType } from "zod";
