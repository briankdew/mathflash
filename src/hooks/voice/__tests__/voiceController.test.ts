import {
  buildVoiceInputState,
  createInitialVoiceControllerState,
  voiceControllerReducer,
} from '../voiceController';

describe('voiceController reducer', () => {
  it('transitions through ready and listening states', () => {
    const initial = createInitialVoiceControllerState(true);
    const available = voiceControllerReducer(initial, {
      type: 'availabilityResolved',
      isAvailable: true,
      permissionStatus: 'granted',
    });
    const ready = voiceControllerReducer(available, { type: 'ready' });
    const listening = voiceControllerReducer(ready, { type: 'listeningStarted' });

    expect(ready.status).toBe('ready');
    expect(listening.status).toBe('listening');
    expect(listening.isListening).toBe(true);
  });

  it('tracks retry and no-match metrics', () => {
    const retried = voiceControllerReducer(createInitialVoiceControllerState(true), {
      type: 'retryScheduled',
    });
    const errored = voiceControllerReducer(retried, {
      type: 'error',
      errorMessage: 'Say a number only',
      statusLabel: 'Retrying…',
      metricKey: 'noMatchCount',
      status: 'retrying',
    });

    expect(errored.metrics.retryCount).toBe(1);
    expect(errored.metrics.noMatchCount).toBe(1);
    expect(errored.status).toBe('retrying');
  });

  it('builds the public voice input state shape', () => {
    const state = voiceControllerReducer(createInitialVoiceControllerState(true), {
      type: 'attemptCaptured',
      attempt: {
        problemInstanceId: 'p1',
        value: '8',
        source: 'voice',
      },
      voiceProcessingMs: 30,
    });
    const publicState = buildVoiceInputState(true, state);

    expect(publicState.pendingAttempt?.value).toBe('8');
    expect(publicState.processingMsTotal).toBe(30);
    expect(publicState.platformSupported).toBe(true);
  });
});
