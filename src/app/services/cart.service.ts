import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem, CartState } from '../models/cart/cart.models';

const STORAGE_KEY = 'qrcafe_cart_v1';

function loadState(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { restaurantId: null, tableToken: null, orderType: null, items: [] };
    return JSON.parse(raw) as CartState;
  } catch {
    return { restaurantId: null, tableToken: null, orderType: null, items: [] };
  }
}

function saveState(state: CartState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _state$ = new BehaviorSubject<CartState>(loadState());
  state$ = this._state$.asObservable();

  get state(): CartState {
    return this._state$.value;
  }

  private setState(next: CartState) {
    this._state$.next(next);
    saveState(next);
  }

  initContext(restaurantId: string, tableToken: string | null) {
    const s = this.state;

    // si cambia restaurante, limpiamos carrito (MVP)
    if (s.restaurantId && s.restaurantId !== restaurantId) {
      this.setState({ restaurantId, tableToken, orderType: null, items: [] });
      return;
    }

    this.setState({
      ...s,
      restaurantId,
      tableToken
    });
  }

  setOrderType(orderType: 'DINE_IN' | 'TAKEAWAY') {
    this.setState({ ...this.state, orderType });
  }

  addItem(item: Omit<CartItem, 'qty'>, qty = 1) {
    const s = this.state;
    const existing = s.items.find(x => x.productId === item.productId);

    if (existing) {
      existing.qty += qty;
      this.setState({ ...s, items: [...s.items] });
      return;
    }

    this.setState({ ...s, items: [...s.items, { ...item, qty }] });
  }

  inc(productId: string) {
    const s = this.state;
    const it = s.items.find(x => x.productId === productId);
    if (!it) return;
    it.qty += 1;
    this.setState({ ...s, items: [...s.items] });
  }

  dec(productId: string) {
    const s = this.state;
    const it = s.items.find(x => x.productId === productId);
    if (!it) return;

    it.qty -= 1;
    const nextItems = it.qty <= 0
      ? s.items.filter(x => x.productId !== productId)
      : [...s.items];

    this.setState({ ...s, items: nextItems });
  }

  clear() {
    const s = this.state;
    this.setState({ ...s, items: [] });
  }

  getCount(): number {
    return this.state.items.reduce((acc, x) => acc + x.qty, 0);
  }

  getSubtotal(): number {
    return this.state.items.reduce((acc, x) => acc + (x.price * x.qty), 0);
  }
}
