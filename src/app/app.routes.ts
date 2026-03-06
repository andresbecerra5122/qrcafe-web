import { Routes } from '@angular/router';
import { MenuComponent } from './pages/menu/menu.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { OrderSuccessComponent } from './pages/order-success/order-success.component';
import { InvoiceComponent } from './pages/invoice/invoice.component';

export const routes: Routes = [
  {
    path: 'menu',
    component: MenuComponent
  },
  {
    path: '',
    redirectTo: 'menu',
    pathMatch: 'full'
  },
  {
    path: 'checkout',
    component: CheckoutComponent
  },
  {
    path: 'order-success/:orderId',
    component: OrderSuccessComponent
  },
  {
    path: 'invoice/:orderId',
    component: InvoiceComponent
  }
];
