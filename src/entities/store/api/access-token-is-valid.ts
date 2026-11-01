export type StoreSelectionSettings = {
  seller_selection_available: boolean;
  store_selection_available: boolean;
  store_selection_required: boolean;
};

export async function getAccessTokenSettings(token: string, signal?: AbortSignal): Promise<StoreSelectionSettings | null> {
  const response = await fetch(
    `/api/access-token-is-valid?${new URLSearchParams({ token })}`,
    { cache: "no-store", signal }
  );
  if (response.status >= 500) throw new Error("Не удалось проверить токен доступа в RMS");
  if (!response.ok) return null;
  return await response.json() as StoreSelectionSettings;
}

export async function accessTokenIsValid(token: string, signal?: AbortSignal) {
  return (await getAccessTokenSettings(token, signal)) !== null;
}
