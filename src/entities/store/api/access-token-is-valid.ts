export async function accessTokenIsValid(
  token: string,
  signal?: AbortSignal
) {
  const response = await fetch(
    `/api/access-token-is-valid?${new URLSearchParams({ token })}`,
    { cache: "no-store", signal }
  );

  return response.status === 200;
}
