import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuProduct, MenuResponse } from '../../models/menu/menu.models';
import { CartService } from '../../services/cart.service';
import { WaiterCallService } from '../../services/waiter-call.service';
import { OrderService } from '../../services/order.service';
import { OrderPublicDto } from '../../models/order.model';


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
export class MenuComponent implements OnInit, OnDestroy {
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

  /** Pedido abierto en la mesa que no corresponde a esta sesión (p. ej. otro comensal tras tu factura). */
  tableOrderConflict: string | null = null;
  /** Si hay conflicto, id del pedido abierto en mesa que estamos rechazando adoptar. */
  private blockedOpenOrderId: string | null = null;

  private orderPollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private menuService: MenuService,
    public cart: CartService,
    private waiterCallService: WaiterCallService,
    private orderService: OrderService
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
            res.enableDeliveryCard,
            res.enablePayAtCashier,
            res.avgPreparationMinutes,
            res.suggestedTipPercent,
            res.paymentMethods ?? []
          );
          this.loadActiveTableOrder();
          this.applyDefaultOrderType();
      },
      error: () => {
        const recoverId = this.cart.state.activeOrder?.orderId;
        if (recoverId) {
          this.orderService.getOrderById(recoverId).subscribe({
            next: (order) => {
              if (
                order.status === 'PAID' ||
                order.status === 'CANCELLED' ||
                order.orderType !== 'DINE_IN' ||
                !order.tableToken
              ) {
                this.tableToken = null;
                this.cart.initContext(
                  this.restaurantId,
                  null,
                  this.tableNumber,
                  currency,
                  res.enableDineIn,
                  res.enableDelivery,
                  res.enableDeliveryCash,
                  res.enableDeliveryCard,
                  res.enablePayAtCashier,
                  res.avgPreparationMinutes,
                  res.suggestedTipPercent,
                  res.paymentMethods ?? []
                );
                this.cart.clearActiveOrder();
                this.applyDefaultOrderType();
                return;
              }
              this.tableToken = order.tableToken;
              this.tableNumber = order.tableNumber;
              this.cart.initContext(
                this.restaurantId,
                order.tableToken,
                order.tableNumber,
                currency,
                res.enableDineIn,
                res.enableDelivery,
                res.enableDeliveryCash,
                res.enableDeliveryCard,
                res.enablePayAtCashier,
                res.avgPreparationMinutes,
                res.suggestedTipPercent,
                res.paymentMethods ?? []
              );
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { table: order.tableToken },
                queryParamsHandling: 'merge',
                replaceUrl: true
              });
              this.applyPublicOrder(order);
              this.applyDefaultOrderType();
            },
            error: () => {
              this.tableToken = null;
              this.cart.initContext(
                this.restaurantId,
                null,
                this.tableNumber,
                currency,
                res.enableDineIn,
                res.enableDelivery,
                res.enableDeliveryCash,
                res.enableDeliveryCard,
                res.enablePayAtCashier,
                res.avgPreparationMinutes,
                res.suggestedTipPercent,
                res.paymentMethods ?? []
              );
              this.cart.clearActiveOrder();
              this.applyDefaultOrderType();
            }
          });
          return;
        }
        this.tableToken = null;
        this.cart.initContext(
          this.restaurantId,
          null,
          this.tableNumber,
          currency,
          res.enableDineIn,
          res.enableDelivery,
          res.enableDeliveryCash,
          res.enableDeliveryCard,
          res.enablePayAtCashier,
          res.avgPreparationMinutes,
          res.suggestedTipPercent,
          res.paymentMethods ?? []
        );
        this.cart.clearActiveOrder();
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
      res.enableDeliveryCard,
      res.enablePayAtCashier,
      res.avgPreparationMinutes,
      res.suggestedTipPercent,
      res.paymentMethods ?? []
    );
    this.cart.clearActiveOrder();
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

  ngOnDestroy(): void {
    this.stopActiveOrderPolling();
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

    return categories
      .map(c => ({
        id: c.id,
        name: c.name,
        sort: c.sort,
        products: productsByCategory.get(c.id) ?? []
      }))
      .filter(c => c.products.length > 0);
  }

  formatCOP(value: number): string {
    // Ajusta moneda según tu restaurante si luego lo agregas al JSON
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  addToCart(p: any) {
    if (this.isCartBlockedByForeignTableOrder()) return;
    this.cart.addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl
    }, 1);
  }

  inc(p: any) {
    if (this.isCartBlockedByForeignTableOrder()) return;
    this.cart.inc(p.id);
  }
  dec(p: any) {
    if (this.isCartBlockedByForeignTableOrder()) return;
    this.cart.dec(p.id);
  }

  /** Conflicto: ya pagaste en este dispositivo y hay otro pedido abierto en la mesa. */
  isCartBlockedByForeignTableOrder(): boolean {
    return this.blockedOpenOrderId !== null;
  }

  dismissTableOrderConflict(): void {
    this.tableOrderConflict = null;
  }

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

  private loadActiveTableOrder() {
    const oid = this.cart.state.activeOrder?.orderId;
    if (oid) {
      this.orderService.getOrderById(oid).subscribe({
        next: (order) => this.applyPublicOrder(order),
        error: () => this.tryActiveByTableFallback()
      });
      return;
    }

    if (!this.tableToken) {
      this.cart.clearActiveOrder();
      this.clearForeignTableBlock();
      return;
    }

    this.orderService.getActiveOrderByTable(this.restaurantId, this.tableToken).subscribe({
      next: (order) => this.applyPublicOrder(order),
      error: () => {
        this.cart.clearActiveOrder();
        this.clearForeignTableBlock();
      }
    });
  }

  private tryActiveByTableFallback(): void {
    if (!this.tableToken) {
      this.cart.clearActiveOrder();
      return;
    }
    this.orderService.getActiveOrderByTable(this.restaurantId, this.tableToken).subscribe({
      next: (order) => this.applyPublicOrder(order),
      error: () => {
        this.cart.clearActiveOrder();
        this.clearForeignTableBlock();
      }
    });
  }

  private clearForeignTableBlock(): void {
    this.blockedOpenOrderId = null;
    this.tableOrderConflict = null;
  }

  /**
   * Tras pagar y volver al menú, otro puede tener un pedido abierto en la misma mesa.
   * No adoptar ese pedido como "el tuyo" si tu última factura en este navegador es otra.
   */
  private shouldBlockAdoptingOpenOrder(order: OrderPublicDto): boolean {
    if (order.status === 'PAID' || order.status === 'CANCELLED') return false;
    const lp = this.cart.state.lastPaidOrder;
    const ao = this.cart.state.activeOrder;
    if (!lp?.orderId) return false;
    if (order.orderId === lp.orderId) return false;
    if (ao?.orderId === order.orderId) return false;
    return true;
  }

  private applyPublicOrder(order: OrderPublicDto): void {
    if (order.status === 'PAID' || order.status === 'CANCELLED') {
      this.stopActiveOrderPolling();
      this.cart.clearActiveOrder();
      this.blockedOpenOrderId = null;
      this.tableOrderConflict = null;
      return;
    }

    if (this.shouldBlockAdoptingOpenOrder(order)) {
      this.stopActiveOrderPolling();
      this.cart.clearActiveOrder();
      this.blockedOpenOrderId = order.orderId;
      this.tableOrderConflict =
        'Esta mesa ya tiene un pedido activo distinto a tu última cuenta pagada en este dispositivo. ' +
        'Si otra persona inició un pedido nuevo, no agregues productos aquí: pide escanear el código de la mesa de nuevo o habla con el personal.';
      return;
    }

    this.blockedOpenOrderId = null;
    this.tableOrderConflict = null;

    if (order.orderType === 'DINE_IN' && order.tableToken) {
      const prevUrlTable = this.route.snapshot.queryParamMap.get('table');
      this.cart.syncTableFromOrder(order);
      if (order.tableToken !== prevUrlTable || order.tableNumber !== this.tableNumber) {
        this.tableToken = order.tableToken;
        this.tableNumber = order.tableNumber;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { table: order.tableToken },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    }

    this.cart.setActiveOrder({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      currency: order.currency
    });
    this.startActiveOrderPolling();
  }

  private refreshActiveOrderIfAny(): void {
    const oid = this.cart.state.activeOrder?.orderId;
    if (!oid) return;
    this.orderService.getOrderById(oid).subscribe({
      next: (order) => this.applyPublicOrder(order),
      error: () => {}
    });
  }

  private startActiveOrderPolling(): void {
    if (this.orderPollTimer) return;
    if (!this.restaurantId) return;
    if (!this.cart.state.activeOrder?.orderId && !this.tableToken) return;
    this.orderPollTimer = setInterval(() => this.refreshActiveOrderIfAny(), 15_000);
  }

  private stopActiveOrderPolling(): void {
    if (this.orderPollTimer) {
      clearInterval(this.orderPollTimer);
      this.orderPollTimer = null;
    }
  }
}
