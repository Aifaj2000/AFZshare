import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface TransferHistoryItem {
  id: string;
  name: string;
  sizeBytes: number;
  direction: 'sent' | 'received';
  deviceName: string;
  date: number;
  status: 'completed' | 'failed';
  filePath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransferHistoryService {

  private readonly STORAGE_KEY = 'afzshare_transfer_history';

  history = signal<TransferHistoryItem[]>([]);

  constructor() {
    this.loadHistory();
  }


  async loadHistory() {

    try {

      const result = await Preferences.get({
        key: this.STORAGE_KEY
      });

      if (!result.value) {
        this.history.set([]);
        return;
      }

      const data = JSON.parse(result.value);

      if (Array.isArray(data)) {
        this.history.set(data);
      } else {
        this.history.set([]);
      }

    } catch (error) {

      console.error(
        'Failed to load transfer history:',
        error
      );

      this.history.set([]);
    }
  }


  async addHistory(
    item: Omit<TransferHistoryItem, 'id'>
  ) {

    const newItem: TransferHistoryItem = {

      id:
        Date.now().toString() +
        Math.random().toString(36).substring(2, 8),

      ...item
    };


    const updated = [
      newItem,
      ...this.history()
    ];


    this.history.set(updated);


    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(updated)
    });


    console.log(
      'HISTORY SAVED:',
      JSON.stringify(newItem)
    );
  }


  async clearHistory() {

    this.history.set([]);

    await Preferences.remove({
      key: this.STORAGE_KEY
    });
  }


  getSent() {

    return this.history().filter(
      item => item.direction === 'sent'
    );

  }


  getReceived() {

    return this.history().filter(
      item => item.direction === 'received'
    );

  }

}