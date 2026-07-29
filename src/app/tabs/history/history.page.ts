import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowUpOutline,
  arrowDownOutline,
  imageOutline,
  documentOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ]
})
export class HistoryPage implements OnInit {

  selectedTab: 'received' | 'sent' = 'received';

  constructor() {
    addIcons({
      arrowUpOutline,
      arrowDownOutline,
      imageOutline,
      documentOutline
    });
  }

  ngOnInit(): void {
  }

  showReceived() {
    this.selectedTab = 'received';
  }

  showSent() {
    this.selectedTab = 'sent';
  }

}