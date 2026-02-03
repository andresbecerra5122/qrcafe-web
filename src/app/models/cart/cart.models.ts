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
  orderType: 'DINE_IN' | 'TAKEAWAY' | null;
  items: CartItem[];
}