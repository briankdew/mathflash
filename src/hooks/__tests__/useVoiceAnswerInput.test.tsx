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

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1';

function pretendToBeIphoneSafari() {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: IPHONE_SAFARI },
    configurable: true,
  });
}

describe('useVoiceAnswerInput speech subscriptions', () => {
  // The hook refuses to listen on web unless the page is a secure context.
  beforeEach(() => {
    pretendToBeIphoneSafari();
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

    // The response onset is reported once the first text of the speech arrives.
    act(() => {
      fake.emit('speechstart');
      fake.emit('result', {
        isFinal: false,
        results: [{ transcript: 'hello', confidence: 1, segments: [] }],
      });
      fake.emit('result', {
        isFinal: false,
        results: [{ transcript: 'hello there', confidence: 1, segments: [] }],
      });
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
    (globalThis as { window?: unknown }).window = {
      isSecureContext: true,
      location: { search: '?debug=1&fast=0' },
    };
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

  it('accepts a stable interim number by default in Safari, timed from speech onset', async () => {
    const fake = createFakeAdapter();
    const { result } = renderListeningHook(fake);
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
    });
    const speechStartedAt = performance.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    act(() => {
      fake.emit('result', { ...interimSeven, results: [{ transcript: 'two', confidence: 1, segments: [] }] });
    });

    await waitFor(() =>
      expect(result.current.voiceState.pendingAttempt?.value).toBe('2')
    );
    const attempt = result.current.voiceState.pendingAttempt;
    // Response time ends at speech onset; the engine's wait is kept apart.
    expect(attempt?.completedAtPerfMs).toBe(attempt?.speechStartPerfMs);
    expect(attempt?.speechStartPerfMs).toBeLessThanOrEqual(speechStartedAt + 5);
    expect(attempt?.captureLagMs).toBeGreaterThanOrEqual(500);
  });

  it('counts the recognizer-ready delay from when listening resumed, not from when the problem appeared', async () => {
    const fake = createFakeAdapter();
    const shownLongAgo = { ...problem, presentedAtPerf: performance.now() - 5000 };
    const { result, rerender } = renderHook(
      (props: { shouldListen: boolean }) =>
        useVoiceAnswerInput({
          enabled: true,
          shouldListen: props.shouldListen,
          isSessionActive: true,
          currentProblem: shownLongAgo,
          options: { operation: 'addsub' } as SessionOptions,
          onSpeechStart: jest.fn(),
          onValidAttemptCaptured: jest.fn(),
          adapter: fake.adapter,
        }),
      { initialProps: { shouldListen: false } }
    );
    rerender({ shouldListen: true });
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
      fake.emit('result', finalSeven);
    });

    await waitFor(() =>
      expect(result.current.voiceState.pendingAttempt?.value).toBe('7')
    );
    expect(
      result.current.voiceState.pendingAttempt?.recognizerReadyLagMs
    ).toBeLessThan(500);
  });

  describe('empty tries (speech reported, no text, no error)', () => {
    async function setUpTwoStretches(
      firstStretch: () => void,
      fake: ReturnType<typeof createFakeAdapter>,
      onSpeechStart = jest.fn()
    ) {
      const { result } = renderHook(() =>
        useVoiceAnswerInput({
          enabled: true,
          shouldListen: true,
          isSessionActive: true,
          currentProblem: problem,
          options: { operation: 'addsub' } as SessionOptions,
          onSpeechStart,
          onValidAttemptCaptured: jest.fn(),
          adapter: fake.adapter,
        })
      );
      await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

      act(() => {
        fake.emit('start');
        fake.emit('speechstart');
      });
      await new Promise(resolve => setTimeout(resolve, 150));
      act(firstStretch);
      await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(2));

      act(() => {
        fake.emit('start');
        fake.emit('speechstart');
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      act(() => {
        fake.emit('result', finalSeven);
      });
      await waitFor(() =>
        expect(result.current.voiceState.pendingAttempt?.value).toBe('7')
      );
      return result.current.voiceState.pendingAttempt;
    }

    it('takes the empty stretch off the response time and the onset', async () => {
      const fake = createFakeAdapter();
      const onSpeechStart = jest.fn();

      const attempt = await setUpTwoStretches(
        () => fake.emit('end'),
        fake,
        onSpeechStart
      );

      expect(attempt?.emptyTryMs).toBeGreaterThanOrEqual(140);
      expect(attempt?.completedAtPerfMs).toBeCloseTo(
        (attempt?.speechStartPerfMs ?? 0) - (attempt?.emptyTryMs ?? 0),
        3
      );
      // Reported once, from the stretch that produced text, minus the dead time.
      expect(onSpeechStart).toHaveBeenCalledTimes(1);
      expect(onSpeechStart.mock.calls[0][1]).toBeCloseTo(
        (attempt?.speechStartPerfMs ?? 0) - (attempt?.emptyTryMs ?? 0),
        3
      );
    });

    it('does not take off a stretch that returned text', async () => {
      const fake = createFakeAdapter();

      const attempt = await setUpTwoStretches(() => {
        fake.emit('result', {
          isFinal: true,
          results: [{ transcript: 'hello', confidence: 1, segments: [] }],
        });
        fake.emit('end');
      }, fake);

      expect(attempt?.emptyTryMs).toBe(0);
    });

    it('does not take off a stretch that ended in an error', async () => {
      const fake = createFakeAdapter();

      const attempt = await setUpTwoStretches(() => {
        fake.emit('error', { error: 'no-speech', message: '' });
        fake.emit('end');
      }, fake);

      expect(attempt?.emptyTryMs).toBe(0);
    });
  });

  it('holds an interim number that could still grow, e.g. four -> fourteen', async () => {
    (globalThis as { window?: unknown }).window = {
      isSecureContext: true,
      location: { search: '?debug=1&fast=100' },
    };
    const fake = createFakeAdapter();
    const { result } = renderListeningHook(fake);
    await waitFor(() => expect(fake.adapter.start).toHaveBeenCalledTimes(1));

    act(() => {
      fake.emit('start');
      fake.emit('speechstart');
      fake.emit('result', {
        isFinal: false,
        results: [{ transcript: 'four', confidence: 1, segments: [] }],
      });
    });
    // Past the plain 100ms hold, but inside the extended hold for "four".
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(result.current.voiceState.pendingAttempt).toBeNull();

    act(() => {
      fake.emit('result', {
        isFinal: false,
        results: [{ transcript: 'fourteen', confidence: 1, segments: [] }],
      });
    });
    await waitFor(() =>
      expect(result.current.voiceState.pendingAttempt?.value).toBe('14')
    );
  });

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
});
