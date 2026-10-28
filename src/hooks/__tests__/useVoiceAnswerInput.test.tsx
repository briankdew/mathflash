import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useVoiceAnswerInput } from '../useVoiceAnswerInput';
import type { SpeechRecognitionAdapter } from '../../lib/expoSpeechRecognitionAdapter';
import type { ProblemDisplay, SessionOptions } from '../../lib/types';

type Handler = (...args: unknown[]) => void;

function createFakeAdapter() {
  const handlers: Record<string, Handler[]> = {};
  const addListener = jest.fn((eventName: string, handler: Handler) => {
    (handlers[eventName] ??= []).push(handler);
    return {
      remove: () => {
        handlers[eventName] = handlers[eventName].filter(h => h !== handler);
      },
    };
  });
  const granted = {
    granted: true,
    canAskAgain: false,
    expires: 'never',
    status: 'granted',
  };
  const adapter = {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: () => false,
    getPermissionsAsync: jest.fn(async () => granted),
    requestPermissionsAsync: jest.fn(async () => granted),
    start: jest.fn(),
    stop: jest.fn(),
    addListener,
  } as unknown as SpeechRecognitionAdapter;

  return {
    adapter,
    addListener,
    emit: (eventName: string, ...args: unknown[]) =>
      (handlers[eventName] ?? []).forEach(handler => handler(...args)),
  };
}

const problem: ProblemDisplay = {
  problemInstanceId: 'p1',
  left: 3,
  right: 4,
  result: 7,
  missing: 'result',
  correct: 7,
};

describe('useVoiceAnswerInput speech subscriptions', () => {
  // The hook refuses to listen on web unless the page is a secure context.
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {
      isSecureContext: true,
      location: { search: '' },
    };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('subscribes once per event across re-renders and calls the latest callback once per event', async () => {
    const fake = createFakeAdapter();
    const firstOnSpeechStart = jest.fn();
    const latestOnSpeechStart = jest.fn();

    const { rerender } = renderHook(
      (props: { onSpeechStart: jest.Mock }) =>
        useVoiceAnswerInput({
          enabled: false,
          shouldListen: false,
          isSessionActive: false,
          currentProblem: problem,
          options: { operation: 'addsub' } as SessionOptions,
          onSpeechStart: props.onSpeechStart,
          onValidAttemptCaptured: jest.fn(),
          adapter: fake.adapter,
        }),
      { initialProps: { onSpeechStart: firstOnSpeechStart } }
    );
    await act(async () => {});

    const subscriptionsAfterMount = fake.addListener.mock.calls.length;

    // The session hook passes a new onSpeechStart function on almost every render.
    for (let i = 0; i < 5; i += 1) {
      rerender({ onSpeechStart: jest.fn() });
    }
    rerender({ onSpeechStart: latestOnSpeechStart });
    await act(async () => {});

    expect(fake.addListener.mock.calls.length).toBe(subscriptionsAfterMount);

    act(() => {
      fake.emit('speechstart');
    });

    expect(latestOnSpeechStart).toHaveBeenCalledTimes(1);
    expect(firstOnSpeechStart).not.toHaveBeenCalled();
  });

  it('captures a spoken answer from a final result event', async () => {
    const fake = createFakeAdapter();
    const onValidAttemptCaptured = jest.fn();

    const { result } = renderHook(() =>
      useVoiceAnswerInput({
        enabled: true,
        shouldListen: true,
        isSessionActive: true,
        currentProblem: problem,
        options: { operation: 'addsub' } as SessionOptions,
        onSpeechStart: jest.fn(),
        onValidAttemptCaptured,
        adapter: fake.adapter,
      })
    );
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    act(() => {
      fake.emit('result', {
        isFinal: true,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });

    expect(onValidAttemptCaptured).toHaveBeenCalledTimes(1);
    expect(result.current.voiceState.pendingAttempt?.value).toBe('7');
  });
});
