import { Platform } from 'react-native';
import { expoSpeechRecognitionAdapter } from '../expoSpeechRecognitionAdapter';

type Handler = (...args: unknown[]) => void;

// Mimics the web library's bug: remove() does not detach the listener.
const mockAttached: Record<string, Handler[]> = {};

const mockCalls: string[] = [];

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: () => mockCalls.push('start'),
    stop: () => mockCalls.push('stop'),
    abort: () => mockCalls.push('abort'),
    addListener: (eventName: string, handler: Handler) => {
      (mockAttached[eventName] ??= []).push(handler);
      return { remove: () => undefined };
    },
  },
}));

function emit(eventName: string, ...args: unknown[]) {
  (mockAttached[eventName] ?? []).forEach(handler => handler(...args));
}

describe('expoSpeechRecognitionAdapter.addListener', () => {
  beforeEach(() => {
    Object.keys(mockAttached).forEach(key => delete mockAttached[key]);
    mockCalls.length = 0;
  });

  it('delivers an event to an active listener once', () => {
    const listener = jest.fn();
    expoSpeechRecognitionAdapter.addListener('end', listener);

    emit('end');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops delivering to a removed listener even if the library keeps it attached', () => {
    const removed = jest.fn();
    const current = jest.fn();
    const subscription = expoSpeechRecognitionAdapter.addListener(
      'end',
      removed
    );
    subscription.remove();
    expoSpeechRecognitionAdapter.addListener('end', current);

    emit('end');

    expect(removed).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
  });

  describe('?abort=1 experiment', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (globalThis as { window?: unknown }).window = {
        location: { search: '?debug=1&abort=1' },
      };
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: originalOS });
      delete (globalThis as { window?: unknown }).window;
    });

    it('aborts a running recognizer and starts the next one after it ends', () => {
      expoSpeechRecognitionAdapter.start({});
      emit('start');
      expect(mockCalls).toEqual(['start']);

      expoSpeechRecognitionAdapter.start({});
      expect(mockCalls).toEqual(['start', 'abort']);

      emit('end');
      expect(mockCalls).toEqual(['start', 'abort', 'start']);
    });

    it('uses abort() instead of stop()', () => {
      expoSpeechRecognitionAdapter.stop();
      expect(mockCalls).toEqual(['abort']);
    });
  });
});
