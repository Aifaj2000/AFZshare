import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'select-items',
    loadComponent: () => import('./pages/select-items/select-items.page').then( m => m.SelectItemsPage)
  },
  {
    path: 'send-item',
    loadComponent: () => import('./pages/send-item/send-item.page').then( m => m.SendItemPage)
  },
  {
    path: 'receive',
    loadComponent: () => import('./pages/receive/receive.page').then( m => m.ReceivePage)
  },
  
];
