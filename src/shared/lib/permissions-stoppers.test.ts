import { expect, it } from "vitest";
import type { User } from "../api/auth";
import { canManageStoppers, isStopperManagerOnly } from "./permissions";

const user = (role: string, roles: string[]): User => ({ role, roles: roles.map((name, id) => ({ id, name })) });
it("lets managers and admins manage stoppers", () => {
 expect(canManageStoppers(user("user", ["manager"]))).toBe(true);
 expect(canManageStoppers(user("admin", ["admin"]))).toBe(true);
 expect(canManageStoppers(user("user", ["orders"]))).toBe(false);
 expect(canManageStoppers(null)).toBe(false);
});
it("keeps a manager without admin rights on the stopper page only", () => {
 expect(isStopperManagerOnly(user("user", ["manager"]))).toBe(true);
 expect(isStopperManagerOnly(user("admin", ["admin", "manager"]))).toBe(false);
 expect(isStopperManagerOnly(user("user", ["orders"]))).toBe(false);
});
