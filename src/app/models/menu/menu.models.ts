export interface MenuResponse {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  enableDineIn: boolean;
  enableDelivery: boolean;
  enableDeliveryCash: boolean;
  enableDeliveryCard: boolean;
  categories: MenuCategory[];
  products: MenuProduct[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sort: number;
}

export interface MenuProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  sort: number;
  imageUrl?: string;
}
