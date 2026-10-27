import { Platform } from 'react-native';

export interface VoiceDebugEntry {
  id: number;
  atMs: number;
  label: string;
  detail: string;
}

const MAX_ENTRIES = 14;

let entries: VoiceDebugEntry[] = [];
let nextId = 1;
let startedAtMs: number | null = null;
const listeners = new Set<() => void>();

export function isVoiceDebugEnabled(): boolean {
  if (Platform.OS !== 'web') {
    return false;
  }

  try {
    const search = globalThis.window?.location?.search ?? '';
    return new URLSearchParams(search).get('debug') === '1';
  } catch {
    return false;
  }
}

export function logVoiceDebug(label: string, detail = ''): void {
  if (!isVoiceDebugEnabled()) {
    return;
  }

  const now = Date.now();
  startedAtMs = startedAtMs ?? now;

  entries = [
    ...entries.slice(-(MAX_ENTRIES - 1)),
    { id: nextId++, atMs: now - startedAtMs, label, detail },
  ];
  listeners.forEach(listener => listener());
}

export function getVoiceDebugEntries(): VoiceDebugEntry[] {
  return entries;
}

export function subscribeVoiceDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetVoiceDebugLog(): void {
  entries = [];
  nextId = 1;
  startedAtMs = null;
  listeners.forEach(listener => listener());
}

export function formatVoiceDebugEntry(entry: VoiceDebugEntry): string {
  const seconds = (entry.atMs / 1000).toFixed(1).padStart(5, ' ');
  return entry.detail
    ? `${seconds}s ${entry.label} ${entry.detail}`
    : `${seconds}s ${entry.label}`;
}
