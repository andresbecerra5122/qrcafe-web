export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
  notes?: string | null;
}

export interface ActiveOrderSummary {
  orderId: string;
  orderNumber: number;
  status: string;
  total: number;
  currency: string;
}

export interface LastPaidOrderSummary {
  orderId: string;
  orderNumber: number;
  total: number;
  currency: string;
}

export interface CartState {
  restaurantId: string | null;
  tableToken: string | null;
  tableNumber: number | null; 
  currency: string | null; 
  enableDineIn: boolean;
  enableDelivery: boolean;
  enableDeliveryCash: boolean;
  enableDeliveryCard: boolean;
  enablePayAtCashier: boolean;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | null;
  items: CartItem[];
  activeOrder: ActiveOrderSummary | null;
  lastPaidOrder: LastPaidOrderSummary | null;
}