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
  orderType = signal<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  deliveryAddress = signal('');
  deliveryReference = signal('');
  deliveryPhone = signal('');
  deliveryPaymentMethod = signal<'CASH' | 'CARD'>('CASH');
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
  ) {
    const fromCart = this.cart.orderType;
    if (fromCart === 'DINE_IN' || fromCart === 'TAKEAWAY' || fromCart === 'DELIVERY') {
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
        this.cartService.clear();
        this.router.navigate(['/order-success', res.orderId], { replaceUrl: true });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error creando la orden');
        this.loading.set(false);
      }
    });
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
  
}
