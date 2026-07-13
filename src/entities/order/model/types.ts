export type DateTime = string;

export type OrderItem = {
  product_id: string;
  product_name: string;
  marking_product: boolean;
  quantity: number;
  price: number;
  amount: number;
  quantity_fact: number;
  is_weight: boolean;
};

export type OrderControlledItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  mark: string;
  result: boolean;
};

export type Order = {
  id: string;
  external_id: string;
  number: string;
  source: string;
  customer: string;
  status: string;
  extended_status: string;
  external_status: string;
  order_method: string;
  payment_status: string;
  delivery_code: string;
  order_created_at: DateTime;
  confirmation_date: DateTime;
  delivery_date: DateTime;
  delivery_time: string;
  order_sum: number;
  total_discount: number;
  delivery_cost: number;
  currency: string;
  is_paid: boolean;
  raw: Record<string, unknown>;
  raw_ozon: Record<string, unknown>;
  created: DateTime;
  updated: DateTime;
  shipment_store_ref: string;
  shipment_store_name: string;
  shipment_store_phone: string;
  items: OrderItem[];
  controlledItems: OrderControlledItem[];
};

export type OrdersResponse = {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: Order[];
};
