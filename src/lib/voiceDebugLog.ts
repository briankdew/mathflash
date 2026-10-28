import { describeVoiceExperiments, getWebQueryParams } from './voiceExperiments';

export interface VoiceDebugEntry {
  id: number;
  atMs: number;
  label: string;
  detail: string;
  count: number;
}

const MAX_ENTRIES = 3000;

let entries: VoiceDebugEntry[] = [];
let nextId = 1;
let startedAtMs: number | null = null;
let startedAtIso: string | null = null;
const listeners = new Set<() => void>();

export function isVoiceDebugEnabled(): boolean {
  return getWebQueryParams()?.get('debug') === '1';
}

function notify() {
  listeners.forEach(listener => listener());
}

// Records one event. An event identical to the previous one (same label and
// detail) is folded into it as a repeat count, so a burst of duplicate browser
// events shows up as "end x9" instead of nine lines.
export function logVoiceDebug(label: string, detail = ''): void {
  if (!isVoiceDebugEnabled()) {
    return;
  }

  const now = Date.now();
  if (startedAtMs === null) {
    startedAtMs = now;
    startedAtIso = new Date(now).toISOString();
  }

  const last = entries[entries.length - 1];
  if (last && last.label === label && last.detail === detail) {
    entries = [...entries.slice(0, -1), { ...last, count: last.count + 1 }];
  } else {
    entries = [
      ...entries.slice(-(MAX_ENTRIES - 1)),
      { id: nextId++, atMs: now - startedAtMs, label, detail, count: 1 },
    ];
  }
  notify();
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
  startedAtIso = null;
  notify();
}

export function formatVoiceDebugEntry(entry: VoiceDebugEntry): string {
  const seconds = (entry.atMs / 1000).toFixed(1).padStart(6, ' ');
  const repeat = entry.count > 1 ? ` x${entry.count}` : '';
  const detail = entry.detail ? ` ${entry.detail}` : '';
  return `${seconds}s ${entry.label}${detail}${repeat}`;
}

function describeEnvironment(): string[] {
  const win = globalThis.window as
    | (Window & { webkitSpeechRecognition?: unknown })
    | undefined;
  if (!win) {
    return [];
  }

  const bundle = Array.from(win.document?.scripts ?? [])
    .map(script => script.src)
    .find(src => src.includes('/_expo/static/js/web/index-'));

  return [
    `url: ${win.location?.href ?? ''}`,
    `build: ${bundle?.split('/').pop() ?? 'unknown'}`,
    `userAgent: ${win.navigator?.userAgent ?? ''}`,
    `screen: ${win.innerWidth}x${win.innerHeight} @${win.devicePixelRatio}x`,
    `secureContext: ${win.isSecureContext}`,
    `webkitSpeechRecognition: ${typeof win.webkitSpeechRecognition !== 'undefined'}`,
  ];
}

// The full text saved by the debug panel's Share / Copy buttons.
export function buildVoiceDebugReport(): string {
  const header = [
    'mathflash voice debug log',
    `started: ${startedAtIso ?? 'no events yet'}`,
    ...describeEnvironment(),
    `experiments: ${describeVoiceExperiments()}`,
    `events: ${entries.length}`,
    '',
  ];
  return [...header, ...entries.map(formatVoiceDebugEntry), ''].join('\n');
}

export function buildVoiceDebugFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `mathflash-voice-log-${date}-${time}.txt`;
}
