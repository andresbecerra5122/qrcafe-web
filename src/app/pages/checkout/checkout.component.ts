import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent {
customerName = signal('');
  notes = signal('');
  orderType = signal<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  loading = signal(false);
  error = signal<string | null>(null);

  

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
  ) {}

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

    const payload = {
      restaurantId: this.cart.restaurantId,
      currency: this.cart.currency,
      orderType: this.orderType(),
      tableToken: this.orderType() === 'DINE_IN' ? this.cart.tableToken : null,
      customerName: this.customerName() || null,
      notes: this.notes() || null,
      items: this.cart.items.map(i => ({
        productId: i.productId,
        qty: i.qty,
        notes: i.notes || null
      }))
    };

    this.loading.set(true);

    this.orderService.createOrder(payload).subscribe({
      next: (res) => {
        this.cartService.clear();
        this.router.navigate(['/order-success', res.orderId]);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error creando la orden');
        this.loading.set(false);
      }
    });
  }

  canDineIn(): boolean {
    return !!this.cart.tableNumber;
  }
  
}
