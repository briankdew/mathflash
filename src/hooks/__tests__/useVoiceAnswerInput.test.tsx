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

  it('accepts a stable interim number early with ?fast and ignores the late final result', async () => {
    (globalThis as { window?: unknown }).window = {
      isSecureContext: true,
      location: { search: '?debug=1&fast=50' },
    };
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
      fake.emit('start');
      fake.emit('result', {
        isFinal: false,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });
    await waitFor(() =>
      expect(result.current.voiceState.pendingAttempt?.value).toBe('7')
    );
    expect(onValidAttemptCaptured).toHaveBeenCalledTimes(1);

    // Safari delivers the final transcript of the same utterance later. It must
    // not be counted again (it could belong to the next problem).
    act(() => {
      fake.emit('result', {
        isFinal: true,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });
    expect(onValidAttemptCaptured).toHaveBeenCalledTimes(1);
  });

  it('does not wait for a final result without ?fast', async () => {
    const fake = createFakeAdapter();
    const onValidAttemptCaptured = jest.fn();

    renderHook(() =>
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
        isFinal: false,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(onValidAttemptCaptured).not.toHaveBeenCalled();
  });

  function renderListeningHook(
    fake: ReturnType<typeof createFakeAdapter>,
    onValidAttemptCaptured = jest.fn()
  ) {
    return renderHook(() =>
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
  }

  const interimSeven = {
    isFinal: false,
    results: [{ transcript: 'seven', confidence: 1, segments: [] }],
  };
  const finalSeven = {
    isFinal: true,
    results: [{ transcript: 'seven', confidence: 1, segments: [] }],
  };

  it('does not restart the recognizer while a valid interim answer is waiting to be accepted', async () => {
    const fake = createFakeAdapter();
    const onValidAttemptCaptured = jest.fn();
    renderListeningHook(fake, onValidAttemptCaptured);
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
      fake.emit('result', interimSeven);
      fake.emit('speechend');
      fake.emit('end');
    });
    await waitFor(() => expect(onValidAttemptCaptured).toHaveBeenCalledTimes(1));
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(fake.adapter.start).toHaveBeenCalledTimes(1);
  });

  it('accepts the last valid interim number when the recognizer ends with ?fast', async () => {
    (globalThis as { window?: unknown }).window = {
      isSecureContext: true,
      location: { search: '?debug=1&fast=5000' },
    };
    const fake = createFakeAdapter();
    const onValidAttemptCaptured = jest.fn();
    const { result } = renderListeningHook(fake, onValidAttemptCaptured);
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
      fake.emit('result', interimSeven);
      fake.emit('end');
    });

    await waitFor(() =>
      expect(result.current.voiceState.pendingAttempt?.value).toBe('7')
    );
    expect(fake.adapter.start).toHaveBeenCalledTimes(1);
  });

  it("does not use the previous attempt's end-of-speech time for a retry", async () => {
    const fake = createFakeAdapter();
    const { result } = renderListeningHook(fake);
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    // Attempt 1: speech was heard but nothing usable came back.
    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
      fake.emit('speechend');
      fake.emit('end');
    });
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(2));

    // Attempt 2: the final result arrives before this attempt's speechend.
    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
    });
    await new Promise(resolve => setTimeout(resolve, 150));
    act(() => {
      fake.emit('result', finalSeven);
    });

    expect(result.current.voiceState.pendingAttempt?.voiceProcessingMs).toBe(0);
  });

  it('with ?continuous keeps one recognizer running across problems and ignores the late final of the answered one', async () => {
    (globalThis as { window?: unknown }).window = {
      isSecureContext: true,
      location: { search: '?debug=1&continuous=1' },
    };
    const fake = createFakeAdapter();
    const second: ProblemDisplay = { ...problem, problemInstanceId: 'p2' };

    const { result, rerender } = renderHook(
      (props: { shouldListen: boolean; current: ProblemDisplay }) =>
        useVoiceAnswerInput({
          enabled: true,
          shouldListen: props.shouldListen,
          isSessionActive: true,
          currentProblem: props.current,
          options: { operation: 'addsub' } as SessionOptions,
          onSpeechStart: jest.fn(),
          onValidAttemptCaptured: jest.fn(),
          adapter: fake.adapter,
        }),
      { initialProps: { shouldListen: true, current: problem } }
    );
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));
    expect(fake.adapter.start).toHaveBeenCalledWith(
      expect.objectContaining({ continuous: true })
    );
    act(() => fake.emit('start'));

    act(() => {
      fake.emit('speechstart');
      fake.emit('result', {
        isFinal: true,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });
    await waitFor(() =>
      expect(result.current.voiceState.pendingAttempt?.value).toBe('7')
    );

    rerender({ shouldListen: false, current: problem });
    rerender({ shouldListen: true, current: second });
    await act(async () => {});

    // Still the same recognizer: not stopped, not started again.
    expect(fake.adapter.stop).not.toHaveBeenCalled();
    expect(fake.adapter.start).toHaveBeenCalledTimes(1);

    // The old answer's late result must not answer problem two.
    act(() => {
      fake.emit('result', {
        isFinal: true,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });
    expect(result.current.voiceState.pendingAttempt).toBeNull();

    // A new utterance does.
    act(() => {
      fake.emit('speechstart');
      fake.emit('result', {
        isFinal: true,
        results: [{ transcript: 'seven', confidence: 1, segments: [] }],
      });
    });
    expect(result.current.voiceState.pendingAttempt?.problemInstanceId).toBe('p2');
  });
});
