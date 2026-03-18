import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Platform } from 'react-native';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import {
  ProblemDisplay,
  SessionOptions,
  VoiceInputState,
  VoicePermissionStatus,
  VoiceSessionMetrics,
} from '../lib/types';
import {
  buildVoiceContextualStrings,
  getVoiceAcceptedAnswerRange,
  getVoiceAnswerRange,
  normalizeVoiceNumber,
} from '../lib/voiceNumberNormalization';
import {
  expoSpeechRecognitionAdapter,
  SpeechRecognitionAdapter,
} from '../lib/expoSpeechRecognitionAdapter';
import {
  buildVoiceInputState,
  createInitialVoiceControllerState,
  voiceControllerReducer,
} from './voice/voiceController';

const RESTART_DELAY_MS = 220;
const FINALIZE_INTERIM_DELAY_MS = 250;

interface UseVoiceAnswerInputArgs {
  enabled: boolean;
  shouldListen: boolean;
  isSessionActive: boolean;
  currentProblem: ProblemDisplay | null;
  options: SessionOptions;
  onSpeechStart: (problemInstanceId: string, speechStartPerfMs: number) => void;
  onValidAttemptCaptured: () => void;
  adapter?: SpeechRecognitionAdapter;
}

interface UseVoiceAnswerInputResult {
  voiceState: VoiceInputState;
  voiceMetrics: VoiceSessionMetrics;
  ensureReadyForSession: () => Promise<boolean>;
  clearPendingAttempt: () => void;
  resetSessionMetrics: () => void;
}

interface LastValidInterim {
  problemInstanceId: string;
  value: string;
  rawTranscript: string;
}

function permissionStatusFromResponse(
  granted: boolean,
  canAskAgain: boolean
): VoicePermissionStatus {
  if (granted) return 'granted';
  return canAskAgain ? 'undetermined' : 'denied';
}

function getVoiceErrorMessage(event: ExpoSpeechRecognitionErrorEvent): string {
  switch (event.error) {
    case 'not-allowed':
      return 'Permission needed';
    case 'service-not-allowed':
      return 'Voice unavailable';
    case 'audio-capture':
      return 'Mic unavailable';
    case 'no-speech':
    case 'speech-timeout':
      return 'Retrying…';
    case 'language-not-supported':
      return 'Language unsupported';
    case 'network':
      return 'Speech service unavailable';
    default:
      return 'Voice input error';
  }
}

export function useVoiceAnswerInput({
  enabled,
  shouldListen,
  isSessionActive,
  currentProblem,
  options,
  onSpeechStart,
  onValidAttemptCaptured,
  adapter = expoSpeechRecognitionAdapter,
}: UseVoiceAnswerInputArgs): UseVoiceAnswerInputResult {
  const platformSupported =
    Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';
  const isWebPlatform = Platform.OS === 'web';
  const [controllerState, dispatch] = useReducer(
    voiceControllerReducer,
    platformSupported,
    createInitialVoiceControllerState
  );

  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const shouldListenRef = useRef(shouldListen);
  const currentProblemRef = useRef(currentProblem);
  const optionsRef = useRef(options);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supportsOnDeviceRef = useRef(false);
  const suppressRestartRef = useRef(false);
  const speechStartPerfRef = useRef<number | null>(null);
  const speechEndPerfRef = useRef<number | null>(null);
  const finalizeInterimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastValidInterimRef = useRef<LastValidInterim | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    shouldListenRef.current = shouldListen;
    if (shouldListen) {
      suppressRestartRef.current = false;
    } else {
      dispatch({ type: 'clearStatus' });
    }
  }, [shouldListen]);

  useEffect(() => {
    currentProblemRef.current = currentProblem;
    speechStartPerfRef.current = null;
    speechEndPerfRef.current = null;
    if (finalizeInterimTimeoutRef.current) {
      clearTimeout(finalizeInterimTimeoutRef.current);
      finalizeInterimTimeoutRef.current = null;
    }
    lastValidInterimRef.current = null;
    dispatch({ type: 'transcriptPreviewUpdated', transcriptPreview: '' });
    dispatch({ type: 'clearPendingAttempt' });
    dispatch({ type: 'clearStatus' });
  }, [currentProblem]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const clearFinalizeInterimTimeout = useCallback(() => {
    if (finalizeInterimTimeoutRef.current) {
      clearTimeout(finalizeInterimTimeoutRef.current);
      finalizeInterimTimeoutRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimeout();
    clearFinalizeInterimTimeout();
    try {
      adapter.stop();
    } catch {
      // Stop can throw if recognition is not active. Ignore that case.
    }
  }, [adapter, clearFinalizeInterimTimeout, clearRestartTimeout]);

  const refreshAvailability = useCallback(async () => {
    if (!platformSupported) {
      if (!mountedRef.current) return false;
      dispatch({
        type: 'availabilityResolved',
        isAvailable: false,
        permissionStatus: 'unavailable',
      });
      return false;
    }

    const isSecureWebContext =
      !isWebPlatform || globalThis.window?.isSecureContext === true;
    const available = adapter.isRecognitionAvailable();
    supportsOnDeviceRef.current = adapter.supportsOnDeviceRecognition();

    const permission = await adapter.getPermissionsAsync();
    if (!mountedRef.current) return available;

    dispatch({
      type: 'availabilityResolved',
      isAvailable: available && isSecureWebContext,
      permissionStatus: permissionStatusFromResponse(
        permission.granted,
        permission.canAskAgain
      ),
    });

    return available && isSecureWebContext;
  }, [adapter, isWebPlatform, platformSupported]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshAvailability();

    return () => {
      mountedRef.current = false;
      clearRestartTimeout();
      clearFinalizeInterimTimeout();
      stopRecognition();
    };
  }, [
    clearFinalizeInterimTimeout,
    clearRestartTimeout,
    refreshAvailability,
    stopRecognition,
  ]);

  const submitVoiceAttempt = useCallback(
    (value: string, rawTranscript: string, finalResultPerfMs: number | null) => {
      const problemInstanceId = currentProblemRef.current?.problemInstanceId;
      if (!problemInstanceId) {
        return;
      }

      const speechEndPerfMs =
        speechEndPerfRef.current ?? finalResultPerfMs ?? performance.now();
      const voiceProcessingMs =
        finalResultPerfMs === null
          ? 0
          : Math.max(0, finalResultPerfMs - speechEndPerfMs);

      clearFinalizeInterimTimeout();
      suppressRestartRef.current = true;
      shouldListenRef.current = false;
      onValidAttemptCaptured();
      dispatch({
        type: 'attemptCaptured',
        attempt: {
          problemInstanceId,
          value,
          source: 'voice',
          completedAtPerfMs: speechEndPerfMs,
          speechStartPerfMs: speechStartPerfRef.current,
          speechEndPerfMs,
          finalResultPerfMs,
          voiceProcessingMs,
          rawTranscript,
        },
        voiceProcessingMs,
      });
    },
    [clearFinalizeInterimTimeout, onValidAttemptCaptured]
  );

  const ensureReadyForSession = useCallback(async () => {
    dispatch({ type: 'readyCheckStarted' });

    if (!platformSupported) {
      if (mountedRef.current) {
        dispatch({
          type: 'unsupported',
          errorMessage: 'Voice unsupported here',
          statusLabel: 'Voice unavailable',
        });
      }
      return false;
    }

    if (isWebPlatform && globalThis.window?.isSecureContext !== true) {
      if (mountedRef.current) {
        dispatch({
          type: 'unsupported',
          errorMessage: 'Use localhost or HTTPS',
          statusLabel: 'Secure origin required',
        });
      }
      return false;
    }

    const available = await refreshAvailability();
    if (!available) {
      if (mountedRef.current) {
        dispatch({
          type: 'unsupported',
          errorMessage: isWebPlatform
            ? 'Browser speech unavailable'
            : 'Speech recognition unavailable',
        });
      }
      return false;
    }

    const permission = await adapter.requestPermissionsAsync();
    const nextStatus = permissionStatusFromResponse(
      permission.granted,
      permission.canAskAgain
    );

    if (!mountedRef.current) {
      return permission.granted;
    }

    dispatch({
      type: 'availabilityResolved',
      isAvailable: available,
      permissionStatus: nextStatus,
    });

    if (!permission.granted) {
      dispatch({
        type: 'permissionDenied',
        permissionStatus: nextStatus,
        errorMessage: 'Microphone permission needed',
        statusLabel: 'Permission needed',
      });
      return false;
    }

    dispatch({ type: 'ready' });
    return true;
  }, [adapter, isWebPlatform, platformSupported, refreshAvailability]);

  const scheduleRestart = useCallback(
    (isRetry: boolean) => {
      if (!mountedRef.current || restartTimeoutRef.current) {
        return;
      }

      if (isRetry) {
        dispatch({ type: 'retryScheduled' });
      }

      const restartDelayMs = isRetry ? RESTART_DELAY_MS : 0;

      restartTimeoutRef.current = setTimeout(() => {
        restartTimeoutRef.current = null;
        if (!mountedRef.current || !enabledRef.current || !shouldListenRef.current) {
          return;
        }

        void ensureReadyForSession().then(ready => {
          if (!ready || !mountedRef.current || !shouldListenRef.current) {
            return;
          }

          try {
            dispatch({ type: 'clearStatus' });
            const range = getVoiceAnswerRange(
              currentProblemRef.current,
              optionsRef.current.operation
            );

            adapter.start({
              lang: 'en-US',
              interimResults: true,
              continuous: false,
              maxAlternatives: 1,
              addsPunctuation: false,
              contextualStrings: buildVoiceContextualStrings(range),
              requiresOnDeviceRecognition: supportsOnDeviceRef.current,
              iosTaskHint: 'confirmation',
              iosCategory: {
                category: 'playAndRecord',
                categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
                mode: 'measurement',
              },
            });
          } catch {
            dispatch({
              type: 'error',
              errorMessage: 'Unable to start voice input',
              statusLabel: 'Voice unavailable',
            });
          }
        });
      }, restartDelayMs);
    },
    [adapter, ensureReadyForSession]
  );

  const handleResult = useCallback(
    (event: ExpoSpeechRecognitionResultEvent) => {
      const rawTranscript = event.results[0]?.transcript?.trim() ?? '';
      if (!rawTranscript || !currentProblemRef.current) {
        return;
      }

      const acceptedRange = getVoiceAcceptedAnswerRange(
        currentProblemRef.current,
        optionsRef.current.operation
      );
      const normalized = normalizeVoiceNumber(rawTranscript, acceptedRange);

      if (normalized.kind === 'valid') {
        lastValidInterimRef.current = {
          problemInstanceId: currentProblemRef.current.problemInstanceId ?? '',
          value: normalized.normalizedText,
          rawTranscript,
        };
        dispatch({
          type: 'transcriptPreviewUpdated',
          transcriptPreview: normalized.normalizedText,
        });
        dispatch({ type: 'clearStatus' });

        if (!event.isFinal) {
          return;
        }

        const finalResultPerfMs = performance.now();
        lastValidInterimRef.current = null;
        submitVoiceAttempt(
          normalized.normalizedText,
          rawTranscript,
          finalResultPerfMs
        );
        return;
      }

      if (event.isFinal) {
        clearFinalizeInterimTimeout();
        lastValidInterimRef.current = null;
        dispatch({ type: 'transcriptPreviewUpdated', transcriptPreview: '' });
        dispatch({
          type: 'error',
          errorMessage: 'Say a number only',
          statusLabel: 'Retrying…',
          metricKey: 'ambiguousFinalCount',
          status: 'retrying',
        });
      }
    },
    [clearFinalizeInterimTimeout, submitVoiceAttempt]
  );

  const handleError = useCallback((event: ExpoSpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted' || event.error === 'busy') {
      return;
    }

    const message = getVoiceErrorMessage(event);
    const retryableError =
      event.error === 'no-speech' || event.error === 'speech-timeout';

    dispatch({
      type: 'error',
      errorMessage: message,
      statusLabel: message,
      metricKey: retryableError ? 'noSpeechCount' : undefined,
      status: retryableError ? 'retrying' : 'error',
    });

    if (retryableError) {
      return;
    }

    if (
      event.error === 'not-allowed' ||
      event.error === 'service-not-allowed' ||
      event.error === 'language-not-supported' ||
      event.error === 'network' ||
      event.error === 'audio-capture'
    ) {
      suppressRestartRef.current = true;
      shouldListenRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!platformSupported) {
      return;
    }

    const subscriptions = [
      adapter.addListener('start', () => {
        dispatch({ type: 'listeningStarted' });
      }),
      adapter.addListener('end', () => {
        const shouldRetry =
          enabledRef.current &&
          shouldListenRef.current &&
          !suppressRestartRef.current;
        dispatch({ type: 'listeningEnded', shouldRetry });
        if (shouldRetry) {
          scheduleRestart(true);
        }
      }),
      adapter.addListener('speechstart', () => {
        const problemInstanceId = currentProblemRef.current?.problemInstanceId;
        if (!problemInstanceId) {
          return;
        }
        clearFinalizeInterimTimeout();
        lastValidInterimRef.current = null;
        const speechStartPerfMs = performance.now();
        speechStartPerfRef.current = speechStartPerfMs;
        onSpeechStart(problemInstanceId, speechStartPerfMs);
      }),
      adapter.addListener('speechend', () => {
        speechEndPerfRef.current = performance.now();
        clearFinalizeInterimTimeout();
        finalizeInterimTimeoutRef.current = setTimeout(() => {
          finalizeInterimTimeoutRef.current = null;

          const currentProblemInstanceId =
            currentProblemRef.current?.problemInstanceId;
          const lastValidInterim = lastValidInterimRef.current;

          if (
            !mountedRef.current ||
            !enabledRef.current ||
            !currentProblemInstanceId ||
            !lastValidInterim ||
            lastValidInterim.problemInstanceId !== currentProblemInstanceId
          ) {
            return;
          }

          lastValidInterimRef.current = null;
          submitVoiceAttempt(
            lastValidInterim.value,
            lastValidInterim.rawTranscript,
            null
          );
        }, FINALIZE_INTERIM_DELAY_MS);
      }),
      adapter.addListener('result', handleResult),
      adapter.addListener('error', handleError),
      adapter.addListener('nomatch', () => {
        dispatch({ type: 'transcriptPreviewUpdated', transcriptPreview: '' });
        dispatch({
          type: 'error',
          errorMessage: 'Say a number only',
          statusLabel: 'Retrying…',
          metricKey: 'noMatchCount',
          status: 'retrying',
        });
      }),
    ];

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [
    adapter,
    clearFinalizeInterimTimeout,
    handleError,
    handleResult,
    onSpeechStart,
    platformSupported,
    scheduleRestart,
    submitVoiceAttempt,
  ]);

  useEffect(() => {
    if (!enabled || !shouldListen || !isSessionActive || !currentProblem) {
      if (!shouldListen) {
        suppressRestartRef.current = true;
      }
      stopRecognition();
      if (!isSessionActive) {
        dispatch({ type: 'clearStatus' });
        dispatch({ type: 'transcriptPreviewUpdated', transcriptPreview: '' });
      }
      return;
    }

    void ensureReadyForSession().then(ready => {
      if (!ready || !mountedRef.current || !shouldListenRef.current) {
        return;
      }

      scheduleRestart(false);
    });
  }, [
    currentProblem,
    enabled,
    ensureReadyForSession,
    isSessionActive,
    scheduleRestart,
    shouldListen,
    stopRecognition,
  ]);

  const clearPendingAttempt = useCallback(() => {
    dispatch({ type: 'clearPendingAttempt' });
  }, []);

  const resetSessionMetrics = useCallback(() => {
    clearFinalizeInterimTimeout();
    dispatch({ type: 'resetSessionMetrics' });
    speechStartPerfRef.current = null;
    speechEndPerfRef.current = null;
    lastValidInterimRef.current = null;
    suppressRestartRef.current = false;
  }, [clearFinalizeInterimTimeout]);

  return {
    voiceState: useMemo(
      () => buildVoiceInputState(platformSupported, controllerState),
      [controllerState, platformSupported]
    ),
    voiceMetrics: controllerState.metrics,
    ensureReadyForSession,
    clearPendingAttempt,
    resetSessionMetrics,
  };
}
