import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WaiterCallService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  callWaiter(restaurantId: string, tableToken: string | null): Observable<{ waiterCallId: string }> {
    return this.http.post<{ waiterCallId: string }>(`${this.baseUrl}/public/waiter-calls`, {
      restaurantId,
      tableToken
    });
  }
}
