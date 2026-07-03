import { NextResponse } from "next/server";
import type { Order, OrdersResponse } from "@/entities/order";

const mockCreatedAt = new Date();

function addTime(date: Date, hours: number, minutes = 0) {
  return new Date(date.getTime() + (hours * 60 + minutes) * 60 * 1000).toISOString();
}

const MOCK_ORDERS: Order[] = [
  {
    id: "yog7xc0wml55ft8",
    external_id: "913647ce-e219-42b7-9874-be30c03481c9",
    number: "СЦЦБ-001064",
    site: "Яндекс Маркет",
    customer: "Частное лицо",
    status: "Ожидает сборки",
    extended_status: "Ожидает сборки",
    external_status: "Подтвержден",
    order_method: "delivery",
    payment_status: "paid",
    delivery_code: "yandex-go",
    order_created_at: mockCreatedAt.toISOString(),
    delivery_date: addTime(mockCreatedAt, 5, 38),
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
    shipment_store_ref: "STORE-001",
    shipment_store_name: "Интернет-магазин МСК",
    shipment_store_phone: "89265252286"
  },
  {
    id: "p3ykz7e2m0n1a8q",
    external_id: "2f08a0b0-2589-4a45-aa39-65f87f45f8d1",
    number: "СЦЦБ-001065",
    site: "Ozon",
    customer: "Иван Петров",
    status: "Собран",
    extended_status: "Готов к передаче",
    external_status: "К отгрузке",
    order_method: "marketplace",
    payment_status: "paid",
    delivery_code: "ozon",
    order_created_at: mockCreatedAt.toISOString(),
    delivery_date: addTime(mockCreatedAt, 3, 12),
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
    shipment_store_ref: "STORE-002",
    shipment_store_name: "Пункт выдачи Север",
    shipment_store_phone: "84951234567"
  },
  {
    id: "q8l2m4b6v9s0x1c",
    external_id: "6d9a4e3c-7256-455b-8d7a-57f1a0369a11",
    number: "СЦЦБ-001066",
    site: "Сайт",
    customer: "Мария Смирнова",
    status: "Новый",
    extended_status: "Ожидает подтверждения",
    external_status: "Создан",
    order_method: "pickup",
    payment_status: "pending",
    delivery_code: "pickup",
    order_created_at: mockCreatedAt.toISOString(),
    delivery_date: addTime(mockCreatedAt, 7, 45),
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
    shipment_store_ref: "STORE-003",
    shipment_store_name: "Магазин Восток",
    shipment_store_phone: "88005553535"
  },
  {
    id: "q8l2m4b6v9s0x5c",
    external_id: "7d9a4e3c-7256-455b-8d7a-57f1a0369a11",
    number: "СЦЦБ-001067",
    site: "ЯндексGO",
    customer: "Андрей Фролов",
    status: "Новый",
    extended_status: "Ожидает подтверждения",
    external_status: "Создан",
    order_method: "pickup",
    payment_status: "pending",
    delivery_code: "pickup",
    order_created_at: mockCreatedAt.toISOString(),
    delivery_date: addTime(mockCreatedAt, 1, 25),
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
    shipment_store_ref: "STORE-003",
    shipment_store_name: "Магазин Восток",
    shipment_store_phone: "88007006050"
  }
];

export async function GET() {
  const response: OrdersResponse = {
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
