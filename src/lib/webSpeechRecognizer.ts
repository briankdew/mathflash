import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';
import { logVoiceDebug } from './voiceDebugLog';

// A small web-only stand-in for the library's recognizer, used by the ?reuse=1
// experiment. The library creates a brand-new browser recognizer on every
// start(); this keeps one object for the whole session and calls start() on it
// again, which iPhone Safari may handle better. Events are delivered in the same
// shape the library uses, so the voice hook cannot tell the difference.

type Listener = (payload?: unknown) => void;

interface BrowserAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<BrowserAlternative> & { isFinal: boolean }>;
}

interface BrowserRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  addEventListener: (name: string, handler: (event: never) => void) => void;
}

type BrowserRecognitionConstructor = new () => BrowserRecognition;

const EVENT_NAMES = [
  'start',
  'end',
  'speechstart',
  'speechend',
  'result',
  'error',
  'nomatch',
  'audiostart',
  'audioend',
  'soundstart',
  'soundend',
] as const;

const listeners = new Map<string, Set<Listener>>();
let recognition: BrowserRecognition | null = null;
let isRunning = false;
let pendingStart: ExpoSpeechRecognitionOptions | null = null;

function emit(eventName: string, payload?: unknown) {
  listeners.get(eventName)?.forEach(listener => listener(payload));
}

// Same payload shapes as the library's web module.
function toResultPayload(event: BrowserResultEvent) {
  const latest = event.results[event.resultIndex];
  if (latest?.isFinal) {
    return {
      isFinal: true,
      results: Array.from(latest).map(alternative => ({
        transcript: alternative.transcript,
        confidence: alternative.confidence,
        segments: [],
      })),
    };
  }

  let transcript = '';
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    transcript += event.results[i]?.[0]?.transcript ?? '';
  }
  return {
    isFinal: false,
    results: [{ transcript, confidence: 0, segments: [] }],
  };
}

function toPayload(eventName: string, event: unknown) {
  switch (eventName) {
    case 'result':
      return toResultPayload(event as BrowserResultEvent);
    case 'error': {
      const errorEvent = event as { error?: string; message?: string };
      return { error: errorEvent.error, message: errorEvent.message };
    }
    case 'audiostart':
    case 'audioend':
      return { uri: null };
    default:
      return null;
  }
}

function applyOptions(
  target: BrowserRecognition,
  options: ExpoSpeechRecognitionOptions
) {
  target.lang = options.lang ?? 'en-US';
  target.interimResults = options.interimResults ?? false;
  target.maxAlternatives = options.maxAlternatives ?? 1;
  target.continuous = options.continuous ?? false;
}

function getRecognition(): BrowserRecognition {
  if (recognition) {
    return recognition;
  }

  const win = globalThis.window as unknown as {
    webkitSpeechRecognition?: BrowserRecognitionConstructor;
    SpeechRecognition?: BrowserRecognitionConstructor;
  };
  const Recognition = win.webkitSpeechRecognition ?? win.SpeechRecognition;
  if (!Recognition) {
    throw new Error('Speech recognition is not available in this browser');
  }

  const created = new Recognition();
  EVENT_NAMES.forEach(eventName => {
    created.addEventListener(eventName, ((event: unknown) => {
      if (eventName === 'start') {
        isRunning = true;
      }
      if (eventName === 'end') {
        isRunning = false;
      }

      emit(eventName, toPayload(eventName, event));

      // A start() that arrived while the previous run was still ending.
      if (eventName === 'end' && pendingStart) {
        const options = pendingStart;
        pendingStart = null;
        webSpeechRecognizer.start(options);
      }
    }) as (event: never) => void);
  });

  recognition = created;
  return created;
}

export const webSpeechRecognizer = {
  start(options: ExpoSpeechRecognitionOptions) {
    const current = getRecognition();
    applyOptions(current, options);

    try {
      current.start();
    } catch (error) {
      // "already started": abort it and start again once it reports `end`.
      logVoiceDebug('start() threw', String((error as Error)?.message ?? error));
      pendingStart = options;
      current.abort();
    }
  },

  stop() {
    recognition?.stop();
  },

  abort() {
    recognition?.abort();
  },

  addListener(eventName: string, listener: Listener) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName)?.add(listener);

    return {
      remove: () => {
        listeners.get(eventName)?.delete(listener);
      },
    };
  },

  isRunning: () => isRunning,
};

// Test helper: forget the singleton so each test starts fresh.
export function resetWebSpeechRecognizerForTests() {
  listeners.clear();
  recognition = null;
  isRunning = false;
  pendingStart = null;
}
