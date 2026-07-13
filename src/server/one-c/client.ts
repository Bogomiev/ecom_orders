export const ONE_C_API_URL =
  process.env.ONE_C_API_URL ??
  "http://1c.ikorniysrv.ru:85/eshop/hs/PAPI/v1";

type OneCFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function fetchOneCJson<T>(
  path: string,
  init: OneCFetchInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(`${ONE_C_API_URL}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(
      `1C request ${path} failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}
