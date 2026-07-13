import { NextResponse } from "next/server";
import type {
  Order,
  OrderControlledItem,
  OrderItem,
  OrdersResponse
} from "@/entities/order";
import { fetchOneCJson } from "@/server/one-c/client";

type OneCOrderItem = Omit<
  OrderItem,
  "product_name" | "marking_product" | "quantity_fact" | "is_weight"
> & {
  quantity_fact?: number | null;
};

type OneCOrder = Omit<Order, "items" | "controlledItems"> & {
  items: OneCOrderItem[];
  controlledItems?: OrderControlledItem[] | null;
};

type OneCOrdersResponse = Omit<OrdersResponse, "items"> & {
  items: OneCOrder[];
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchOneCJson<OneCOrdersResponse>("/GetOrders", {
      cache: "no-store"
    });
    const orders: OrdersResponse = {
      ...data,
      items: data.items.map((rawOrder) => {
        const { controlledItems, items, ...order } = rawOrder;

        return {
          ...order,
          controlledItems: controlledItems ?? [],
          items: items.map((rawItem) => {
            const { quantity_fact, ...item } = rawItem;

            return {
              ...item,
              product_name: item.product_id,
              marking_product: false,
              quantity_fact: quantity_fact ?? 0,
              is_weight: false
            };
          })
        };
      })
    };

    return NextResponse.json(orders, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Failed to load orders from 1C", error);

    return NextResponse.json(
      { message: "Не удалось получить заказы из 1С" },
      { status: 502 }
    );
  }
}
