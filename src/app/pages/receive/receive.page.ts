import { Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NearbyMultipeer } from '@squareetlabs/capacitor-nearby-multipeer';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonIcon, IonButton, IonFooter, IonProgressBar,
  IonList, IonItem, IonLabel, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, checkmarkCircleOutline, checkmarkCircle,
  bluetoothOutline, wifiOutline, locationOutline, closeCircle,
  ellipseOutline, documentOutline
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { Geolocation } from '@capacitor/geolocation';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { AlertController } from '@ionic/angular';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import * as QRCode from 'qrcode';

interface IncomingItem {
  name: string;
  sizeBytes: number;
  status: 'pending' | 'receiving' | 'done';
  bytesReceived: number;
}

@Component({
  selector: 'app-receive',
  standalone: true,
  templateUrl: './receive.page.html',
  styleUrls: ['./receive.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonContent, IonIcon, IonButton, IonFooter,
    IonProgressBar, IonList, IonItem, IonLabel, IonSpinner
  ]
})
export class ReceivePage implements OnDestroy {

   @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  pairingCode = '';

  status: 'waiting' | 'incoming' | 'connected' = 'waiting';
  senderName = '';
  private listeners: any[] = [];
  private pendingEndpointId = '';

  wifiEnabled = false;
  bluetoothEnabled = false;
  locationEnabled = false;

  showConnectUI = false;
  verifying = false;

  // ---- transfer progress state ----
  incomingItems: IncomingItem[] = [];
  currentItemIndex = 0;
  overallBytesReceived = 0;
  overallTotalBytes = 0;

  constructor(private router: Router, 
    private alertCtrl: AlertController,
    private ngZone: NgZone) {
    addIcons({
      qrCodeOutline, checkmarkCircleOutline, wifiOutline,
      bluetoothOutline, locationOutline, checkmarkCircle,
      closeCircle, ellipseOutline, documentOutline
    });
  }

  async ngOnInit() {
    await this.requestAllPermissions();
  }

 

  async startWaiting() {
    this.status = 'waiting';
    this.pairingCode = this.generatePairingCode();

    try {
      await NearbyMultipeer.initialize({ serviceId: 'com.afzshare.app' });
      await NearbyMultipeer.setStrategy({ strategy: 'P2P_STAR' });
      await NearbyMultipeer.startAdvertising({
        displayName: `MyDevice#${this.pairingCode}`,
      });

      console.log('ADVERTISING STARTED as', `MyDevice#${this.pairingCode}`);

      // Draw QR after view updates so the canvas exists
      setTimeout(() => this.renderQr(), 0);
    } catch (err) {
      console.error('Failed to start advertising', err);
    }
  }

  private generatePairingCode(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  private async renderQr() {
    if (!this.qrCanvas) return;
    const payload = JSON.stringify({ code: this.pairingCode, name: 'My Device' });
    await QRCode.toCanvas(this.qrCanvas.nativeElement, payload, {
      width: 220,
      margin: 1,
      color: { dark: '#2f9bff', light: '#00000000' },
    });
  }

  private async requestAllPermissions() {
    try {
      const locPerm = await Geolocation.checkPermissions();
      if (locPerm.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
    } catch (e) {
      console.warn('Location permission request failed', e);
    }

    try {
      const wifiPerm = await CapacitorWifi.checkPermissions();
      if (wifiPerm.location !== 'granted') {
        await CapacitorWifi.requestPermissions({ permissions: ['location'] });
      }
    } catch (e) {
      console.warn('Wi-Fi permission request failed', e);
    }

    try {
      await BleClient.initialize();
    } catch (e) {
      console.warn('Bluetooth permission/init failed', e);
    }
  }

  get allPermissionsEnabled(): boolean {
    return this.wifiEnabled && this.bluetoothEnabled && this.locationEnabled;
  }

  async enableWifi() {
    this.wifiEnabled = true;
    if (Capacitor.getPlatform() === 'android') {
      await AppLauncher.openUrl({ url: 'android.settings.WIFI_SETTINGS' });
    }
  }

  async enableBluetooth() {
    this.bluetoothEnabled = true;
    if (Capacitor.getPlatform() === 'android') {
      await AppLauncher.openUrl({ url: 'android.settings.BLUETOOTH_SETTINGS' });
    }
  }

  async enableLocation() {
    this.locationEnabled = true;
    if (Capacitor.getPlatform() === 'android') {
      await AppLauncher.openUrl({ url: 'android.settings.LOCATION_SOURCE_SETTINGS' });
    }
  }

  private async checkWifiReal(): Promise<boolean> {
    try {
      const perms = await CapacitorWifi.checkPermissions();
      if (perms.location !== 'granted') {
        await CapacitorWifi.requestPermissions({ permissions: ['location'] });
      }
      const result = await CapacitorWifi.isEnabled();
      return !!result.enabled;
    } catch (e) {
      console.log('WIFI CHECK FAILED:', JSON.stringify(e));
      return false;
    }
  }

  private async checkLocationReal(): Promise<boolean> {
    try {
      const pos = await Geolocation.getCurrentPosition({
        timeout: 8000,
        maximumAge: 60000,
        enableHighAccuracy: false,
      });
      console.log('LOCATION OK:', JSON.stringify(pos.coords));
      return true;
    } catch (e) {
      console.log('LOCATION FAILED:', JSON.stringify(e));
      return false;
    }
  }

  private async checkBluetoothReal(): Promise<boolean> {
    try {
      await BleClient.initialize();
      const enabled = await BleClient.isEnabled();
      console.log('BLUETOOTH ENABLED:', enabled);
      return enabled;
    } catch (e) {
      console.log('BLUETOOTH FAILED:', JSON.stringify(e));
      return false;
    }
  }

  async continue() {
    if (this.verifying) return;
    this.verifying = true;

    try {
      const [wifiOk, bluetoothOk, locationOk] = await Promise.all([
        this.checkWifiReal(),
        this.checkBluetoothReal(),
        this.checkLocationReal(),
      ]);

      this.wifiEnabled = wifiOk;
      this.bluetoothEnabled = bluetoothOk;
      this.locationEnabled = locationOk;

      const missing: string[] = [];
      if (!wifiOk) missing.push('Wi-Fi');
      if (!bluetoothOk) missing.push('Bluetooth');
      if (!locationOk) missing.push('Location');

      if (missing.length > 0) {
        await this.showMissingAlert(missing);
        return;
      }

      this.showConnectUI = true;
      await this.setupListeners();
      await this.startWaiting();
    } finally {
      this.verifying = false;
    }
  }

  private async showMissingAlert(missing: string[]) {
    const alert = await this.alertCtrl.create({
      header: 'Almost there',
      message: `Please turn on ${missing.join(', ')} to continue.`,
      buttons: ['OK'],
    });
    await alert.present();
  }

 private async setupListeners() {
  this.listeners.push(
    await NearbyMultipeer.addListener('connectionRequested', async (e: any) => {
      console.log('CONNECTION REQUESTED FROM:', JSON.stringify(e));

      this.ngZone.run(() => {
        this.status = 'incoming';
        this.senderName = e.endpointName || 'Unknown device';
        this.pendingEndpointId = e.endpointId;
      });

      const alert = await this.alertCtrl.create({
        header: 'Incoming Connection',
        message: `${e.endpointName || 'A device'} wants to connect and share files with you.`,
        backdropDismiss: false,
        buttons: [
          {
            text: 'Decline',
            role: 'cancel',
            handler: () => {
              this.ngZone.run(() => { this.status = 'waiting'; });
              try {
                (NearbyMultipeer as any).rejectConnection?.({ endpointId: e.endpointId });
              } catch (err) {
                console.warn('rejectConnection not available', err);
              }
            },
          },
          {
            text: 'Accept',
            handler: () => {
              NearbyMultipeer.acceptConnection({ endpointId: e.endpointId });
            },
          },
        ],
      });

      await alert.present();
    })
  );

  this.listeners.push(
    await NearbyMultipeer.addListener('connectionResult', (e: any) => {
      console.log('CONNECTION RESULT (receiver):', JSON.stringify(e));
      this.ngZone.run(() => {
        if (e.status === 0) {
          this.status = 'connected';
        } else {
          this.status = 'waiting';
        }
      });
    })
  );

  // Metadata sent by sender before each file (JSON via sendMessage)
  this.listeners.push(
    await NearbyMultipeer.addListener('message', (e: any) => {
      console.log('MESSAGE RECEIVED:', JSON.stringify(e));
      try {
        const meta = JSON.parse(e.data);
        this.ngZone.run(() => {
          if (meta.type === 'batch-start') {
            this.incomingItems = meta.items.map((i: any) => ({
              name: i.name,
              sizeBytes: i.sizeBytes,
              status: 'pending',
              bytesReceived: 0,
            }));
            this.overallTotalBytes = meta.items.reduce((s: number, i: any) => s + i.sizeBytes, 0);
            this.overallBytesReceived = 0;
            this.currentItemIndex = 0;
          } else if (meta.type === 'item-start') {
            this.currentItemIndex = meta.index;
            if (this.incomingItems[meta.index]) {
              this.incomingItems[meta.index].status = 'receiving';
            }
          }
        });
      } catch {
        // not JSON metadata — ignore or handle plain text messages separately
      }
    })
  );

  this.listeners.push(
    await NearbyMultipeer.addListener('payloadTransferUpdate', (e: any) => {
      console.log('PAYLOAD TRANSFER UPDATE:', JSON.stringify(e));
      this.ngZone.run(() => {
        const item = this.incomingItems[this.currentItemIndex];
        if (!item) return;

        const delta = e.bytesTransferred - item.bytesReceived;
        item.bytesReceived = e.bytesTransferred;
        this.overallBytesReceived += delta;

        if (e.status === 3) {
          item.status = 'done';
          item.bytesReceived = item.sizeBytes;
        }
      });
    })
  );

  this.listeners.push(
    await NearbyMultipeer.addListener('endpointLost', () => {
      console.log('ENDPOINT LOST');
      this.ngZone.run(() => {
        this.status = 'waiting';
      });
    })
  );
}


  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  async ngOnDestroy() {
    this.listeners.forEach(l => l.remove());
    try { await NearbyMultipeer.stopAdvertising(); } catch {}
  }
}