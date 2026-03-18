const DEFAULT_CLOUD_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbxwUWpSyAiioDtMZ-p4_YbvO7k3HDBajJ2LNX-SPS--ngNY1JbQidw3IXMx2Ta868ya-g/exec';

export const appConfig = {
  cloudSyncUrl:
    process.env.EXPO_PUBLIC_CLOUD_SYNC_URL?.trim() || DEFAULT_CLOUD_SYNC_URL,
  telemetryQueueKey: 'mathflash:telemetry-queue',
} as const;
