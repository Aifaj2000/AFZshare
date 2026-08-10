// src/app/services/nearby-native.ts
import { NearbyMultipeer } from '@squareetlabs/capacitor-nearby-multipeer';

export function sendFileNative(endpointId: string, filePath: string, fileName: string): Promise<void> {
  return (NearbyMultipeer as any).sendFile({ endpointId, filePath, fileName });
}