// Keeps a recognizer listening for the session (docs/timing-core-design.md,
// section 5). It reads recognizer events from the session record and says only
// when listening is ready and what the user should see; it makes no timing
// decisions, and every restart is visible in the record.
//
// Safari/WebKit: one continuous recognizer, restarted at once if it ends.
// Chrome: a new recognizer per card, started as soon as an answer is accepted.

import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';
import { computeRestartDelayMs } from '../voiceExperiments';
import type { SessionEvent } from './sessionRecord';

export const RETRY_DELAY_MS = 220;
export const LOST_SERVICE_RETRY_MS = 2000;
// How long a stopped recognizer gets to end before it is aborted, and how long
// an aborted one gets before the next is started anyway.
export const STOP_WAIT_MS = 150;

const MAX_ALTERNATIVES = 5;

export interface ListeningStatus {
  isListening: boolean;
  statusLabel: string | null;
  errorMessage: string;
}

export interface ListeningRecognizer {
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
}

interface ListeningControllerArgs {
  recognizer: ListeningRecognizer;
  continuous: boolean;
  /** Minimum gap between recognizers (`&delay=N`). */
  minGapMs: number;
  now: () => number;
  onListenerReady: () => void;
  onStatus: (status: ListeningStatus) => void;
}

const QUIET: ListeningStatus = {
  isListening: false,
  statusLabel: null,
  errorMessage: '',
};
const LOST_MESSAGE = 'Lost speech service';

const GIVE_UP_MESSAGES: Record<string, string> = {
  'not-allowed': 'Permission needed',
  'service-not-allowed': 'Voice unavailable',
  'language-not-supported': 'Language unsupported',
  'audio-capture': 'Mic unavailable',
};

export function createListeningController({
  recognizer,
  continuous,
  minGapMs,
  now,
  onListenerReady,
  onStatus,
}: ListeningControllerArgs) {
  let wanted = false;
  let running = false;
  let switching = false;
  let lost = false;
  let currentRecId: number | null = null;
  let lastEndT: number | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    if (restartTimer) clearTimeout(restartTimer);
    if (stopTimer) clearTimeout(stopTimer);
    restartTimer = null;
    stopTimer = null;
  }

  function giveUp(message: string) {
    wanted = false;
    switching = false;
    clearTimers();
    onStatus({ ...QUIET, statusLabel: message, errorMessage: message });
    onListenerReady();
  }

  function startRecognizer() {
    if (!wanted) {
      return;
    }
    clearTimers();
    running = true;
    try {
      recognizer.start({
        lang: 'en-US',
        interimResults: true,
        continuous,
        maxAlternatives: MAX_ALTERNATIVES,
        addsPunctuation: false,
      });
    } catch {
      running = false;
      giveUp('Unable to start voice input');
    }
  }

  function scheduleStart(baseDelayMs: number) {
    if (restartTimer) {
      return;
    }
    const delayMs = computeRestartDelayMs(
      baseDelayMs,
      minGapMs,
      lastEndT === null ? Infinity : now() - lastEndT
    );
    if (delayMs <= 0) {
      startRecognizer();
      return;
    }
    restartTimer = setTimeout(() => {
      restartTimer = null;
      startRecognizer();
    }, delayMs);
  }

  function handleError(code: string) {
    if (code === 'network') {
      lost = true;
      onStatus({ ...QUIET, statusLabel: LOST_MESSAGE, errorMessage: LOST_MESSAGE });
    } else if (code === 'no-speech' || code === 'speech-timeout') {
      onStatus({ ...QUIET, statusLabel: 'Retrying…' });
    } else if (GIVE_UP_MESSAGES[code]) {
      giveUp(GIVE_UP_MESSAGES[code]);
    }
  }

  function handleEnded(t: number) {
    running = false;
    lastEndT = t;
    if (!wanted) {
      return;
    }
    if (lost) {
      switching = false;
      clearTimers();
      scheduleStart(LOST_SERVICE_RETRY_MS);
    } else if (switching) {
      switching = false;
      clearTimers();
      scheduleStart(0);
    } else {
      scheduleStart(continuous ? 0 : RETRY_DELAY_MS);
    }
  }

  return {
    start() {
      wanted = true;
      lost = false;
      switching = false;
      lastEndT = null;
      startRecognizer();
    },

    // Called when an answer is accepted, so the next card has a recognizer
    // ready by the time it is drawn.
    readyForNextCard() {
      if (!wanted) {
        onListenerReady();
        return;
      }
      if (lost) {
        return;
      }
      if (!running) {
        scheduleStart(0);
        return;
      }
      switching = true;
      recognizer.stop();
      stopTimer = setTimeout(() => {
        recognizer.abort();
        stopTimer = setTimeout(() => {
          stopTimer = null;
          switching = false;
          startRecognizer();
        }, STOP_WAIT_MS);
      }, STOP_WAIT_MS);
    },

    handleEvent(event: SessionEvent) {
      switch (event.kind) {
        case 'rec.requested':
          currentRecId = event.recId;
          break;
        case 'rec.started':
          if (event.recId === currentRecId) {
            onStatus({ ...QUIET, isListening: true, statusLabel: 'Listening…' });
            onListenerReady();
          }
          break;
        case 'rec.ended':
          if (event.recId === currentRecId) {
            handleEnded(event.t);
          }
          break;
        case 'rec.error':
          if (event.recId === currentRecId) {
            handleError(event.code);
          }
          break;
        case 'rec.result':
          if (event.text.trim()) {
            lost = false;
          }
          break;
        default:
          break;
      }
    },

    stop() {
      const wasRunning = running;
      wanted = false;
      running = false;
      switching = false;
      clearTimers();
      onStatus(QUIET);
      if (wasRunning) {
        recognizer.abort();
      }
    },
  };
}
