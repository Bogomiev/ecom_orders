export async function accessTokenIsValid(
  token: string,
  signal?: AbortSignal
) {
  const response = await fetch(
    `/api/access-token-is-valid?${new URLSearchParams({ token })}`,
    { cache: "no-store", signal }
  );

  if (response.status >= 500) throw new Error("Не удалось проверить токен доступа в RMS");
  return response.status === 200;
}
