import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AppsListPlugin } from 'capacitor-apps-list';
import { ShareItem } from '../models/share-item.model';

@Injectable({ providedIn: 'root' })
export class AppsService {

  private cache: ShareItem[] | null = null;

  async loadApps(forceRefresh = false): Promise<ShareItem[]> {
    if (Capacitor.getPlatform() !== 'android') {
      console.warn('Installed apps listing is only supported on Android.');
      return [];
    }

    if (this.cache && !forceRefresh) {
      return this.cache;
    }

    try {
      const result = await AppsListPlugin.getAppsList();

      const apps: ShareItem[] = (result.androidApps ?? []).map((a: any, i: number) => ({
        id: `app-${i}-${a.packageName}`,
        name: a.appName,
        size: '—',
        sizeBytes: 0,
        icon: `data:image/png;base64,${a.base64Icon}`,
        selected: false,
        type: 'app' as const,
        packageName: a.packageName,
        category: this.categoryLabel(a.category),
      }));

      apps.sort((x, y) => x.name.localeCompare(y.name));

      this.cache = apps;
      return apps;
    } catch (err) {
      console.error('Failed to load installed apps:', err);
      return [];
    }
  }

  clearCache(): void {
    this.cache = null;
  }

  private categoryLabel(category: number): string {
    const map: Record<number, string> = {
      [-1]: 'Other',
      0: 'Game',
      1: 'Audio',
      2: 'Video',
      3: 'Image',
      4: 'Social',
      5: 'News',
      6: 'Maps',
      7: 'Productivity',
      8: 'Accessibility',
    };
    return map[category] ?? 'Other';
  }
}