import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrderPublicDto } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  createOrder(payload: any): Observable<{ orderId: string }> {
    return this.http.post<{ orderId: string }>(`${this.baseUrl}/public/orders`, payload);
  }

  getOrderById(orderId: string): Observable<OrderPublicDto> {
    return this.http.get<OrderPublicDto>(`${this.baseUrl}/public/orders/${orderId}`);
  }

  requestPayment(orderId: string, paymentMethod: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/public/orders/${orderId}/request-payment`, { paymentMethod });
  }
}
