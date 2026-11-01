import { describe, expect, it } from "vitest";
import { canView, canViewWithStore } from "./permissions";
import type { User } from "@/shared/api/auth";
const user = (...names: string[]): User => ({role:"seller",position:2,roles:names.map((name,id)=>({id,name}))});
describe("service permissions",()=>{
 it("requires a session for mapped services",()=>{
  expect(canView(null,"orders")).toBe(false);
  expect(canView({role:"admin",position:2,roles:[{id:1,name:"product"}]},"orders")).toBe(false);
 });
 it("maps domain services without granting unrelated access",()=>{
  expect(canView(user("order"),"orders")).toBe(true);
  expect(canView(user("order"),"goods")).toBe(true);
  expect(canView(user("goods-receipts"),"goods")).toBe(true);
  expect(canView(user("goods-receipts"),"product")).toBe(false);
  expect(canView(user("document"),"serviceDesk")).toBe(true);
  expect(canView(user("document"),"documents")).toBe(true);
  expect(canView(user("product"),"tasks")).toBe(true);
 });
 it("gives admin access to every service",()=>{
  expect(canView(user("admin"),"admin")).toBe(true);
  expect(canView(user("admin"),"dashboard")).toBe(true);
 });
});

it("always shows services with no matching role", () => {
 for (const service of ["goods", "serviceDesk", "contacts", "dashboard", "tasks", "productCounting", "futureService"] as const) {
  expect(canView(null, service)).toBe(true);
  expect(canView(user("order"), service)).toBe(true);
 }
 expect(canView(user("order"),"documents")).toBe(false);
});
it("keeps service access without a position or roles while restricting administration", () => {
 for (const current of [{role:"seller",position:null,roles:[{id:1,name:"order"}]},user()] satisfies User[]) {
  expect(canView(current,"admin")).toBe(false);
  expect(canView(current,"product")).toBe(true);
  expect(canView(current,"documents")).toBe(true);
 }
});

it("checks parent blocks and nested services independently", () => {
 const current = user("order");
 expect(canView(current,"serviceDesk")).toBe(true);
 expect(canView(current,"contacts")).toBe(true);
 expect(canView(current,"documents")).toBe(false);
 expect(canView(current,"goods")).toBe(true);
 expect(canView(current,"productCounting")).toBe(true);
 expect(canView(current,"product")).toBe(false);
 expect(canView(current,"receipts")).toBe(false);
});

it("requires the admin role for administration", () => {
 expect(canView(null,"admin")).toBe(false);
 expect(canView(user("order"),"admin")).toBe(false);
 expect(canView({role:"admin",position:null,roles:[]},"admin")).toBe(false);
 expect(canView({role:"seller",position:null,roles:[{id:1,name:"admin"}]},"admin")).toBe(true);
});

it("hides store dependent services even for admins until a store is selected", () => {
 for (const service of ["orders", "receipts"]) {
  expect(canViewWithStore(user("admin"), service, false)).toBe(false);
  expect(canViewWithStore(user("admin"), service, true)).toBe(true);
 }
 expect(canViewWithStore(user("order"), "receipts", true)).toBe(false);
 expect(canViewWithStore(user("product"), "product", false)).toBe(true);
});

it("allows documents and product information without a store for admins and matching roles", () => {
 for (const service of ["documents", "product"]) {
  expect(canViewWithStore(user("admin"), service, false)).toBe(true);
 }
 expect(canViewWithStore(user("document"), "documents", false)).toBe(true);
 expect(canViewWithStore(user("product"), "documents", false)).toBe(false);
});
