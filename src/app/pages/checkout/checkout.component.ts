import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { OrderPublicDto } from '../../models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  customerName = signal('');
  notes = signal('');
  orderType = signal<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  deliveryAddress = signal('');
  deliveryReference = signal('');
  deliveryPhone = signal('');
  deliveryPaymentMethod = signal<'CASH' | 'CARD'>('CASH');
  loading = signal(false);
  error = signal<string | null>(null);

  activeOrderLoading = signal(false);
  activeOrderError = signal<string | null>(null);
  requestingPayment = signal(false);
  paymentError = signal<string | null>(null);
  activeOrder = signal<OrderPublicDto | null>(null);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  get cart() {
    return this.cartService.state;
  }

  get currency() {
    return this.cart.currency || 'COP';
  }

  subtotal = computed(() => this.cartService.getSubtotal());

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {
    const fromCart = this.cart.orderType;
    if (this.isTableContext()) {
      this.orderType.set('DINE_IN');
    } else if (fromCart === 'DINE_IN' || fromCart === 'TAKEAWAY' || fromCart === 'DELIVERY') {
      this.orderType.set(fromCart);
    } else if (this.cart.tableNumber) {
      this.orderType.set('DINE_IN');
    } else {
      this.orderType.set(this.cart.enableDelivery ? 'DELIVERY' : 'TAKEAWAY');
    }

    if (!this.canDeliveryCash() && this.canDeliveryCard()) {
      this.deliveryPaymentMethod.set('CARD');
    } else {
      this.deliveryPaymentMethod.set('CASH');
    }
  }

  ngOnInit(): void {
    this.loadActiveOrder();
    this.pollTimer = setInterval(() => this.loadActiveOrder(), 10_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  submit() {
    this.error.set(null);

    if (!this.cart.restaurantId) {
      this.error.set('Restaurante inválido');
      return;
    }

    if (this.cart.items.length === 0) {
      this.error.set('El carrito está vacío');
      return;
    }

    if (this.orderType() === 'DINE_IN' && !this.canDineIn()) {
      this.error.set('Este restaurante no permite dine-in desde este flujo.');
      return;
    }

    if (this.orderType() === 'DELIVERY') {
      if (!this.canDelivery()) {
        this.error.set('Este restaurante no tiene delivery habilitado.');
        return;
      }
      if (!this.deliveryAddress().trim()) {
        this.error.set('La dirección de entrega es obligatoria.');
        return;
      }
      if (!this.deliveryPhone().trim()) {
        this.error.set('El teléfono de contacto es obligatorio.');
        return;
      }
      if (!this.canDeliveryCash() && !this.canDeliveryCard()) {
        this.error.set('No hay formas de pago habilitadas para domicilio.');
        return;
      }
      if (this.deliveryPaymentMethod() === 'CASH' && !this.canDeliveryCash()) {
        this.error.set('Efectivo no está habilitado para domicilio.');
        return;
      }
      if (this.deliveryPaymentMethod() === 'CARD' && !this.canDeliveryCard()) {
        this.error.set('Tarjeta no está habilitada para domicilio.');
        return;
      }
    }

    const payload = {
      restaurantId: this.cart.restaurantId,
      currency: this.cart.currency,
      orderType: this.orderType(),
      tableToken: this.orderType() === 'DINE_IN' ? this.cart.tableToken : null,
      customerName: this.customerName() || null,
      notes: this.notes() || null,
      deliveryAddress: this.orderType() === 'DELIVERY' ? this.deliveryAddress() || null : null,
      deliveryReference: this.orderType() === 'DELIVERY' ? this.deliveryReference() || null : null,
      deliveryPhone: this.orderType() === 'DELIVERY' ? this.deliveryPhone() || null : null,
      paymentMethod: this.orderType() === 'DELIVERY' ? this.deliveryPaymentMethod() : null,
      items: this.cart.items.map(i => ({
        productId: i.productId,
        qty: i.qty,
        notes: i.notes || null
      }))
    };

    this.loading.set(true);

    this.orderService.createOrder(payload).subscribe({
      next: (res) => {
        if (this.orderType() === 'DINE_IN') {
          this.cartService.setActiveOrder({
            orderId: res.orderId,
            orderNumber: this.cart.activeOrder?.orderNumber ?? 0,
            status: this.cart.activeOrder?.status ?? 'CREATED',
            total: this.cart.activeOrder?.total ?? 0,
            currency: this.currency
          });
        } else {
          this.cartService.clearActiveOrder();
        }
        this.cartService.clear();

        if (this.orderType() === 'DINE_IN') {
          this.loading.set(false);
          this.loadActiveOrder(true);
          return;
        }

        this.router.navigate(['/order-success', res.orderId], { replaceUrl: true });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error creando la orden');
        this.loading.set(false);
      }
    });
  }

  requestPayment(method: 'CASH' | 'CARD') {
    const order = this.activeOrder();
    if (!order?.orderId) return;
    this.requestingPayment.set(true);
    this.paymentError.set(null);

    this.orderService.requestPayment(order.orderId, method).subscribe({
      next: () => {
        this.requestingPayment.set(false);
        this.loadActiveOrder(true);
      },
      error: (err) => {
        this.requestingPayment.set(false);
        this.paymentError.set(err?.error?.message ?? 'No se pudo solicitar el cobro');
      }
    });
  }

  goToMenu(): void {
    const params = new URLSearchParams();
    if (this.cart.restaurantId) params.set('restaurantId', this.cart.restaurantId);
    if (this.cart.tableToken) params.set('table', this.cart.tableToken);
    this.router.navigateByUrl(`/menu${params.toString() ? `?${params.toString()}` : ''}`);
  }

  hasActiveOrder(): boolean {
    return !!this.cart.activeOrder?.orderId;
  }

  canRequestPayment(): boolean {
    const status = this.activeOrder()?.status;
    return status === 'DELIVERED';
  }

  isPaymentPending(): boolean {
    return this.activeOrder()?.status === 'PAYMENT_PENDING';
  }

  hasLastPaidOrder(): boolean {
    return !!this.cart.lastPaidOrder?.orderId;
  }

  isTableContext(): boolean {
    return !!this.cart.tableToken || !!this.cart.tableNumber;
  }

  showDeliveryOption(): boolean {
    return this.canDelivery() && !this.isTableContext();
  }

  pendingItems() {
    return (this.activeOrder()?.items ?? []).filter(i => !i.isDone);
  }

  completedItems() {
    return (this.activeOrder()?.items ?? []).filter(i => i.isDone);
  }

  viewLastPaidInvoice(): void {
    const orderId = this.cart.lastPaidOrder?.orderId;
    if (!orderId) return;
    window.open(`/invoice/${orderId}`, '_blank');
  }

  canDineIn(): boolean {
    return this.cart.enableDineIn && !!this.cart.tableNumber;
  }

  canDelivery(): boolean {
    return this.cart.enableDelivery;
  }

  canDeliveryCash(): boolean {
    return this.cart.enableDeliveryCash;
  }

  canDeliveryCard(): boolean {
    return this.cart.enableDeliveryCard;
  }

  selectOrderType(type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'): void {
    this.orderType.set(type);
    this.cartService.setOrderType(type);
    if (type === 'DELIVERY' && !this.canDeliveryCash() && this.canDeliveryCard()) {
      this.deliveryPaymentMethod.set('CARD');
    }
  }

  selectDeliveryPaymentMethod(method: 'CASH' | 'CARD'): void {
    this.deliveryPaymentMethod.set(method);
  }

  onItemNotesChange(productId: string, value: string): void {
    this.cartService.setItemNotes(productId, value);
  }

  formatMoney(value: number): string {
    const currency = this.cart.currency ?? 'COP';
    const locale = currency === 'EUR' ? 'es-ES' : 'es-CO';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Recibida',
      IN_PROGRESS: 'En preparación',
      READY: 'Lista',
      DELIVERED: 'Entregada',
      PAYMENT_PENDING: 'Cuenta solicitada',
      PAID: 'Pagada',
      CANCELLED: 'Cancelada'
    };
    return labels[status] ?? status;
  }

  private loadActiveOrder(force = false): void {
    const activeOrderId = this.cart.activeOrder?.orderId;
    if (!activeOrderId) {
      if (force) this.activeOrder.set(null);
      return;
    }

    this.activeOrderLoading.set(true);
    this.activeOrderError.set(null);

    this.orderService.getOrderById(activeOrderId).subscribe({
      next: (order) => {
        this.activeOrder.set(order);
        this.activeOrderLoading.set(false);
        this.cartService.setActiveOrder({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          currency: order.currency
        });

        if (order.status === 'PAID') {
          this.cartService.setLastPaidOrder({
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            total: order.total,
            currency: order.currency
          });
          this.cartService.clearActiveOrder();
        } else if (order.status === 'CANCELLED') {
          this.cartService.clearActiveOrder();
        }
      },
      error: () => {
        this.activeOrderLoading.set(false);
        this.activeOrderError.set('No se pudo cargar el pedido actual.');
      }
    });
  }
}
