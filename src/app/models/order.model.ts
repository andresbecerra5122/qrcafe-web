export interface OrderPublicDto {
  orderId: string;
  orderType: string;
  tableNumber: number | null;
  customerName: string | null;
  deliveryAddress: string | null;
  deliveryReference: string | null;
  deliveryPhone: string | null;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  orderNumber: number;
  restaurantName: string;
  items: OrderItemPublicDto[];
}

export interface OrderItemPublicDto {
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}
