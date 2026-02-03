export interface MenuResponse {
  restaurantId: string;
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
