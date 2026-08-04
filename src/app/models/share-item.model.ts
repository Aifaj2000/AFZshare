export interface ShareItem {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  icon: string;
  selected: boolean;
  type: 'app' | 'file' | 'photo' | 'video' | 'music';
  packageName?: string;
  category?: string;
  path?: string;
  isSystemApp?: boolean;
  hasLauncherIcon?: boolean;
}