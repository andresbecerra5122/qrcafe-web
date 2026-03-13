import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuProduct, MenuResponse } from '../../models/menu/menu.models';
import { CartService } from '../../services/cart.service';
import { WaiterCallService } from '../../services/waiter-call.service';
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
  restaurantName: string = '';
  tableToken: string | null = null;
  tableNumber: number | null = null;
  menuMode: 'dinein' | 'delivery' | 'auto' = 'auto';
  enableDineIn = true;
  enableDelivery = false;

  loading = true;
  error: string | null = null;

  categories: CategoryVM[] = [];

  menuData: any = null;

  waiterCalling = false;
  waiterCalled = false;
  waiterCallError: string | null = null;

  constructor(private route: ActivatedRoute,
    private menuService: MenuService,
    public cart: CartService,
    private waiterCallService: WaiterCallService
  ) {}

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.queryParamMap.get('restaurantId') ?? '';
    this.tableToken = this.route.snapshot.queryParamMap.get('table');
    const mode = (this.route.snapshot.queryParamMap.get('mode') ?? '').toLowerCase();
    if (mode === 'delivery') this.menuMode = 'delivery';
    else if (mode === 'dinein') this.menuMode = 'dinein';
   

    if (!this.restaurantId) {
      this.loading = false;
      this.error = 'Missing restaurant query param. Example: /menu?restaurant=cafe-central';
      return;
    }

     this.menuService.getMenuByRestaurantId(this.restaurantId).subscribe({
      next: (res) => {
        this.categories = this.buildCategoryVM(res);
        this.restaurantName = res.restaurantName ?? '';
        this.enableDineIn = res.enableDineIn;
        this.enableDelivery = res.enableDelivery;
        this.loading = false;
        const currency = res.currency ?? null;

        //this.cart.initContext(this.restaurantId, this.tableToken, res.tableNumber, res.currency ?? null);
        if (this.tableToken) {
          this.menuService.resolveTable(this.restaurantId, this.tableToken ?? '').subscribe({
        next: (t) => {
          this.tableToken = t.token;
          this.tableNumber = t.number;
          this.cart.initContext(
            this.restaurantId,
            this.tableToken,
            t.number,
            currency,
            res.enableDineIn,
            res.enableDelivery,
            res.enableDeliveryCash,
            res.enableDeliveryCard
          );
          this.applyDefaultOrderType();
      },
      error: () => {
        // mesa inválida: guardamos number pero token null (UI puede mostrar warning)
        this.tableToken = null;
        this.cart.initContext(
          this.restaurantId,
          null,
          this.tableNumber,
          currency,
          res.enableDineIn,
          res.enableDelivery,
          res.enableDeliveryCash,
          res.enableDeliveryCard
        );
        this.applyDefaultOrderType();
      }
    });
  } else {
    // takeaway o sin mesa
    this.cart.initContext(
      this.restaurantId,
      null,
      null,
      currency,
      res.enableDineIn,
      res.enableDelivery,
      res.enableDeliveryCash,
      res.enableDeliveryCard
    );
    this.applyDefaultOrderType();
  }
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

  formatMoney(value: number): string {
    const currency = this.cart.state.currency ?? 'COP';
    const locale = currency === 'EUR' ? 'es-ES' : 'es-CO';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }

  hasOpenTableOrder(): boolean {
    return !!this.cart.state.activeOrder?.orderId;
  }

  callWaiter() {
    if (this.waiterCalling || this.waiterCalled) return;

    this.waiterCalling = true;
    this.waiterCallError = null;

    this.waiterCallService.callWaiter(this.restaurantId, this.tableToken).subscribe({
      next: () => {
        this.waiterCalling = false;
        this.waiterCalled = true;
        setTimeout(() => { this.waiterCalled = false; }, 30_000);
      },
      error: () => {
        this.waiterCalling = false;
        this.waiterCallError = 'No se pudo llamar al mesero. Intenta de nuevo.';
        setTimeout(() => { this.waiterCallError = null; }, 5_000);
      }
    });
  }

  canCallWaiter(): boolean {
    return this.enableDineIn && !!this.tableToken && this.menuMode !== 'delivery';
  }

  private applyDefaultOrderType() {
    if (this.menuMode === 'delivery' && this.enableDelivery) {
      this.cart.setOrderType('DELIVERY');
      return;
    }

    if (this.tableToken && this.enableDineIn) {
      this.cart.setOrderType('DINE_IN');
      return;
    }

    this.cart.setOrderType('TAKEAWAY');
  }
}
