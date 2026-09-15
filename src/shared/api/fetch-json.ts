import { authenticatedFetch } from "./auth";
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
  input: string,
  schema: ZodType<T>,
  options: FetchJsonOptions = {}
) {
  const { acceptErrorResponse = false, ...init } = options;
  const response = await authenticatedFetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers
    }
  });
  const data: unknown = await response.json();
  if (response.status === 401 || response.status === 403) {
    throw new HttpError(response.status === 401 && typeof data === "object" && data !== null && "resultCode" in data && data.resultCode === 1003 ? "Сессия завершена. Откройте сервис по ссылке для входа." : "Запрос отклонён сервером", response.status);
  }

  if (!response.ok && !acceptErrorResponse) {
    throw new HttpError(`Отсутствует связь с сервером. Статус: ${response.status}`, response.status);
  }

  return {
    data: schema.parse(data),
    status: response.status
  };
}
