import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { OrderService } from '../../services/order.service';
import { OrderPublicDto } from '../../models/order.model';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {
  order = signal<OrderPublicDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  currency = computed(() => this.order()?.currency ?? 'COP');

  formattedDate = computed(() => {
    const o = this.order();
    if (!o) return '';
    const d = new Date(o.createdAt);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  });

  paymentLabel = computed(() => {
    const method = this.order()?.paymentMethod;
    if (!method) return '';
    return method === 'CASH' ? 'Efectivo' : 'Tarjeta';
  });

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) {
      this.error.set('Factura no encontrada');
      this.loading.set(false);
      return;
    }

    this.orderService.getOrderById(orderId).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la factura');
        this.loading.set(false);
      }
    });
  }

  printInvoice() {
    window.print();
  }
}
