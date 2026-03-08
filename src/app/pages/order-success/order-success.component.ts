import { Component, OnInit, OnDestroy, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { OrderService } from '../../services/order.service';
import { OrderPublicDto } from '../../models/order.model';
import { CartService } from '../../services/cart.service';

type PageState = 'loading' | 'created' | 'in_progress' | 'ready' | 'out_for_delivery' | 'delivered' | 'payment_pending' | 'paid' | 'cancelled' | 'error';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-success.component.html',
  styleUrl: './order-success.component.scss'
})
export class OrderSuccessComponent implements OnInit, OnDestroy {
  order = signal<OrderPublicDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  requestingPayment = signal(false);
  requestError = signal<string | null>(null);

  currency = computed(() => this.order()?.currency ?? 'COP');
  statusLabel = computed(() => this.getStatusLabel(this.order()?.status ?? ''));

  pageState = computed<PageState>(() => {
    if (this.loading()) return 'loading';
    if (this.error()) return 'error';

    const o = this.order();
    if (!o) return 'error';

    switch (o.status) {
      case 'CREATED':          return 'created';
      case 'IN_PROGRESS':      return 'in_progress';
      case 'READY':            return 'ready';
      case 'OUT_FOR_DELIVERY': return 'out_for_delivery';
      case 'DELIVERED':        return 'delivered';
      case 'PAYMENT_PENDING':  return 'payment_pending';
      case 'PAID':             return 'paid';
      case 'CANCELLED':        return 'cancelled';
      default:                 return 'created';
    }
  });

  private menuUrl = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private orderId: string | null = null;

  private readonly activeStatuses = ['CREATED', 'IN_PROGRESS', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PAYMENT_PENDING'];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private cartService: CartService
  ) {}

  /** Fix 4: warn before closing/refreshing when order is active */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    const status = this.order()?.status;
    if (status && this.activeStatuses.includes(status)) {
      event.preventDefault();
    }
  }

  ngOnInit() {
    const cart = this.cartService.state;
    const params = new URLSearchParams();
    if (cart.restaurantId) params.set('restaurantId', cart.restaurantId);
    if (cart.tableToken) params.set('table', cart.tableToken);
    this.menuUrl = `/menu${params.toString() ? '?' + params.toString() : ''}`;

    // Fix 1: replace history so back button won't go to checkout
    history.replaceState(null, '', location.href);

    this.orderId = this.route.snapshot.paramMap.get('orderId');
    if (!this.orderId) {
      this.error.set('Orden no encontrada');
      this.loading.set(false);
      return;
    }

    this.fetchOrder();
    this.pollTimer = setInterval(() => this.fetchOrder(), 10_000);
  }

  ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  fetchOrder() {
    if (!this.orderId) return;

    this.orderService.getOrderById(this.orderId).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
        this.error.set(null);

        if (['PAID', 'CANCELLED'].includes(o.status)) {
          this.stopPolling();
        }
      },
      error: () => {
        if (this.loading()) {
          this.error.set('No se pudo cargar la orden');
          this.loading.set(false);
        }
      }
    });
  }

  orderAgain() {
    window.open(this.menuUrl, '_blank');
  }

  viewInvoice() {
    if (this.orderId) {
      window.open(`/invoice/${this.orderId}`, '_blank');
    }
  }

  requestWaiter(method: 'CASH' | 'CARD') {
    if (!this.orderId) return;

    this.requestingPayment.set(true);
    this.requestError.set(null);

    this.orderService.requestPayment(this.orderId, method).subscribe({
      next: () => {
        this.requestingPayment.set(false);
        this.fetchOrder();
      },
      error: (err) => {
        this.requestingPayment.set(false);
        this.requestError.set(err?.error?.message ?? 'No se pudo solicitar el mesero');
      }
    });
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Orden recibida',
      PAYMENT_PENDING: 'Pago pendiente',
      PAID: 'Pagada',
      IN_PROGRESS: 'En preparación',
      READY: 'Lista',
      OUT_FOR_DELIVERY: 'En reparto',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelada'
    };
    return labels[status] ?? status;
  }
}
