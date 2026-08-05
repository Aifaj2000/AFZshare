import { Injectable } from '@angular/core';
import { ShareItem } from '../models/share-item.model';

@Injectable({ providedIn: 'root' })
export class SelectionService {

  private selectionStore = new Map<string, ShareItem>();

  toggle(item: ShareItem) {
    item.selected = !item.selected;
    if (item.selected) {
      this.selectionStore.set(item.id, item);
    } else {
      this.selectionStore.delete(item.id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectionStore.has(id);
  }

  restore(item: ShareItem) {
    if (this.selectionStore.has(item.id)) {
      item.selected = true;
      this.selectionStore.set(item.id, item);
    } else if (item.selected) {
      this.selectionStore.set(item.id, item);
    }
  }

  get items(): ShareItem[] {
    return Array.from(this.selectionStore.values());
  }

  get count(): number {
    return this.selectionStore.size;
  }

  get totalSizeBytes(): number {
    return this.items.reduce((sum, i) => sum + (i.sizeBytes || 0), 0);
  }

  clear() {
    this.selectionStore.clear();
  }

  removeItem(id: string) {
    this.selectionStore.delete(id);
  }
}