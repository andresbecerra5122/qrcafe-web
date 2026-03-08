export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
  notes?: string | null;
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
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | null;
  items: CartItem[];
}