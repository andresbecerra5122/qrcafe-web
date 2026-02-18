export interface OrderPublicDto {
  orderId: string;
  orderType: string;
  tableNumber: number | null;
  customerName: string | null;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  currency: string;
  total: number;
  createdAt: string;
  orderNumber: number;
}
