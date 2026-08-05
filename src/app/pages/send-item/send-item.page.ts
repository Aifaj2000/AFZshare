import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonFooter,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  wifiOutline,
  bluetoothOutline,
  checkmarkCircle,
  qrCodeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-send-item',
  standalone: true,
  templateUrl: './send-item.page.html',
  styleUrls: ['./send-item.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonBackButton
  ]
})
export class SendItemPage {

  wifiEnabled = false;
  bluetoothEnabled = false;

  showConnectUI = false;

  constructor() {
    addIcons({
      wifiOutline,
      bluetoothOutline,
      checkmarkCircle,
      qrCodeOutline
    });
  }

  enableWifi() {
    this.wifiEnabled = true;
  }

  enableBluetooth() {
    this.bluetoothEnabled = true;
  }

  continue() {
    this.showConnectUI = true;
  }

}