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
  uid_1c: string;
  number: string;
  source: string;
  status: string;
  extended_status: string;
  order_created_at: DateTime;
  confirmation_date: DateTime;
  delivery_date: DateTime;
  delivery_time: string;
  order_sum: number;
  shipment_store_name: string;
  store_id: string;
  items: OrderItem[];
  controlledItems: OrderControlledItem[];
};

export type ConfirmOrderRequest = {
  orderId: string;
  seller: string;
};

export type ConfirmOrderResponse = {
  code: number;
  mess: string;
  data: {
    order: string;
    status: string;
    seller: string;
  };
};

export type OrdersResponse = {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: Order[];
};
