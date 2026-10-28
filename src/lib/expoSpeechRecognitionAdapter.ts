import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionOptions,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { isVoiceDebugEnabled, logVoiceDebug } from './voiceDebugLog';

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
  addListener: <TEventName extends SpeechRecognitionEventName>(
    eventName: TEventName,
    listener: SpeechRecognitionListenerMap[TEventName]
  ) => { remove: () => void };
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

export const expoSpeechRecognitionAdapter: SpeechRecognitionAdapter = {
  isRecognitionAvailable: () =>
    ExpoSpeechRecognitionModule.isRecognitionAvailable(),
  supportsOnDeviceRecognition: () =>
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  getPermissionsAsync: ExpoSpeechRecognitionModule.getPermissionsAsync,
  requestPermissionsAsync: ExpoSpeechRecognitionModule.requestPermissionsAsync,
  start: options => {
    logVoiceDebug('start()');
    ExpoSpeechRecognitionModule.start(options);
  },
  stop: () => {
    logVoiceDebug('stop()');
    ExpoSpeechRecognitionModule.stop();
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
  const subscription = ExpoSpeechRecognitionModule.addListener(
    eventName as never,
    ((...args: unknown[]) => {
      if (active) {
        handler(args);
      }
    }) as never
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
