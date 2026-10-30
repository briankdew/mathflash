import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';
import { sessionRecorder as defaultRecorder } from './timing/sessionRecorder';
import type { SessionRecorder } from './timing/sessionRecorder';
import type { SessionEvent } from './timing/sessionRecord';
import {
  applyOptions,
  BrowserRecognition,
  BrowserResultEvent,
  EVENT_NAMES,
  newBrowserRecognition,
  toPayload,
  toResultPayload,
} from './webSpeechRecognizer';

// Our own web recognizer (switch ?debug=1&custrec=1; docs/timing-core-design.md,
// section 6). Like the library it makes a new browser recognizer for every
// start(), but each one gets a recId and every browser event is written to the
// session record with the browser's own timestamp. Events reach the voice hook
// in the library's payload shapes, so the hook cannot tell the difference. When
// a recognizer ends, its browser listeners are really removed. The new session
// flow (?core=2) reads the recorded events instead, through subscribe().

type Listener = (payload?: unknown) => void;
type Handler = (event: never) => void;
type RecordListener = (event: SessionEvent) => void;

interface Active {
  recId: number;
  recognition: BrowserRecognition;
  handlers: Map<string, Handler>;
}

export function createRecordingWebRecognizer(
  recorder: SessionRecorder = defaultRecorder,
  makeRecognition: () => BrowserRecognition = newBrowserRecognition
) {
  const listeners = new Map<string, Set<Listener>>();
  const recordListeners = new Set<RecordListener>();
  let nextRecId = 1;
  let current: Active | null = null;

  const emit = (eventName: string, payload?: unknown) =>
    listeners.get(eventName)?.forEach(listener => listener(payload));

  const append: SessionRecorder['append'] = draft => {
    const event = recorder.append(draft);
    recordListeners.forEach(listener => listener(event));
    return event;
  };

  function record(active: Active, eventName: string, event: unknown) {
    const { recId } = active;
    const browserT = (event as { timeStamp?: number } | undefined)?.timeStamp;
    const stamp = typeof browserT === 'number' ? { browserT } : {};
    switch (eventName) {
      case 'start':
        append({ kind: 'rec.started', recId, ...stamp });
        break;
      case 'end':
        append({ kind: 'rec.ended', recId, ...stamp });
        break;
      case 'speechstart':
        append({ kind: 'rec.speechstart', recId, ...stamp });
        break;
      case 'speechend':
        append({ kind: 'rec.speechend', recId, ...stamp });
        break;
      case 'error':
        append({
          kind: 'rec.error',
          recId,
          code: (event as { error?: string }).error ?? 'unknown',
          ...stamp,
        });
        break;
      case 'result': {
        const resultEvent = event as BrowserResultEvent;
        const latest = resultEvent.results[resultEvent.resultIndex];
        const alternatives = Array.from(latest ?? []).map(
          alternative => alternative.transcript
        );
        // An interim can come in pieces ("four" + "teen"): keep all of them.
        append({
          kind: 'rec.result',
          recId,
          resultIndex: resultEvent.resultIndex,
          text: toResultPayload(resultEvent).results[0]?.transcript ?? '',
          alternatives,
          isFinal: Boolean(latest?.isFinal),
          ...stamp,
        });
        break;
      }
      default:
        break;
    }
  }

  function detach(active: Active) {
    active.handlers.forEach((handler, eventName) =>
      active.recognition.removeEventListener?.(eventName, handler)
    );
    active.handlers.clear();
  }

  return {
    start(options: ExpoSpeechRecognitionOptions) {
      const recognition = makeRecognition();
      applyOptions(recognition, options);
      const active: Active = {
        recId: nextRecId,
        recognition,
        handlers: new Map(),
      };
      nextRecId += 1;
      current = active;

      EVENT_NAMES.forEach(eventName => {
        const handler = ((event: unknown) => {
          record(active, eventName, event);
          emit(eventName, toPayload(eventName, event));
          if (eventName === 'end') {
            detach(active);
          }
        }) as Handler;
        active.handlers.set(eventName, handler);
        recognition.addEventListener(eventName, handler);
      });

      append({
        kind: 'rec.requested',
        recId: active.recId,
        continuous: Boolean(options.continuous),
      });
      recognition.start();
    },

    stop() {
      current?.recognition.stop();
    },

    abort() {
      current?.recognition.abort();
    },

    subscribe(listener: RecordListener) {
      recordListeners.add(listener);
      return () => {
        recordListeners.delete(listener);
      };
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
  };
}

export const recordingWebRecognizer = createRecordingWebRecognizer();
