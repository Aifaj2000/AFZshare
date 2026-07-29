import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
       {
          path: 'share',
          loadComponent: () => import('./share/share.page').then( m => m.SharePage)
        },
        {
          path: 'history',
          loadComponent: () => import('./history/history.page').then( m => m.HistoryPage)
        },
      {
        path: '',
        redirectTo: '/tabs/share',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/share',
    pathMatch: 'full',
  },
 
];
