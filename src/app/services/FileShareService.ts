import { Injectable } from '@angular/core';
import { P2pConnect, ResourceDescriptor } from '@enertrag/p2pconnect';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ShareItem } from '../models/share-item.model';

 export type TransferStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface TransferItemState {
  item: ShareItem;
  status: TransferStatus;
}

@Injectable({ providedIn: 'root' })
export class FileShareService {

  /** Generates a short id valid for the plugin's serviceId rules (1-15 chars, a-z0-9-) */
  generateServiceId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'afz-';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // ---------- RECEIVER SIDE ----------

  async startReceiving(
    serviceId: string,
    onFileReceived: (localPath: string) => void
  ) {
    P2pConnect.addListener('acceptTransfer', (request) => {
      // Auto-accept; swap for a confirm dialog if you want the user to approve
      P2pConnect.acceptTransfer({ transferId: request.transferId, accept: true });
    });

    P2pConnect.addListener('transferComplete', async (result) => {
      for (const resource of result.resources) {
        const targetPath = `received/${resource.id}`;
        await Filesystem.rename({
          from: resource.uri,
          toDirectory: Directory.Documents,
          to: targetPath,
        });
        onFileReceived(targetPath);
      }
    });

    return P2pConnect.startReceive({ serviceId });
  }

  async stopReceiving() {
    await P2pConnect.removeAllListeners();
    return P2pConnect.stopReceive();
  }

  // ---------- SENDER SIDE ----------

  async sendFile(serviceId: string, fileUri: string, fileName: string) {
    const resource: ResourceDescriptor = { id: fileName, uri: fileUri };
    const transferId = `share-${Date.now()}`;

    const result = await P2pConnect.send({
      serviceId,
      transferId,
      resources: [resource],
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Transfer failed');
    }
    return result;
  }

 

async startSendFiles(
  serviceId: string,
  items: ShareItem[],
  onUpdate: (states: TransferItemState[], bytesSent: number, totalBytes: number) => void
) {
  const shareable = items.filter(i => !!i.path);
  const totalBytes = shareable.reduce((sum, i) => sum + (i.sizeBytes || 0), 0);

  const states: TransferItemState[] = shareable.map(item => ({ item, status: 'pending' }));
  let bytesSent = 0;

  onUpdate([...states], bytesSent, totalBytes);

  for (let i = 0; i < shareable.length; i++) {
    const item = shareable[i];
    states[i] = { item, status: 'sending' };
    onUpdate([...states], bytesSent, totalBytes);

    const resource: ResourceDescriptor = { id: item.name, uri: item.path! };
    const transferId = `share-${Date.now()}-${i}`;

    try {
      const result = await P2pConnect.send({ serviceId, transferId, resources: [resource] });
      if (!result.success) throw new Error(result.error ?? 'unknown error');

      states[i] = { item, status: 'sent' };
      bytesSent += item.sizeBytes || 0;
      onUpdate([...states], bytesSent, totalBytes);
    } catch (err) {
      states[i] = { item, status: 'failed' };
      onUpdate([...states], bytesSent, totalBytes);
      throw new Error(`Failed on "${item.name}": ${err}`);
    }
  }
}

 

  async isAvailable(): Promise<boolean> {
    const { available } = await P2pConnect.isAvailable();
    return available;
  }
}