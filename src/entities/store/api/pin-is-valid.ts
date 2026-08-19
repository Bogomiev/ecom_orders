export async function pinIsValid(pin: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/pin-is-valid?${new URLSearchParams({ pin: pin.trim() })}`,
    { cache: "no-store", signal }
  );

  return response.status === 200;
}
