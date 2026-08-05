import type { Seller } from "./types";

export const CURRENT_SELLER_STORAGE_KEY = "ecom-orders-current-seller";
export const CURRENT_SELLER_TTL_HOURS = 16;
export const CURRENT_SELLER_CHANGE_EVENT = "ecom-orders-current-seller-change";

type StoredSeller = {
  seller: Seller;
  selectedAt: string;
};

function isSeller(value: unknown): value is Seller {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "userId" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.userId === "string"
  );
}

export function getStoredCurrentSeller(): Seller | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(CURRENT_SELLER_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    const value = JSON.parse(rawValue) as Partial<StoredSeller>;
    const selectedAt =
      typeof value.selectedAt === "string" ? Date.parse(value.selectedAt) : NaN;
    const expiresAt = selectedAt + CURRENT_SELLER_TTL_HOURS * 60 * 60 * 1000;

    if (!isSeller(value.seller) || !Number.isFinite(selectedAt) || Date.now() > expiresAt) {
      clearStoredCurrentSeller();
      return null;
    }

    return value.seller;
  } catch {
    clearStoredCurrentSeller();
    return null;
  }
}

export function setStoredCurrentSeller(seller: Seller) {
  if (typeof window === "undefined") return;

  const value: StoredSeller = {
    seller,
    selectedAt: new Date().toISOString()
  };
  window.localStorage.setItem(CURRENT_SELLER_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CURRENT_SELLER_CHANGE_EVENT));
}

export function clearStoredCurrentSeller() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_SELLER_STORAGE_KEY);
  window.dispatchEvent(new Event(CURRENT_SELLER_CHANGE_EVENT));
}
