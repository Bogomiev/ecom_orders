import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

type FetchJsonOptions = RequestInit & {
  acceptErrorResponse?: boolean;
};

export async function fetchJson<T>(
  input: RequestInfo | URL,
  schema: ZodType<T>,
  options: FetchJsonOptions = {}
) {
  const { acceptErrorResponse = false, ...init } = options;
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers
    }
  });
  const data: unknown = await response.json();

  if (!response.ok && !acceptErrorResponse) {
    throw new HttpError(`Отсутствует связь с сервером. Статус: ${response.status}`, response.status);
  }

  return {
    data: schema.parse(data),
    status: response.status
  };
}
