import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NearbyMultipeer } from '@squareetlabs/capacitor-nearby-multipeer';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonIcon, IonButton, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, checkmarkCircleOutline, checkmarkCircle,
  bluetoothOutline, wifiOutline, locationOutline
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { BleClient } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-receive',
  standalone: true,
  templateUrl: './receive.page.html',
  styleUrls: ['./receive.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonContent, IonIcon, IonButton, IonFooter
  ]
})
export class ReceivePage implements OnDestroy {

  status: 'waiting' | 'incoming' | 'connected' = 'waiting';
  senderName = '';
  private listeners: any[] = [];
  private pendingEndpointId = '';

  wifiEnabled = false;
  bluetoothEnabled = false;
  locationEnabled = false;

  showConnectUI = false;

  constructor(private router: Router) {
    addIcons({
      qrCodeOutline,
      checkmarkCircleOutline,
      wifiOutline,
      bluetoothOutline,
      locationOutline,
      checkmarkCircle,
    });
  }

  async ngOnInit() {

  // Check immediately when the page opens
  await this.refreshPermissions();

  // Check again when returning from Android Settings
  App.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      await this.refreshPermissions();
    }
  });
}

ionviewWillEnter() {
  this.refreshPermissions();
}

async refreshPermissions() {
  await this.checkWifi();
  await this.checkLocation();
  await this.checkBluetooth();
}

  get allPermissionsEnabled(): boolean {
    return this.wifiEnabled && this.bluetoothEnabled && this.locationEnabled;
  }

 async enableWifi() {
    if (Capacitor.getPlatform() === 'android') {
      await AppLauncher.openUrl({
        url: 'android.settings.WIFI_SETTINGS'
      });
    }
  }

  async enableBluetooth() {
    if (Capacitor.getPlatform() === 'android') {
      await AppLauncher.openUrl({
        url: 'android.settings.BLUETOOTH_SETTINGS'
      });
    }
  }

  async enableLocation() {
    if (Capacitor.getPlatform() === 'android') {
      await AppLauncher.openUrl({
        url: 'android.settings.LOCATION_SOURCE_SETTINGS'
      });
    }
  }


async checkLocation() {
  try {
    await Geolocation.getCurrentPosition({
      timeout: 3000
    });

    this.locationEnabled = true;
  } catch (e) {
    this.locationEnabled = false;
  }
}


async checkWifi() {
  const status = await Network.getStatus();

  this.wifiEnabled =
    status.connected &&
    status.connectionType === 'wifi';
}


async checkBluetooth() {
  try {
    await BleClient.initialize();

    const enabled = await BleClient.isEnabled();
    this.bluetoothEnabled = enabled;
  } catch (e) {
    this.bluetoothEnabled = false;
  }
}

  async continue() {
    if (!this.allPermissionsEnabled) return;
    this.showConnectUI = true;

    await this.setupListeners();
    await this.startWaiting();
  }

  private async setupListeners() {
    this.listeners.push(
      await NearbyMultipeer.addListener('connectionRequested', (e: any) => {
        this.status = 'incoming';
        this.senderName = e.endpointName || 'Unknown device';
        this.pendingEndpointId = e.endpointId;
        NearbyMultipeer.acceptConnection({ endpointId: e.endpointId });
      })
    );

    this.listeners.push(
      await NearbyMultipeer.addListener('connectionResult', (e: any) => {
        if (e.status === 0) {
          this.status = 'connected';
          this.router.navigate(['/tabs/transfer'], {
            queryParams: { endpointId: e.endpointId, role: 'receiver' },
          });
        } else {
          this.status = 'waiting';
        }
      })
    );
  }

  async startWaiting() {
    this.status = 'waiting';
    try {
      await NearbyMultipeer.initialize({ serviceId: 'com.afzshare.app' });
      await NearbyMultipeer.setStrategy({ strategy: 'P2P_STAR' });
      await NearbyMultipeer.startAdvertising({ displayName: 'My Device' });
    } catch (err) {
      console.error('Failed to start advertising', err);
    }
  }

  async ngOnDestroy() {
    this.listeners.forEach(l => l.remove());
    try {
      await NearbyMultipeer.stopAdvertising();
    } catch {}
  }
}