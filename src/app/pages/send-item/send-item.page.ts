import { Component, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NearbyMultipeer } from '@squareetlabs/capacitor-nearby-multipeer';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonIcon, IonButton, IonFooter, IonAlert,
  IonText,
  IonSpinner,
  IonLabel,
  IonItem,
  IonList,
  IonProgressBar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, checkmarkCircleOutline, checkmarkCircle,
  bluetoothOutline, wifiOutline, locationOutline,
  phonePortraitOutline
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { AlertController } from '@ionic/angular';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { FileShareService, TransferItemState } from 'src/app/services/FileShareService';
import { SelectionService } from 'src/app/services/selection';

@Component({
  selector: 'app-send-item',
  standalone: true,
  templateUrl: './send-item.page.html',
  styleUrls: ['./send-item.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonContent, IonIcon, IonButton, IonFooter, IonText, IonSpinner,IonLabel,IonItem,IonList, IonProgressBar
  ]
})
export class SendItemPage {

  transferStates: TransferItemState[] = [];
bytesSent = 0;
totalBytes = 0;

  status: 'waiting' | 'incoming' | 'connected' = 'waiting';
  senderName = '';
  private listeners: any[] = [];
  private pendingEndpointId = '';

  wifiEnabled = false;
  bluetoothEnabled = false;
  locationEnabled = false;

  showConnectUI = false;
  verifying = false;

  isScanning = false;
  connectionStatus = '';

  devices: { endpointId: string; endpointName: string; connecting: boolean }[] = [];
  connectedEndpointId: string | null = null;
  pendingPairingCode: string | null = null;

   private discoveryStarted = false;


  constructor(private router: Router,
     private alertCtrl: AlertController,
     private fileShareService: FileShareService, 
     private selectionService: SelectionService,
    private ngZone: NgZone) {
    addIcons({
      qrCodeOutline, checkmarkCircleOutline, wifiOutline,
      bluetoothOutline, locationOutline, checkmarkCircle,phonePortraitOutline
    });
  }


  async ngOnInit() {
  await this.requestAllPermissions();
  this.prewarmBarcodeScanner();
}

private async prewarmBarcodeScanner() {
  try {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
  } catch (err) {
    console.warn('Barcode module prewarm skipped', err);
  }
}

private async requestAllPermissions() {
  // Location permission — required by Geolocation, BLE scanning, and the Wi-Fi plugin
  try {
    const locPerm = await Geolocation.checkPermissions();
    if (locPerm.location !== 'granted') {
      await Geolocation.requestPermissions();
    }
  } catch (e) {
    console.warn('Location permission request failed', e);
  }

  // Wi-Fi plugin's own permission check (also location-based, but plugin-specific)
  try {
    const wifiPerm = await CapacitorWifi.checkPermissions();
    if (wifiPerm.location !== 'granted') {
      await CapacitorWifi.requestPermissions({ permissions: ['location'] });
    }
  } catch (e) {
    console.warn('Wi-Fi permission request failed', e);
  }

  // Bluetooth — initialize() triggers the runtime permission prompts
  // (BLUETOOTH_SCAN / BLUETOOTH_CONNECT / BLUETOOTH_ADVERTISE on Android 12+)
  try {
    await BleClient.initialize();
  } catch (e) {
    console.warn('Bluetooth permission/init failed', e);
  }
}

  get allPermissionsEnabled(): boolean {
    return this.wifiEnabled && this.bluetoothEnabled && this.locationEnabled;
  }

  // ---- Tap handlers: optimistically mark as on, open settings ----

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

  // ---- Real checks, only run when CONTINUE is pressed ----

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
    await this.startBackgroundDiscovery();   // <-- ADD THIS LINE
  } finally {
    this.verifying = false;
  }
}


private async startBackgroundDiscovery() {
  if (this.discoveryStarted) return;
  this.discoveryStarted = true;

  try {
    await NearbyMultipeer.initialize({ serviceId: 'com.afzshare.app' });
    await NearbyMultipeer.setStrategy({ strategy: 'P2P_STAR' });
    await this.setupListeners();
    await NearbyMultipeer.startDiscovery();
  } catch (err) {
    console.error('Failed to start discovery', err);
    this.discoveryStarted = false; // allow retry if it actually failed
  }
}

async connectToDeviceDirect(device: { endpointId: string; endpointName: string; connecting: boolean }) {
  if (this.connectedEndpointId) {
    this.connectionStatus = 'Already connected!';
    return;
  }

  this.pendingPairingCode = null; // cancel any pending QR auto-connect — user chose manually

  device.connecting = true;
  this.connectionStatus = `Connecting to ${device.endpointName}...`;

  try {
    await NearbyMultipeer.connect({ endpointId: device.endpointId, displayName: 'My Device' });
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('STATUS_ALREADY_CONNECTED_TO_ENDPOINT') || msg.includes('8003')) {
      this.ngZone.run(() => {
        this.connectedEndpointId = device.endpointId;
        this.connectionStatus = 'Connected!';
      });
    } else {
      console.error('Connect failed', err);
      device.connecting = false;
      this.connectionStatus = 'Connection failed';
    }
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



async scanReceiverQR() {
  const granted = await this.requestCameraPermission();
  if (!granted) {
    this.connectionStatus = 'Camera permission denied';
    return;
  }

  const available = await BarcodeScanner.isSupported();
  if (!available) {
    this.connectionStatus = 'Scanning not supported on this device';
    return;
  }

  // Check if the Google ML Kit module is actually installed (Android only)
  try {
    const { available: moduleAvailable } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!moduleAvailable) {
      this.connectionStatus = 'Downloading scanner module...';
      await BarcodeScanner.installGoogleBarcodeScannerModule();
      this.connectionStatus = 'Ready — try scanning again';
      return; // module was just installed; ask user to tap scan again
    }
  } catch (err) {
    console.warn('Module check failed (likely iOS, safe to ignore)', err);
  }

  try {
    this.isScanning = true;
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });

    if (barcodes.length > 0) {
      await this.connectViaQr(barcodes[0].rawValue);
    }
  } catch (err: any) {
    console.error('Scan failed', err);
    console.error('Scan failed - full error:', JSON.stringify(err)); // ADD THIS — see the real reason
    this.connectionStatus = `Scan failed: ${err?.message || 'unknown error'}`;
  } finally {
    this.isScanning = false;
  }
}

private async requestCameraPermission(): Promise<boolean> {
  const { camera } = await BarcodeScanner.requestPermissions();
  return camera === 'granted' || camera === 'limited';
}

private async connectViaQr(qrData: any) {
  let parsed: { code: string; name: string };
  try {
    parsed = JSON.parse(qrData);
  } catch {
    this.connectionStatus = 'Invalid QR code';
    return;
  }

  if (this.connectedEndpointId) {
    this.connectionStatus = 'Already connected!';
    return; // GUARD — nothing to do, we're already paired
  }

  this.connectionStatus = `Looking for ${parsed.name}...`;
  this.pendingPairingCode = parsed.code;

  await this.startBackgroundDiscovery();

  const alreadyFound = this.devices.find(d => d.endpointName.endsWith(`#${parsed.code}`));
  if (alreadyFound && !this.connectedEndpointId) {
    this.pendingPairingCode = null;
    this.connectionStatus = 'Connecting...';

    try {
      await NearbyMultipeer.connect({ endpointId: alreadyFound.endpointId, displayName: 'My Device' });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('STATUS_ALREADY_CONNECTED_TO_ENDPOINT') || msg.includes('8003')) {
        // Native layer already thinks it's connected — treat as success, not failure
        console.log('Already connected natively, syncing state');
        this.ngZone.run(() => {
          this.connectedEndpointId = alreadyFound.endpointId;
          this.connectionStatus = 'Connected!';
        });
      } else {
        console.error('Connect failed in connectViaQr:', msg);
        this.ngZone.run(() => {
          this.connectionStatus = 'Connection failed';
        });
      }
    }
  }

  setTimeout(() => {
    if (!this.connectedEndpointId && this.pendingPairingCode) {
      this.connectionStatus = 'Not found — pick from nearby devices below';
      this.pendingPairingCode = null;
    }
  }, 8000);
}

private async setupListeners() {
  this.listeners.push(
    await NearbyMultipeer.addListener('endpointFound', async (e: any) => {
      console.log('ENDPOINT FOUND:', JSON.stringify(e));

      this.ngZone.run(() => {   // WRAP STATE CHANGES
        if (!this.devices.some(d => d.endpointId === e.endpointId)) {
          this.devices.push({ endpointId: e.endpointId, endpointName: e.endpointName, connecting: false });
        }
      });

      if (
        this.pendingPairingCode &&
        e.endpointName.endsWith(`#${this.pendingPairingCode}`) &&
        !this.connectedEndpointId
      ) {
        this.pendingPairingCode = null;
        this.ngZone.run(() => { this.connectionStatus = 'Connecting...'; });
        try {
          await NearbyMultipeer.connect({ endpointId: e.endpointId, displayName: 'My Device' });
        } catch (err) {
          console.error('Connect failed', err);
          this.ngZone.run(() => { this.connectionStatus = 'Connection failed'; });
        }
      }
    })
  );

  this.listeners.push(
    await NearbyMultipeer.addListener('endpointLost', (e: any) => {
      console.log('ENDPOINT LOST:', JSON.stringify(e));
      this.ngZone.run(() => {
        this.devices = this.devices.filter(d => d.endpointId !== e.endpointId);
      });
    })
  );

  this.listeners.push(
    await NearbyMultipeer.addListener('connectionResult', (e: any) => {
      console.log('CONNECTION RESULT (sender):', JSON.stringify(e));
      this.ngZone.run(() => {
        if (e.status === 0) {
          this.connectedEndpointId = e.endpointId;
          this.connectionStatus = 'Connected!';
        } else {
          this.connectionStatus = 'Connection failed';
          this.devices.forEach(d => d.connecting = false);
        }
      });
    })
  );
}


private async connectToDevice(qrData: any) {
  const serviceId = qrData?.trim();

  if (!serviceId || !/^[a-z0-9](-?[a-z0-9])*$/.test(serviceId) || serviceId.length > 15) {
    this.connectionStatus = 'Invalid QR code';
    return;
  }

  const items = this.selectionService.items;
  if (!items.length) {
    this.connectionStatus = 'No files selected';
    return;
  }

  this.connectionStatus = 'Sending...';

  try {
    await this.fileShareService.startSendFiles(serviceId, items, (states, sent, total) => {
      this.transferStates = states;
      this.bytesSent = sent;
      this.totalBytes = total;
    });
    this.connectionStatus = 'Sent successfully';
    this.selectionService.clear();
  } catch (err) {
    console.error(err);
    this.connectionStatus = 'Transfer failed';
  }
}

formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

async ngOnDestroy() {
  this.listeners.forEach(l => l.remove());
  try { await NearbyMultipeer.stopDiscovery(); } catch {}
}

}