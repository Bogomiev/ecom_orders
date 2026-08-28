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
  deliveryMethod: "pickup",
  status: "Новый",
  extended_status: "",
  order_created_at: "",
  confirmation_date: "",
  delivery_date: "",
  delivery_time: "",
  delivery_time_by: "",
  address: "",
  order_sum: 100,
  comment: "",
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
    canceled: false,
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

  it("извлекает код товара и вес из весового EAN-13", () => {
    expect(parseScannedCode("2100070003586")).toEqual({
      isMark: false,
      lookupBarcodes: [
        "2100070003586",
        "2_0007000000_",
        "00070",
        "70"
      ],
      weight: 0.358
    });
  });

  it("не разбирает весовой EAN-13 с неверной контрольной цифрой", () => {
    expect(parseScannedCode("2100070003587")).toEqual({
      isMark: false,
      lookupBarcodes: ["2100070003587"]
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

  it("не позволяет превысить заказанное количество для маркетплейса", () => {
    const filledOrder = {
      ...order,
      source: "Ozon",
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

  it("не позволяет превысить заказанное количество штучного товара с сайта", () => {
    const filledOrder = {
      ...order,
      source: "  САЙТ ",
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

  it("не ограничивает количество весового товара с сайта", () => {
    const weightedProduct = { ...product, isWeight: true };
    const filledOrder = {
      ...order,
      source: "  САЙТ ",
      items: [{
        ...order.items[0],
        quantity_fact: 1,
        is_weight: true
      }]
    };
    const result = applyBarcodeToOrder(
      filledOrder,
      createBarcodeIndex([weightedProduct]),
      "4601234567890"
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.order.items[0].quantity_fact).toBe(2);
    }
  });

  it("не добавляет товар из отменённой строки", () => {
    const result = applyBarcodeToOrder(
      { ...order, items: [{ ...order.items[0], canceled: true }] },
      createBarcodeIndex([product]),
      "4601234567890"
    );

    expect(result).toMatchObject({
      status: "error",
      code: "product-not-in-order"
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

  it("разрешает весовому товару превышение до 20 процентов", () => {
    const weightedProduct = { ...product, isWeight: true };
    const weightedOrder = {
      ...order,
      source: "Ozon",
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

  it("не позволяет весовому товару маркетплейса превысить допуск 20 процентов", () => {
    const weightedProduct = { ...product, isWeight: true };
    const weightedOrder = {
      ...order,
      source: "Ozon",
      items: [{
        ...order.items[0],
        quantity: 10,
        quantity_fact: 12,
        is_weight: true
      }]
    };
    const result = applyBarcodeToOrder(
      weightedOrder,
      createBarcodeIndex([weightedProduct]),
      "4601234567890"
    );

    expect(result).toMatchObject({
      status: "error",
      code: "quantity-exceeded"
    });
  });

  it("находит весовой товар по коду и добавляет вес с этикетки", () => {
    const weightedProduct = {
      ...product,
      isWeight: true,
      barcodes: [{ barcode: "70", unit: "кг", ratio: 1, isBase: true }]
    };
    const weightedOrder = {
      ...order,
      items: [{
        ...order.items[0],
        quantity: 1,
        is_weight: true
      }]
    };
    const result = applyBarcodeToOrder(
      weightedOrder,
      createBarcodeIndex([weightedProduct]),
      "2100070003586"
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.product.uid).toBe(product.uid);
      expect(result.order.items[0].quantity_fact).toBe(0.358);
    }
  });

  it("находит весовой товар по шаблону штрихкода", () => {
    const sturgeon = {
      ...product,
      name: "Осетр стейк с/м",
      barcodes: [{
        barcode: "2_0031900000_",
        unit: "кг",
        ratio: 1,
        isBase: false
      }]
    };
    const result = applyBarcodeToOrder(
      { ...order, items: [{ ...order.items[0], quantity: 1 }] },
      createBarcodeIndex([sturgeon]),
      "2000319005602"
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.product.name).toBe("Осетр стейк с/м");
      expect(result.order.items[0].quantity_fact).toBe(0.56);
    }
  });

  it("сначала находит полный штрихкод, начинающийся с 2", () => {
    const fullBarcodeProduct = {
      ...product,
      barcodes: [{ barcode: "2003960847850", unit: "шт", ratio: 1, isBase: true }]
    };
    const result = applyBarcodeToOrder(
      order,
      createBarcodeIndex([fullBarcodeProduct]),
      "2003960847850"
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.order.items[0].quantity_fact).toBe(1);
    }
  });

  it("не применяет весовой шаблон при неверной контрольной цифре", () => {
    const weightedProduct = {
      ...product,
      isWeight: true,
      barcodes: [{ barcode: "70", unit: "кг", ratio: 1, isBase: true }]
    };
    const result = applyBarcodeToOrder(
      { ...order, items: [{ ...order.items[0], is_weight: true }] },
      createBarcodeIndex([weightedProduct]),
      "2100070003587"
    );

    expect(result).toMatchObject({
      status: "error",
      code: "barcode-not-found"
    });
  });

  it("применяет весовой допуск по валидному весовому штрихкоду", () => {
    const mackerel = {
      ...product,
      uid: "ef935ff6-42e9-11e8-9e3b-001dd8b89db0",
      name: "Скумбрия АТЛАНТИЧЕСКАЯ с/м",
      isWeight: false,
      barcodes: [
        { barcode: "2_0003000000_", unit: "кг", ratio: 1, isBase: false },
        { barcode: "30", unit: "кг", ratio: 1, isBase: true }
      ]
    };
    const mackerelOrder = {
      ...order,
      items: [{
        ...order.items[0],
        product_id: mackerel.uid,
        quantity: 0.5,
        is_weight: false
      }]
    };
    const result = applyBarcodeToOrder(
      mackerelOrder,
      createBarcodeIndex([mackerel]),
      "2000030005608"
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.product.name).toBe("Скумбрия АТЛАНТИЧЕСКАЯ с/м");
      expect(result.order.items[0].quantity_fact).toBe(0.56);
    }
  });
});
