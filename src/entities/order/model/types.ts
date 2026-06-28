export type OrderStatus = "pending" | "paid" | "packed" | "shipped" | "cancelled";

export type Order = {
  id: string;
  customerName: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
};
