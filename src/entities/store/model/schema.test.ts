import { expect, it } from "vitest";
import { StoreSchema } from "./schema";
it("не требует и не возвращает старый PIN магазина из 1С", () => {
  const store = { id: "1", uid_1c: "1", code: "001", name: "Store", address: "Address" };
  expect(StoreSchema.parse(store)).toEqual(store);
  expect(StoreSchema.parse({ ...store, pin: "12345" })).toEqual(store);
});
