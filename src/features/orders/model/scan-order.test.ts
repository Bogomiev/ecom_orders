import { describe, expect, it } from "vitest";
import type { Order } from "@/entities/order";
import type { Product } from "@/entities/product";
import {
  applyBarcodeToOrder,
  createBarcodeIndex,
  parseScannedCode
} from "./scan-order";

const product: Product = {
  uid: "product-1",
  code: "1",
  name: "Икра",
  markingType: "БезОсобенностейУчета",
  isWeight: false,
  barcodes: [{ barcode: "4601234567890", unit: "шт", ratio: 1, isBase: true }]
};

const order: Order = {
  id: "order-1",
  uid_1c: "uid-order-1",
  number: "1",
  source: "Сайт",
  status: "Новый",
  extended_status: "",
  order_created_at: "",
  confirmation_date: "",
  delivery_date: "",
  delivery_time: "",
  order_sum: 100,
  shipment_store_name: "Магазин",
  store_id: "store-1",
  quantityBags: 0,
  controlledItems: [],
  items: [{
    product_id: product.uid,
    product_name: product.name,
    marking_product: false,
    quantity: 1,
    price: 100,
    amount: 100,
    quantity_fact: 0,
    is_weight: false
  }]
};

describe("parseScannedCode", () => {
  it("распознаёт обычный EAN-13", () => {
    expect(parseScannedCode("4601234567890")).toEqual({
      isMark: false,
      lookupBarcodes: ["4601234567890"]
    });
  });

  it("извлекает GTIN из маркировки", () => {
    expect(parseScannedCode("]d20104601234567890ABC")).toEqual({
      isMark: true,
      lookupBarcodes: ["04601234567890", "4601234567890"]
    });
  });
});

describe("applyBarcodeToOrder", () => {
  it("увеличивает фактическое количество найденного товара", () => {
    const result = applyBarcodeToOrder(
      order,
      createBarcodeIndex([product]),
      "4601234567890"
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.order.items[0].quantity_fact).toBe(1);
    }
  });

  it("не позволяет превысить заказанное количество", () => {
    const filledOrder = {
      ...order,
      items: [{ ...order.items[0], quantity_fact: 1 }]
    };
    const result = applyBarcodeToOrder(
      filledOrder,
      createBarcodeIndex([product]),
      "4601234567890"
    );

    expect(result).toMatchObject({
      status: "error",
      code: "quantity-exceeded"
    });
  });

  it("требует марку для маркируемого товара", () => {
    const markedOrder = {
      ...order,
      items: [{ ...order.items[0], marking_product: true }]
    };
    const result = applyBarcodeToOrder(
      markedOrder,
      createBarcodeIndex([product]),
      "4601234567890"
    );

    expect(result).toMatchObject({ status: "error", code: "mark-required" });
  });

  it("разрешает весовому товару превышение до 15 процентов", () => {
    const weightedProduct = { ...product, isWeight: true };
    const weightedOrder = {
      ...order,
      items: [{
        ...order.items[0],
        quantity: 10,
        quantity_fact: 10,
        is_weight: true
      }]
    };
    const result = applyBarcodeToOrder(
      weightedOrder,
      createBarcodeIndex([weightedProduct]),
      "4601234567890"
    );

    expect(result.status).toBe("success");
  });
});
