import { NextResponse } from "next/server";
import type { Order, OrderItem } from "@/entities/order";

type MockOrderItem = Omit<OrderItem, "is_weight" | "marking_product" | "product_name">;
type MockOrder = Omit<Order, "items"> & {
  items: MockOrderItem[];
};

const mockCreatedAt = new Date();

function addTime(date: Date, hours: number, minutes = 0) {
  return new Date(date.getTime() + (hours * 60 + minutes) * 60 * 1000).toISOString();
}

function addRandomConfirmationTime(date: Date) {
  const minutes = Math.floor(Math.random() * 18) + 3;

  return addTime(date, 0, minutes);
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: "yog7xc0wml55ft8",
    external_id: "913647ce-e219-42b7-9874-be30c03481c9",
    number: "СЦЦБ-001064",
    source: "Wildberries",
    customer: "Частное лицо",
    status: "Ожидает сборки",
    extended_status: "Ожидает сборки",
    external_status: "Подтвержден",
    order_method: "delivery",
    payment_status: "paid",
    delivery_code: "yandex-go",
    order_created_at: mockCreatedAt.toISOString(),
    confirmation_date: addRandomConfirmationTime(mockCreatedAt),
    delivery_date: addTime(mockCreatedAt, 0, 8),
    delivery_time: "09:00-15:00",
    order_sum: 2840.5,
    total_discount: 159.5,
    delivery_cost: 300,
    currency: "RUB",
    is_paid: true,
    raw: {
      source: "mock"
    },
    raw_ozon: {},
    created: mockCreatedAt.toISOString(),
    updated: mockCreatedAt.toISOString(),
    shipment_store_ref: "4h4bve3pp13brab",
    shipment_store_name: "Интернет-магазин МСК",
    shipment_store_phone: "89265252286",
    items: [
      {
        product_id: "fa30eeb1-65dd-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 1390,
        amount: 1390,
        quantity_fact: 0
      },
      {
        product_id: "5736c1c4-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 720.5,
        amount: 720.5,
        quantity_fact: 0
      },
      {
        product_id: "8d5b8b8f-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 730,
        amount: 730,
        quantity_fact: 0
      }
    ],
    controlledItems: []
  },
  {
    id: "p3ykz7e2m0n1a8q",
    external_id: "2f08a0b0-2589-4a45-aa39-65f87f45f8d1",
    number: "СЦЦБ-001065",
    source: "Купер",
    customer: "Иван Петров",
    status: "Ожидает сборки",
    extended_status: "Ожидает сборки",
    external_status: "К отгрузке",
    order_method: "marketplace",
    payment_status: "paid",
    delivery_code: "ozon",
    order_created_at: mockCreatedAt.toISOString(),
    confirmation_date: addRandomConfirmationTime(mockCreatedAt),
    delivery_date: addTime(mockCreatedAt, 0, 12),
    delivery_time: "12:00-16:00",
    order_sum: 5190,
    total_discount: 410,
    delivery_cost: 0,
    currency: "RUB",
    is_paid: true,
    raw: {
      source: "mock"
    },
    raw_ozon: {
      posting_number: "12345-0001-1"
    },
    created: mockCreatedAt.toISOString(),
    updated: mockCreatedAt.toISOString(),
    shipment_store_ref: "p8k2n4s7v9q1x3d",
    shipment_store_name: "Магазин Отрадное",
    shipment_store_phone: "84951234567",
    items: [
      {
        product_id: "512e69b0-1a95-11f0-95ee-00155d1a2b1e",
        quantity: 2,
        price: 990,
        amount: 1980,
        quantity_fact: 0
      },
      {
        product_id: "d8c54d86-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 1610,
        amount: 1610,
        quantity_fact: 0
      },
      {
        product_id: "3a715e34-636e-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 1090,
        amount: 1090,
        quantity_fact: 0
      },
      {
        product_id: "71c8be9c-636e-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 510,
        amount: 510,
        quantity_fact: 0
      }
    ],
    controlledItems: []
  },
  {
    id: "q8l2m4b6v9s0x1c",
    external_id: "6d9a4e3c-7256-455b-8d7a-57f1a0369a11",
    number: "СЦЦБ-001066",
    source: "Сайт",
    customer: "Мария Смирнова",
    status: "Ожидает сборки",
    extended_status: "Ожидает подтверждения",
    external_status: "Создан",
    order_method: "pickup",
    payment_status: "pending",
    delivery_code: "pickup",
    order_created_at: mockCreatedAt.toISOString(),
    confirmation_date: addRandomConfirmationTime(mockCreatedAt),
    delivery_date: addTime(mockCreatedAt, 0, 5),
    delivery_time: "16:00-20:00",
    order_sum: 1299.99,
    total_discount: 0,
    delivery_cost: 0,
    currency: "RUB",
    is_paid: false,
    raw: {
      source: "mock"
    },
    raw_ozon: {},
    created: mockCreatedAt.toISOString(),
    updated: mockCreatedAt.toISOString(),
    shipment_store_ref: "m3d9r2h6t1w8c4z",
    shipment_store_name: "Магазин Бутово",
    shipment_store_phone: "88005553535",
    items: [
      {
        product_id: "b038a368-4dbf-11f0-95ee-00155d1a2b1e",
        quantity: 1,
        price: 149.99,
        amount: 149.99,
        quantity_fact: 0
      },
      {
        product_id: "a970af13-636e-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 450,
        amount: 450,
        quantity_fact: 0
      },
      {
        product_id: "dfde9cb8-636e-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 390,
        amount: 390,
        quantity_fact: 0
      },
      {
        product_id: "24d254cb-636f-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 310,
        amount: 310,
        quantity_fact: 0
      }
    ],
    controlledItems: []
  },
  {
    id: "q8l2m4b6v9s0x5c",
    external_id: "7d9a4e3c-7256-455b-8d7a-57f1a0369a11",
    number: "СЦЦБ-001067",
    source: "Ручной",
    customer: "Андрей Фролов",
    status: "Ожидает сборки",
    extended_status: "Ожидает подтверждения",
    external_status: "Создан",
    order_method: "pickup",
    payment_status: "pending",
    delivery_code: "pickup",
    order_created_at: mockCreatedAt.toISOString(),
    confirmation_date: addRandomConfirmationTime(mockCreatedAt),
    delivery_date: addTime(mockCreatedAt, 0, 25),
    delivery_time: "16:00-20:00",
    order_sum: 1299.99,
    total_discount: 0,
    delivery_cost: 0,
    currency: "RUB",
    is_paid: false,
    raw: {
      source: "mock"
    },
    raw_ozon: {},
    created: mockCreatedAt.toISOString(),
    updated: mockCreatedAt.toISOString(),
    shipment_store_ref: "r6v1j8p4b9n2k5y",
    shipment_store_name: "Магазин Химки",
    shipment_store_phone: "88007006050",
    items: [
      {
        product_id: "89308ef0-611c-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 899.99,
        amount: 899.99,
        quantity_fact: 0
      },
      {
        product_id: "5736c1c4-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 140,
        amount: 140,
        quantity_fact: 0
      },
      {
        product_id: "8d5b8b8f-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 130,
        amount: 130,
        quantity_fact: 0
      },
      {
        product_id: "71c8be9c-636e-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 80,
        amount: 80,
        quantity_fact: 0
      },
      {
        product_id: "24d254cb-636f-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 50,
        amount: 50,
        quantity_fact: 0
      }
    ],
    controlledItems: []
  },
  {
    id: "q8l2m4b6v9s0x7c",
    external_id: "7d9a4e3c-7256-455b-8d7a-57f1a0369a12",
    number: "СЦЦБ-001078",
    source: "ЯндексGO",
    customer: "Андрей Попов",
    status: "Ожидает сборки",
    extended_status: "Ожидает подтверждения",
    external_status: "Создан",
    order_method: "pickup",
    payment_status: "pending",
    delivery_code: "pickup",
    order_created_at: mockCreatedAt.toISOString(),
    confirmation_date: addRandomConfirmationTime(mockCreatedAt),
    delivery_date: addTime(mockCreatedAt, 0, 2),
    delivery_time: "16:00-20:00",
    order_sum: 1000.99,
    total_discount: 0,
    delivery_cost: 0,
    currency: "RUB",
    is_paid: false,
    raw: {
      source: "mock"
    },
    raw_ozon: {},
    created: mockCreatedAt.toISOString(),
    updated: mockCreatedAt.toISOString(),
    shipment_store_ref: "r6v1j8p4b9n2k5y",
    shipment_store_name: "Магазин Химки",
    shipment_store_phone: "88007006050",
    items: [
      {
        product_id: "89308ef0-611c-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 899.99,
        amount: 899.99,
        quantity_fact: 0
      },
      {
        product_id: "5736c1c4-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 140,
        amount: 140,
        quantity_fact: 0
      },
      {
        product_id: "8d5b8b8f-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 130,
        amount: 130,
        quantity_fact: 0
      }
    ],
    controlledItems: []
  },
  {
    id: "q8l2m4b6v9s0x8c",
    external_id: "7d9a4e3c-7256-455b-8d7a-57f1a0369a15",
    number: "СЦЦБ-001083",
    source: "Сайт",
    customer: "Андрей Попович",
    status: "Ожидает сборки",
    extended_status: "Ожидает подтверждения",
    external_status: "Создан",
    order_method: "pickup",
    payment_status: "pending",
    delivery_code: "pickup",
    order_created_at: mockCreatedAt.toISOString(),
    confirmation_date: addRandomConfirmationTime(mockCreatedAt),
    delivery_date: addTime(mockCreatedAt, 0, 30),
    delivery_time: "16:00-20:00",
    order_sum: 270.00,
    total_discount: 0,
    delivery_cost: 0,
    currency: "RUB",
    is_paid: false,
    raw: {
      source: "mock"
    },
    raw_ozon: {},
    created: mockCreatedAt.toISOString(),
    updated: mockCreatedAt.toISOString(),
    shipment_store_ref: "r6v1j8p4b9n2k5y",
    shipment_store_name: "Магазин Химки",
    shipment_store_phone: "88007006050",
    items: [
      {
        product_id: "5736c1c4-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 140,
        amount: 140,
        quantity_fact: 0
      },
      {
        product_id: "8d5b8b8f-636d-11ef-8da0-00155d1a6906",
        quantity: 1,
        price: 130,
        amount: 130,
        quantity_fact: 0
      }
    ],
    controlledItems: []
  }
];

export async function GET() {
  const response = {
    page: 1,
    perPage: 30,
    totalPages: 1,
    totalItems: MOCK_ORDERS.length,
    items: MOCK_ORDERS
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
