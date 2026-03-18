import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { appConfig } from './appConfig';
import { TelemetryPayload } from './sessionTelemetry';

interface QueuedTelemetryEntry {
    id: string;
    payload: TelemetryPayload;
    createdAtIso: string;
    failureCount: number;
}

export interface CloudSyncResult {
    status: 'sent' | 'queued' | 'disabled';
    queuedCount: number;
}

function createQueueEntry(payload: TelemetryPayload): QueuedTelemetryEntry {
    return {
        id: `telemetry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        payload,
        createdAtIso: new Date().toISOString(),
        failureCount: 0,
    };
}

async function readQueue(): Promise<QueuedTelemetryEntry[]> {
    try {
        const rawValue = await AsyncStorage.getItem(appConfig.telemetryQueueKey);
        if (!rawValue) {
            return [];
        }

        const parsedValue = JSON.parse(rawValue);
        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
        return [];
    }
}

async function writeQueue(queue: QueuedTelemetryEntry[]): Promise<void> {
    if (queue.length === 0) {
        await AsyncStorage.removeItem(appConfig.telemetryQueueKey);
        return;
    }

    await AsyncStorage.setItem(appConfig.telemetryQueueKey, JSON.stringify(queue));
}

async function postPayload(payload: TelemetryPayload): Promise<void> {
    const url = appConfig.cloudSyncUrl;
    if (!url) {
        throw new Error('Cloud sync URL is not configured');
    }

    const response = await fetch(url, {
        method: 'POST',
        ...(Platform.OS === 'web' ? { mode: 'no-cors' as const } : null),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ payload: JSON.stringify(payload) }).toString(),
    });

    if (Platform.OS !== 'web' && !response.ok) {
        throw new Error(`Cloud sync failed with status ${response.status}`);
    }
}

function incrementFailureCount(queue: QueuedTelemetryEntry[]): QueuedTelemetryEntry[] {
    return queue.map(entry => ({
        ...entry,
        failureCount: entry.failureCount + 1,
    }));
}

export async function saveLogToCloud(
    payload: TelemetryPayload
): Promise<CloudSyncResult> {
    if (!appConfig.cloudSyncUrl) {
        return { status: 'disabled', queuedCount: 0 };
    }

    const queuedEntries = await readQueue();
    const pendingEntries = [...queuedEntries, createQueueEntry(payload)];

    try {
        for (const entry of pendingEntries) {
            await postPayload(entry.payload);
        }

        await writeQueue([]);
        return { status: 'sent', queuedCount: 0 };
    } catch (error) {
        const remainingEntries = incrementFailureCount(pendingEntries);
        await writeQueue(remainingEntries);
        console.error('Cloud sync queued after failure:', error);
        return {
            status: 'queued',
            queuedCount: remainingEntries.length,
        };
    }
}
