"use client";
import { useSelectedStore } from "../../entities/store/model/use-selected-store";
import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getCurrentUser, type User } from "../api/auth";
// Services without a matching role are visible to everyone.
export const SERVICE_ROLES: Readonly<Partial<Record<string, readonly string[]>>> = {
 orders: ["orders"], product: ["products"], receipts: ["goods-receipts"],
 distribution: ["goods-distribution"], documents: ["documents"], admin: ["admin"]
};
export type Service = keyof typeof SERVICE_ROLES;
export function canView(user: User | null, service: Service): boolean {
 const names = user?.roles?.map(r => r.name) ?? [];
 const required = SERVICE_ROLES[service];
 if (service === "admin") return names.includes("admin");
 if (!required?.length) return true;
 if (!user) return false;
 if (user.position == null || names.length === 0 || names.includes("admin")) return true;
 return required.some(role => names.includes(role));
}
export const STORE_DEPENDENT_SERVICES: readonly string[] = ["orders", "receipts"];
export function canViewWithStore(user: User | null, service: Service, hasStore: boolean): boolean {
 return (!STORE_DEPENDENT_SERVICES.includes(service) || hasStore) && canView(user, service);
}
export function usePermissions() {
 const store = useSelectedStore();
 const [user, setUser] = useState<User | null>(null);
 useEffect(() => {
  const changed = () => setUser(getCurrentUser());
  changed(); window.addEventListener(AUTH_CHANGED_EVENT, changed); window.addEventListener("storage", changed);
  return () => { window.removeEventListener(AUTH_CHANGED_EVENT, changed); window.removeEventListener("storage", changed); };
 }, []);
 return (service: Service) => canViewWithStore(user, service, store !== null);
}
