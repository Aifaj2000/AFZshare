import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Camera } from '@capacitor/camera';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Router } from '@angular/router';

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
  IonSearchbar
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  searchOutline,
  folderOutline,
  imageOutline,
  videocamOutline,
  musicalNotesOutline,
  appsOutline
} from 'ionicons/icons';
import { ShareItem } from 'src/app/models/share-item.model';

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
    IonSearchbar
  ]
})
export class SelectItemsPage {


  categories: { id: Category; icon: string; label: string }[] = [
    { id: 'apps',   icon: 'apps',                  label: 'Apps' },
    { id: 'files',  icon: 'folder-outline',        label: 'Files' },
    { id: 'photos', icon: 'image-outline',         label: 'Photos' },
    { id: 'videos', icon: 'videocam-outline',      label: 'Videos' },
    { id: 'music',  icon: 'musical-notes-outline', label: 'Music' },
  ];

  selectedCategory: Category = 'apps';
  segment: 'installed' | 'packages' = 'installed';

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
      appsOutline
    });
  }

  ngOnInit() {
    this.loadItems();
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
    // Requires custom InstalledApps plugin — see InstalledAppsPlugin.kt below
    // const result = await InstalledApps.getApps({ includeSystemApps: this.segment === 'packages' });
    // return result.apps.map((a: any, i: number) => ({
    //   id: `app-${i}-${a.packageName}`,
    //   name: a.name,
    //   size: '—',
    //   sizeBytes: 0,
    //   icon: a.icon,
    //   selected: false,
    //   type: 'app',
    //   packageName: a.packageName,
    // }));
    return [];
  }

  private async loadPhotos(): Promise<ShareItem[]> {
    const result = await Camera.pickImages({
      quality: 90,
      limit: 0,
    });
    return result.photos.map((p, i) => ({
      id: `photo-${i}`,
      name: `Photo_${i + 1}`,
      size: '—',
      sizeBytes: 0,
      icon: p.webPath!,
      selected: true,
      type: 'photo' as const,
      path: p.path ?? p.webPath,
    }));
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
  const result = await FilePicker.pickFiles({
    limit: 0,
    types: ['video/*'],
  });
  return result.files.map((f, i) => ({
    id: `video-${i}-${f.name}`,
    name: f.name,
    size: this.formatSize(f.size ?? 0),
    sizeBytes: f.size ?? 0,
    icon: 'assets/icon/video-thumb.png',
    selected: true,
    type: 'video' as const,
    path: f.path,
  }));
}

private async loadMusic(): Promise<ShareItem[]> {
  const result = await FilePicker.pickFiles({
    limit: 0,
    types: ['audio/*'],
  });
  return result.files.map((f, i) => ({
    id: `music-${i}-${f.name}`,
    name: f.name,
    size: this.formatSize(f.size ?? 0),
    sizeBytes: f.size ?? 0,
    icon: 'assets/icon/music-note.png',
    selected: true,
    type: 'music' as const,
    path: f.path,
  }));
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