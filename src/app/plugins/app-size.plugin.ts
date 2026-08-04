import { registerPlugin } from '@capacitor/core';

export interface AppSizePlugin {
  getAppSize(options: { packageName: string }): Promise<{
    packageName: string;
    sizeBytes: number;
    isSystemApp: boolean;
    hasLauncherIcon: boolean;
  }>;
}

export const AppSize = registerPlugin<AppSizePlugin>('AppSize');