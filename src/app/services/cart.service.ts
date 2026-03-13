import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActiveOrderSummary, CartItem, CartState, LastPaidOrderSummary } from '../models/cart/cart.models';

const STORAGE_KEY = 'qrcafe_cart_v1';

function loadState(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {
      restaurantId: null,
      tableToken: null,
      tableNumber: null,
      currency: null,
      enableDineIn: true,
      enableDelivery: false,
      enableDeliveryCash: true,
      enableDeliveryCard: true,
      orderType: null,
      items: [],
      activeOrder: null,
      lastPaidOrder: null
    };

    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      restaurantId: parsed.restaurantId ?? null,
      tableToken: parsed.tableToken ?? null,
      tableNumber: parsed.tableNumber ?? null,
      currency: parsed.currency ?? null,
      enableDineIn: parsed.enableDineIn ?? true,
      enableDelivery: parsed.enableDelivery ?? false,
      enableDeliveryCash: parsed.enableDeliveryCash ?? true,
      enableDeliveryCard: parsed.enableDeliveryCard ?? true,
      orderType: parsed.orderType ?? null,
      items: parsed.items ?? [],
      activeOrder: parsed.activeOrder ?? null,
      lastPaidOrder: parsed.lastPaidOrder ?? null
    };
  } catch {
    return {
      restaurantId: null,
      tableToken: null,
      tableNumber: null,
      currency: null,
      enableDineIn: true,
      enableDelivery: false,
      enableDeliveryCash: true,
      enableDeliveryCard: true,
      orderType: null,
      items: [],
      activeOrder: null,
      lastPaidOrder: null
    };
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

  initContext(
    restaurantId: string,
    tableToken: string | null,
    tableNumber: number | null,
    currency: string | null,
    enableDineIn = true,
    enableDelivery = false,
    enableDeliveryCash = true,
    enableDeliveryCard = true
  ) {
    const s = this.state;

    // si cambia restaurante, limpiamos carrito (MVP)
    if (s.restaurantId && s.restaurantId !== restaurantId) {
      this.setState({
        restaurantId,
        tableToken,
        tableNumber,
        currency,
        enableDineIn,
        enableDelivery,
        enableDeliveryCash,
        enableDeliveryCard,
        orderType: null,
        items: [],
        activeOrder: null,
        lastPaidOrder: null
      });
      return;
    }

    this.setState({
      ...s,
      restaurantId,
      tableToken,
      tableNumber,
      currency,
      enableDineIn,
      enableDelivery,
      enableDeliveryCash,
      enableDeliveryCard
    });
  }

  setOrderType(orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') {
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

  setItemNotes(productId: string, notes: string | null) {
    const s = this.state;
    const it = s.items.find(x => x.productId === productId);
    if (!it) return;

    const normalized = notes?.trim();
    it.notes = normalized ? normalized : null;
    this.setState({ ...s, items: [...s.items] });
  }

  clear() {
    const s = this.state;
    this.setState({ ...s, items: [] });
  }

  setActiveOrder(activeOrder: ActiveOrderSummary) {
    this.setState({ ...this.state, activeOrder });
  }

  clearActiveOrder() {
    this.setState({ ...this.state, activeOrder: null });
  }

  setLastPaidOrder(lastPaidOrder: LastPaidOrderSummary) {
    this.setState({ ...this.state, lastPaidOrder });
  }

  clearLastPaidOrder() {
    this.setState({ ...this.state, lastPaidOrder: null });
  }

  getCount(): number {
    return this.state.items.reduce((acc, x) => acc + x.qty, 0);
  }

  getSubtotal(): number {
    return this.state.items.reduce((acc, x) => acc + (x.price * x.qty), 0);
  }
}
