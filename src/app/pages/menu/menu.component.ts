import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuProduct, MenuResponse } from '../../models/menu/menu.models';
import { CartService } from '../../services/cart.service';
import { RouterModule } from '@angular/router';


type CategoryVM = {
  id: string;
  name: string;
  sort: number;
  products: MenuProduct[];
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit {
  restaurant!: string;
  table!: string | null;

  restaurantId!: string;
  tableToken: string | null = null;

  loading = true;
  error: string | null = null;

  categories: CategoryVM[] = [];

  menuData: any = null;

  constructor(private route: ActivatedRoute,
    private menuService: MenuService,
    public cart: CartService
  ) {}

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.queryParamMap.get('restaurantId') ?? '';
    this.tableToken = this.route.snapshot.queryParamMap.get('table');
    this.cart.initContext(this.restaurantId, this.tableToken);

    if (!this.restaurantId) {
      this.loading = false;
      this.error = 'Missing restaurant query param. Example: /menu?restaurant=cafe-central';
      return;
    }

     this.menuService.getMenuByRestaurantId(this.restaurantId).subscribe({
      next: (res) => {
        this.categories = this.buildCategoryVM(res);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.error = 'Failed to load menu from API.';
      }
    });
  }

  private buildCategoryVM(res: MenuResponse): CategoryVM[] {
    const categories = [...res.categories].sort((a, b) => a.sort - b.sort);

    const productsByCategory = new Map<string, MenuProduct[]>();
    for (const p of res.products) {
      if (!productsByCategory.has(p.categoryId)) productsByCategory.set(p.categoryId, []);
      productsByCategory.get(p.categoryId)!.push(p);
    }

    // sort productos dentro de la categoría
    for (const [key, list] of productsByCategory) {
      list.sort((a, b) => a.sort - b.sort);
    }

    return categories.map(c => ({
      id: c.id,
      name: c.name,
      sort: c.sort,
      products: productsByCategory.get(c.id) ?? []
    }));
  }

  formatCOP(value: number): string {
    // Ajusta moneda según tu restaurante si luego lo agregas al JSON
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  addToCart(p: any) {
    this.cart.addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl
    }, 1);
  }

  inc(p: any) { this.cart.inc(p.id); }
  dec(p: any) { this.cart.dec(p.id); }

  qtyOf(productId: string): number {
    return this.cart.state.items.find(x => x.productId === productId)?.qty ?? 0;
  }

}
