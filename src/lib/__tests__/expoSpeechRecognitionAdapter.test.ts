import { expoSpeechRecognitionAdapter } from '../expoSpeechRecognitionAdapter';

type Handler = (...args: unknown[]) => void;

// Mimics the web library's bug: remove() does not detach the listener.
const mockAttached: Record<string, Handler[]> = {};

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
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
});
