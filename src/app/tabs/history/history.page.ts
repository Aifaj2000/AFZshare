import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';

import {
  addIcons
} from 'ionicons';

import {
  arrowUpOutline,
  arrowDownOutline,
  imageOutline,
  documentOutline,
  timeOutline,
  folderOutline
} from 'ionicons/icons';
import { TransferHistoryItem, TransferHistoryService } from 'src/app/services/transfer-history.service';




@Component({
  selector: 'app-history',

  templateUrl: './history.page.html',

  styleUrls: ['./history.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ]
})
export class HistoryPage implements OnInit {


  selectedTab: 'received' | 'sent' = 'received';


  constructor(
    public transferHistory: TransferHistoryService
  ) {

    addIcons({

      arrowUpOutline,
      arrowDownOutline,

      imageOutline,
      documentOutline,

      timeOutline,
      folderOutline

    });

  }


  ngOnInit(): void {

    this.transferHistory.loadHistory();

  }


  showReceived() {

    this.selectedTab = 'received';

  }


  showSent() {

    this.selectedTab = 'sent';

  }


  get receivedItems(): TransferHistoryItem[] {

    return this.transferHistory
      .history()
      .filter(
        item => item.direction === 'received'
      );

  }


  get sentItems(): TransferHistoryItem[] {

    return this.transferHistory
      .history()
      .filter(
        item => item.direction === 'sent'
      );

  }


  getFileIcon(
    item: TransferHistoryItem
  ): string {

    const name =
      item.name.toLowerCase();


    if (
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.gif') ||
      name.endsWith('.webp')
    ) {

      return 'image-outline';

    }


    return 'document-outline';

  }


  formatDate(
    timestamp: number
  ): string {

    return new Date(
      timestamp
    ).toLocaleString(
      undefined,
      {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit'
      }
    );

  }


  formatBytes(
    bytes: number
  ): string {

    if (!bytes) {
      return '0 B';
    }


    const units = [
      'B',
      'KB',
      'MB',
      'GB'
    ];


    const index =
      Math.floor(
        Math.log(bytes) /
        Math.log(1024)
      );


    return (
      parseFloat(
        (
          bytes /
          Math.pow(1024, index)
        ).toFixed(2)
      ) +
      ' ' +
      units[index]
    );

  }


  async clearHistory() {

    await this.transferHistory
      .clearHistory();

  }

}