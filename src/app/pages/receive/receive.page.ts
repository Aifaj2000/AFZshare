import { Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NearbyMultipeer } from '@squareetlabs/capacitor-nearby-multipeer';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonIcon, IonButton, IonProgressBar,
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
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { TransferHistoryService } from 'src/app/services/transfer-history.service';

interface IncomingItem {
  name: string;
  sizeBytes: number;
  status: 'pending' | 'receiving' | 'done' | 'saved';
  bytesReceived: number;
  filePath?: string;
}

@Component({
  selector: 'app-receive',
  standalone: true,
  templateUrl: './receive.page.html',
  styleUrls: ['./receive.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonContent, IonIcon, IonButton,
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

    private lastProgressUpdate = 0;

  constructor(private router: Router,
    private alertCtrl: AlertController,
    private ngZone: NgZone,private transferHistory: TransferHistoryService) {
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
      // Create AFZShare folder on receiver
      try {
        await Filesystem.mkdir({
          path: 'afzshare',
          directory: Directory.Documents,
          recursive: true
        });

        console.log('AFZSHARE folder created');
      } catch (folderError) {
        // Folder may already exist
        console.log('AFZSHARE folder already exists:', folderError);
      }

      await NearbyMultipeer.initialize({
        serviceId: 'com.afzshare.app'
      });

      await NearbyMultipeer.setStrategy({
        strategy: 'P2P_STAR'
      });

     const deviceInfo = await Device.getInfo();

const deviceName =
  deviceInfo.name ||
  deviceInfo.model ||
  'Android Device';

await NearbyMultipeer.startAdvertising({
  displayName: `${deviceName}#${this.pairingCode}`,
});

console.log(
  'ADVERTISING STARTED as',
  `${deviceName}#${this.pairingCode}`
);

      console.log(
        'ADVERTISING STARTED as',
        `MyDevice#${this.pairingCode}`
      );

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
  await NearbyMultipeer.addListener(
    'payloadTransferUpdate',
    (e: any) => {

      // Ignore tiny metadata/message payloads
      if (!e.totalBytes || e.totalBytes < 1024) {
        return;
      }

      const index = this.incomingItems.findIndex(
        (item: IncomingItem) =>
          item.status === 'receiving' &&
          item.sizeBytes === e.totalBytes
      );

      if (index === -1) {
        return;
      }

      const isComplete = e.bytesTransferred >= e.totalBytes;
      const now = Date.now();

      // Throttle UI updates — skip if too soon since last render,
      // unless this is the final update for this file
      if (!isComplete && now - this.lastProgressUpdate < 150) {
        return;
      }
      this.lastProgressUpdate = now;

      this.ngZone.run(() => {

        const item = this.incomingItems[index];

        item.bytesReceived = e.bytesTransferred;

        this.overallBytesReceived =
          this.incomingItems.reduce(
            (total, current) =>
              total + (current.bytesReceived || 0),
            0
          );

        const percent =
          item.sizeBytes > 0
            ? (item.bytesReceived / item.sizeBytes) * 100
            : 0;

        console.log(
          `FILE PROGRESS: ${item.name} ` +
          `${item.bytesReceived}/${item.sizeBytes} ` +
          `${percent.toFixed(1)}%`
        );
      });
    }
  )
);


  this.listeners.push(
  await (NearbyMultipeer as any).addListener(
    'fileReceived',
    async (e: any) => {

      console.log(
        'FILE RECEIVED:',
        JSON.stringify(e)
      );


      this.ngZone.run(() => {

        const index = this.incomingItems.findIndex(
          (item: IncomingItem) =>
            item.name === e.fileName &&
            item.status !== 'saved'
        );


        if (index === -1) {

          console.warn(
            'Received file not found in incomingItems:',
            e.fileName
          );

          return;
        }


        const item =
          this.incomingItems[index];


        // Mark file as saved
        item.status = 'saved';


        // Save actual file path
        item.filePath =
          e.filePath;


        // Make progress 100%
        item.bytesReceived =
          item.sizeBytes;


        // Update overall progress
        this.overallBytesReceived =
          this.incomingItems.reduce(
            (total, current) =>
              total +
              (current.bytesReceived || 0),
            0
          );


        console.log(
          'FILE SAVED:',
          e.fileName
        );


        console.log(
          'SAVED PATH:',
          e.filePath
        );

      });


      // ==========================================
      // SAVE TO TRANSFER HISTORY
      // ==========================================

      const receivedItem =
        this.incomingItems.find(
          item => item.name === e.fileName
        );


      await this.transferHistory.addHistory({

        name: e.fileName,

        sizeBytes:
          e.fileSize ||
          receivedItem?.sizeBytes ||
          0,

        direction: 'received',

        deviceName:
          this.senderName ||
          'Unknown device',

        date: Date.now(),

        status: 'completed',

        filePath: e.filePath

      });


      console.log(
        'RECEIVED HISTORY SAVED:',
        e.fileName
      );

    }
  )
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
    try { await NearbyMultipeer.stopAdvertising(); } catch { }
  }

  private async createAfzShareFolder() {
    try {
      await Filesystem.mkdir({
        path: 'afzshare',
        directory: Directory.Documents,
        recursive: true
      });

      console.log('AFZSHARE FOLDER READY');
    } catch (err: any) {
      // Folder may already exist
      console.log('AFZSHARE FOLDER:', err);
    }
  }

  async openFiles() {
  try {
    await AppLauncher.openUrl({
      url: 'content://com.android.documentsui/root/primary'
    });
  } catch (error) {
    console.error('Could not open Files:', error);
  }
}

get allSaved(): boolean {
  return this.incomingItems.length > 0 &&
    this.incomingItems.every(item => item.status === 'saved');
}

}