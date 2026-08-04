import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Camera } from '@capacitor/camera';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
type Category = 'apps' | 'files' | 'photos' | 'videos' | 'music';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
  IonSearchbar,
  IonFooter
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  searchOutline,
  folderOutline,
  imageOutline,
  videocamOutline,
  musicalNotesOutline,
  appsOutline,
  gridOutline,
  checkmark
} from 'ionicons/icons';
import { ShareItem } from 'src/app/models/share-item.model';
import { AppsListPlugin } from 'capacitor-apps-list';
import { AppSize } from 'src/app/plugins/app-size.plugin';
import { CapacitorMediaStore, MediaType } from '@odion-cloud/capacitor-mediastore';

interface AppItem {
  id: number;
  name: string;
  size: string;
  icon: string;
  selected: boolean;
}

@Component({
  selector: 'app-select-items',
  templateUrl: './select-items.page.html',
  styleUrls: ['./select-items.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSpinner,
    IonSearchbar,
    IonFooter
  ]
})
export class SelectItemsPage {


  categories: { id: Category; icon: string; label: string }[] = [
    { id: 'apps',   icon: 'grid-outline',                  label: 'Apps' },
    { id: 'files',  icon: 'folder-outline',        label: 'Files' },
    { id: 'photos', icon: 'image-outline',         label: 'Photos' },
    { id: 'videos', icon: 'videocam-outline',      label: 'Videos' },
    { id: 'music',  icon: 'musical-notes-outline', label: 'Music' },
  ];

  private readonly defaultIcons: Record<string, string> = {
  app: 'assets/icon/app-generic.webp',
  file: 'assets/icon/file-generic.webp',
  photo: 'assets/icon/image-generic.webp',
  video: 'assets/icon/video-thumb.webp',
  music: 'assets/icon/music-note.webp',
};

  selectedCategory: Category = 'apps';
  segment: 'installed' | 'packages' = 'installed';

  loadingProgress = { current: 0, total: 0 };

  items: ShareItem[] = [];
  filteredItems: ShareItem[] = [];
  searchTerm = '';
  isSearching = false;
  loading = false;

   constructor(private router: Router) {
    addIcons({
      searchOutline,
      folderOutline,
      imageOutline,
      videocamOutline,
      musicalNotesOutline,
      appsOutline,
      gridOutline,
      checkmark
    });
  }

  ngOnInit() {
    this.loadItems();
  }

  async addMore() {
  let newItems: ShareItem[] = [];

  switch (this.selectedCategory) {
    case 'photos':
      newItems = await this.loadPhotos();
      break;
    case 'videos':
      newItems = await this.loadVideos();
      break;
    case 'music':
      newItems = await this.loadMusic();
      break;
    case 'files':
      newItems = await this.loadFiles();
      break;
  }

  // merge without duplicating existing items, keep new ones selected
  const existingIds = new Set(this.items.map(i => i.id));
  const merged = newItems.filter(i => !existingIds.has(i.id));

  this.items = [...this.items, ...merged];
  this.applySearch();
}

  getIcon(item: ShareItem): string {
  return item.icon && item.icon.trim() !== '' ? item.icon : this.defaultIcons[item.type];
}

onImageError(event: Event, item: ShareItem) {
  const target = event.target as HTMLImageElement;
  target.src = this.defaultIcons[item.type];
}

  selectCategory(cat: Category) {
    if (this.selectedCategory === cat) return;
    this.selectedCategory = cat;
    this.searchTerm = '';
    this.loadItems();
  }

  onSegmentChange(ev: any) {
    this.segment = ev.detail.value;
    this.loadItems();
  }

  async loadItems() {
    this.loading = true;
    this.items = [];

    try {
      switch (this.selectedCategory) {
        case 'apps':
          this.items = await this.loadApps();
          break;
        case 'files':
          this.items = await this.loadFiles();
          break;
        case 'photos':
          this.items = await this.loadPhotos();
          break;
        case 'videos':
          this.items = await this.loadVideos();
          break;
        case 'music':
          this.items = await this.loadMusic();
          break;
      }
    } catch (err) {
      console.error('Failed to load items', err);
    } finally {
      this.applySearch();
      this.loading = false;
    }
  }


private async loadApps(): Promise<ShareItem[]> {
  const result = await AppsListPlugin.getAppsList();
  const rawApps = result.androidApps ?? [];

  this.loadingProgress = { current: 0, total: rawApps.length };

  const apps = await Promise.all(
    rawApps.map(async (a: any, i: number) => {
      let sizeBytes = 0;
      let isSystemApp = false;
      let hasLauncherIcon = true; // safe default if native call fails or field missing

      try {
        const sizeResult = await AppSize.getAppSize({ packageName: a.packageName });
        console.log('RAW:', a.packageName, JSON.stringify(sizeResult)); // TEMP: remove after confirming
        sizeBytes = sizeResult.sizeBytes ?? 0;
        isSystemApp = sizeResult.isSystemApp ?? false;
        hasLauncherIcon = sizeResult.hasLauncherIcon ?? true;
      } catch (err) {
        console.warn(`Could not get details for ${a.packageName}`, err);
      } finally {
        this.loadingProgress.current++;
      }

      return {
        id: `app-${i}-${a.packageName}`,
        name: a.appName,
        size: this.formatSize(sizeBytes),
        sizeBytes,
        icon: `data:image/png;base64,${a.base64Icon}`,
        selected: false,
        type: 'app' as const,
        packageName: a.packageName,
        category: this.categoryLabel(a.category),
        isSystemApp,
        hasLauncherIcon,
      };
    })
  );

  // "Installed" = apps the user installed themselves (can be uninstalled)
  // "Packages"  = preinstalled system apps (Google Play Services, Maps, Settings, etc. — cannot be uninstalled)
  console.log('Filtering apps for segment:', this.segment);
  if (this.segment === 'installed') {
    return apps.filter(app => !app.isSystemApp);
  } else {
    return apps.filter(app => app.isSystemApp);
  }
}


private categoryLabel(category: number): string {
  const map: Record<number, string> = {
    [-1]: 'Other', 0: 'Game', 1: 'Audio', 2: 'Video',
    3: 'Image', 4: 'Social', 5: 'News', 6: 'Maps',
    7: 'Productivity', 8: 'Accessibility',
  };
  return map[category] ?? 'Other';
}

  private async loadPhotos(): Promise<ShareItem[]> {
  const result = await Camera.pickImages({
    quality: 90,
    limit: 0,
  });

  const photos: ShareItem[] = await Promise.all(
    result.photos.map(async (p, i) => {
      let sizeBytes = 0;
      try {
        const response = await fetch(p.webPath!);
        const blob = await response.blob();
        sizeBytes = blob.size;
      } catch (err) {
        console.warn(`Could not get size for photo ${i}`, err);
      }

      return {
        id: `photo-${i}`,
        name: `Photo_${i + 1}`,
        size: this.formatSize(sizeBytes),
        sizeBytes,
        icon: p.webPath!,
        selected: true,
        type: 'photo' as const,
        path: p.path ?? p.webPath,
      };
    })
  );

  return photos;
}

  private async loadFiles(): Promise<ShareItem[]> {
  const result = await FilePicker.pickFiles({
    limit: 0, // 0 = unlimited
    readData: false,
  });
  return result.files.map((f, i) => ({
    id: `file-${i}-${f.name}`,
    name: f.name,
    size: this.formatSize(f.size ?? 0),
    sizeBytes: f.size ?? 0,
    icon: 'assets/icon/file-generic.png',
    selected: true,
    type: 'file' as const,
    path: f.path, // no webPath on FilePicker's File type
  }));
}


private async loadVideos(): Promise<ShareItem[]> {
  try {
    await CapacitorMediaStore.requestPermissions({ types: ['video'] });

    const result = await CapacitorMediaStore.getMediasByType({
      mediaType: MediaType.VIDEO,
      includeExternal: true,
    });

    return (result.media ?? []).map((m, i) => ({
      id: `video-${i}-${m.id}`,
      name: m.displayName ?? `Video_${i + 1}`,
      size: this.formatSize(m.size ?? 0),
      sizeBytes: m.size ?? 0,
      icon: m.uri, // no separate thumbnailUri in this plugin — using file uri directly
      selected: false,
      type: 'video' as const,
      path: m.uri,
    }));
  } catch (err) {
    console.error('Failed to load videos', err);
    return [];
  }
}

private async loadMusic(): Promise<ShareItem[]> {
  try {
    await CapacitorMediaStore.requestPermissions({ types: ['audio'] });

    const result = await CapacitorMediaStore.getMediasByType({
      mediaType: MediaType.AUDIO,
      sortBy: 'TITLE',
      includeExternal: true,
    });

    return (result.media ?? []).map((m, i) => ({
      id: `music-${i}-${m.id}`,
      name: m.title ?? m.displayName ?? `Track_${i + 1}`,
      size: this.formatSize(m.size ?? 0),
      sizeBytes: m.size ?? 0,
      icon: m.albumArtUri ?? 'assets/icon/music-note.png',
      selected: false,
      type: 'music' as const,
      path: m.uri,
    }));
  } catch (err) {
    console.error('Failed to load music', err);
    return [];
  }
}


  toggleApp(item: ShareItem) {
    item.selected = !item.selected;
  }

  get selectedItems(): ShareItem[] {
    return this.items.filter(i => i.selected);
  }

  get selectedCount(): number {
    return this.selectedItems.length;
  }

  get selectedSizeLabel(): string {
    const totalBytes = this.selectedItems.reduce((sum, i) => sum + (i.sizeBytes || 0), 0);
    return this.formatSize(totalBytes);
  }

  toggleSearch() {
    this.isSearching = !this.isSearching;
    if (!this.isSearching) {
      this.searchTerm = '';
      this.applySearch();
    }
  }

  onSearchInput(ev: any) {
    this.searchTerm = ev.detail.value ?? '';
    this.applySearch();
  }

  private applySearch() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = term
      ? this.items.filter(i => i.name.toLowerCase().includes(term))
      : this.items;
  }

  sendFile() {
    if (this.selectedCount === 0) return;
    this.router.navigate(['/tabs/send'], {
      state: { items: this.selectedItems },
    });
  }

  private formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

}