import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { MenuResponse } from '../models/menu/menu.models';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getMenuByRestaurantId(restaurantId: string): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(`${this.base}/public/restaurants/${encodeURIComponent(restaurantId)}/menu`);
  }
}
