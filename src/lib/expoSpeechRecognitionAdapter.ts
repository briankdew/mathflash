import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionOptions,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { isVoiceDebugEnabled, logVoiceDebug } from './voiceDebugLog';
import { getVoiceExperiments } from './voiceExperiments';
import { recordingWebRecognizer } from './recordingWebRecognizer';
import { webSpeechRecognizer } from './webSpeechRecognizer';

export type SpeechRecognitionEventName =
  | 'start'
  | 'end'
  | 'speechstart'
  | 'speechend'
  | 'result'
  | 'error'
  | 'nomatch';

type SpeechRecognitionListenerMap = {
  start: () => void;
  end: () => void;
  speechstart: () => void;
  speechend: () => void;
  result: (event: ExpoSpeechRecognitionResultEvent) => void;
  error: (event: ExpoSpeechRecognitionErrorEvent) => void;
  nomatch: () => void;
};

export interface SpeechRecognitionAdapter {
  isRecognitionAvailable: () => boolean;
  supportsOnDeviceRecognition: () => boolean;
  getPermissionsAsync: typeof ExpoSpeechRecognitionModule.getPermissionsAsync;
  requestPermissionsAsync: typeof ExpoSpeechRecognitionModule.requestPermissionsAsync;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  // Lets go of a microphone held for the session (web only).
  releaseMic?: () => void;
  addListener: <TEventName extends SpeechRecognitionEventName>(
    eventName: TEventName,
    listener: SpeechRecognitionListenerMap[TEventName]
  ) => { remove: () => void };
}

// The pieces of a recognizer the adapter drives: the library's module, or the
// reusable web recognizer used by the ?reuse=1 experiment.
interface SpeechBackend {
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    eventName: string,
    listener: (...args: unknown[]) => void
  ) => { remove: () => void };
}

const ABORT_WAIT_MS = 800;

function getBackend(): SpeechBackend {
  const experiments = getVoiceExperiments();
  if (Platform.OS === 'web' && experiments.customRecognizer) {
    return recordingWebRecognizer as unknown as SpeechBackend;
  }
  return experiments.reuseRecognizer
    ? (webSpeechRecognizer as unknown as SpeechBackend)
    : (ExpoSpeechRecognitionModule as unknown as SpeechBackend);
}

// Debug-only (?debug=1) summary of an event payload; see voiceDebugLog.ts.
function describeEvent(eventName: SpeechRecognitionEventName, payload: unknown) {
  if (eventName === 'error') {
    const event = payload as ExpoSpeechRecognitionErrorEvent | null;
    return `${event?.error ?? '?'} ${event?.message ?? ''}`.trim();
  }
  if (eventName === 'result') {
    const event = payload as ExpoSpeechRecognitionResultEvent | null;
    const transcript = event?.results?.[0]?.transcript ?? '';
    return `${event?.isFinal ? 'final' : 'interim'} "${transcript}"`;
  }
  return '';
}

// Tracks whether a recognizer is running, for the ?abort=1 experiment.
let isRunning = false;
let isTrackingRunState = false;
const endWaiters = new Set<() => void>();

function trackRunState() {
  if (isTrackingRunState) {
    return;
  }
  isTrackingRunState = true;
  addGuardedListener('start', () => {
    isRunning = true;
  });
  addGuardedListener('end', () => {
    isRunning = false;
    endWaiters.forEach(waiter => waiter());
  });
}

function whenEnded(maxWaitMs: number, callback: () => void) {
  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    clearTimeout(timeout);
    endWaiters.delete(finish);
    callback();
  };
  const timeout = setTimeout(() => {
    logVoiceDebug('abort wait timed out');
    finish();
  }, maxWaitMs);
  endWaiters.add(finish);
}

// iPhone Safari seems to close the microphone when a
// recognition ends, so the next one starts on a dead source. Holding our own
// microphone stream open for the whole session may keep it alive.
let heldMic: MediaStream | null = null;

function shouldHoldMic() {
  return Platform.OS === 'web' && getVoiceExperiments().keepMic;
}

async function holdMic() {
  if (heldMic?.getAudioTracks().some(track => track.readyState === 'live')) {
    return;
  }

  try {
    const stream = await globalThis.navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    heldMic = stream;
    logVoiceDebug('mic held');
    stream.getAudioTracks().forEach(track =>
      track.addEventListener('ended', () => logVoiceDebug('held mic ended'))
    );
  } catch (error) {
    logVoiceDebug('mic hold failed', String((error as Error)?.message ?? error));
  }
}

function releaseHeldMic() {
  if (!heldMic) {
    return;
  }
  heldMic.getTracks().forEach(track => track.stop());
  heldMic = null;
  logVoiceDebug('mic released');
}

export const expoSpeechRecognitionAdapter: SpeechRecognitionAdapter = {
  isRecognitionAvailable: () =>
    ExpoSpeechRecognitionModule.isRecognitionAvailable(),
  supportsOnDeviceRecognition: () =>
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  getPermissionsAsync: ExpoSpeechRecognitionModule.getPermissionsAsync,
  requestPermissionsAsync: async () => {
    if (shouldHoldMic()) {
      await holdMic();
    }
    return ExpoSpeechRecognitionModule.requestPermissionsAsync();
  },
  releaseMic: () => {
    if (shouldHoldMic()) {
      releaseHeldMic();
    }
  },
  start: options => {
    logVoiceDebug('start()');
    const backend = getBackend();

    if (getVoiceExperiments().abortBeforeRestart) {
      trackRunState();
      if (isRunning) {
        logVoiceDebug('abort() before start');
        backend.abort();
        whenEnded(ABORT_WAIT_MS, () => backend.start(options));
        return;
      }
    }

    backend.start(options);
  },
  stop: () => {
    if (getVoiceExperiments().abortBeforeRestart) {
      logVoiceDebug('abort()');
      getBackend().abort();
      return;
    }
    logVoiceDebug('stop()');
    getBackend().stop();
  },
  addListener: (eventName, listener) => {
    return addGuardedListener(eventName, args => {
      logVoiceDebug(eventName, describeEvent(eventName, args[0]));
      (listener as (...listenerArgs: unknown[]) => void)(...args);
    });
  },
};

// On web, the library's subscription.remove() forgets a listener but never
// detaches it from the live browser recognizer, so a "removed" listener keeps
// firing and every event ends up handled several times. This guard makes a
// removed listener inert no matter what the library does.
function addGuardedListener(
  eventName: string,
  handler: (args: unknown[]) => void
): { remove: () => void } {
  let active = true;
  const subscription = getBackend().addListener(
    eventName,
    (...args: unknown[]) => {
      if (active) {
        handler(args);
      }
    }
  );

  return {
    remove: () => {
      active = false;
      subscription.remove();
    },
  };
}

// Debug-only (?debug=1): also log the browser's audio-level events, which show
// whether audio ever reaches the recognizer. Returns a cleanup function.
export function attachVoiceDebugAudioLogging(): () => void {
  if (!isVoiceDebugEnabled()) {
    return () => undefined;
  }

  const subscriptions = (
    ['audiostart', 'audioend', 'soundstart', 'soundend'] as const
  ).map(eventName =>
    addGuardedListener(eventName, () => logVoiceDebug(eventName))
  );

  return () => subscriptions.forEach(subscription => subscription.remove());
}
