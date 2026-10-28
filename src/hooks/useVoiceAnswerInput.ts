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
  couldGrowIntoLongerNumber,
  getVoiceAcceptedAnswerRange,
  getVoiceAnswerRange,
  normalizeVoiceNumber,
} from '../lib/voiceNumberNormalization';
import {
  expoSpeechRecognitionAdapter,
  SpeechRecognitionAdapter,
} from '../lib/expoSpeechRecognitionAdapter';
import { logVoiceDebug } from '../lib/voiceDebugLog';
import {
  computeRestartDelayMs,
  getVoiceExperiments,
} from '../lib/voiceExperiments';
import {
  buildVoiceInputState,
  createInitialVoiceControllerState,
  voiceControllerReducer,
} from './voice/voiceController';

const RESTART_DELAY_MS = 220;
const FINALIZE_INTERIM_DELAY_MS = 250;
// How long results from a recognizer that already produced an answer are ignored.
const LATE_RESULT_GUARD_MS = 5000;
// Extra time an interim number is held when it could still grow into a longer
// answer ("four" may become "fourteen").
const GROWING_NUMBER_EXTRA_HOLD_MS = 400;

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
  const lastEndPerfRef = useRef<number | null>(null);
  // When the recognizer reported `start` for the current problem. Used to tell
  // how long the engine took to become ready after the problem was shown.
  const recognizerStartPerfRef = useRef<number | null>(null);
  const isRecognizerRunningRef = useRef(false);
  // Set when an answer is taken while the recognizer is still running. Its late
  // results (e.g. the final transcript of the same utterance) must not be
  // counted as the answer to the next problem. Cleared when it ends.
  const ignoreResultsSincePerfRef = useRef<number | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    shouldListenRef.current = shouldListen;
    logVoiceDebug('shouldListen', String(shouldListen));
    if (shouldListen) {
      suppressRestartRef.current = false;
    } else {
      dispatch({ type: 'clearStatus' });
    }
  }, [shouldListen]);

  useEffect(() => {
    currentProblemRef.current = currentProblem;
    logVoiceDebug('problem', currentProblem?.problemInstanceId ?? 'none');
    speechStartPerfRef.current = null;
    speechEndPerfRef.current = null;
    recognizerStartPerfRef.current = null;
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
    (
      value: string,
      rawTranscript: string,
      finalResultPerfMs: number | null,
      via: 'final' | 'speechend' | 'stable' | 'end'
    ) => {
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

      // Response-time rule: the user's time ends when they began to speak, not
      // when the engine delivered the answer. What the engine added on top is
      // recorded separately and never charged to the user.
      const capturedPerfMs = performance.now();
      const speechStartPerfMs = speechStartPerfRef.current;
      const captureLagMs =
        speechStartPerfMs === null
          ? null
          : Math.max(0, capturedPerfMs - speechStartPerfMs);
      const presentedAtPerfMs = currentProblemRef.current?.presentedAtPerf;
      const recognizerReadyLagMs =
        recognizerStartPerfRef.current === null ||
        presentedAtPerfMs === undefined
          ? null
          : Math.max(0, recognizerStartPerfRef.current - presentedAtPerfMs);

      logVoiceDebug(
        'answer captured',
        `"${value}" via ${via} onset-to-answer ${
          captureLagMs === null ? '?' : Math.round(captureLagMs)
        }ms engine-ready-lag ${
          recognizerReadyLagMs === null ? '?' : Math.round(recognizerReadyLagMs)
        }ms`
      );
      clearFinalizeInterimTimeout();
      if (isRecognizerRunningRef.current) {
        ignoreResultsSincePerfRef.current = performance.now();
      }
      suppressRestartRef.current = true;
      shouldListenRef.current = false;
      onValidAttemptCaptured();
      dispatch({
        type: 'attemptCaptured',
        attempt: {
          problemInstanceId,
          value,
          source: 'voice',
          completedAtPerfMs: speechStartPerfMs ?? speechEndPerfMs,
          speechStartPerfMs,
          speechEndPerfMs,
          finalResultPerfMs,
          voiceProcessingMs,
          captureLagMs,
          recognizerReadyLagMs,
          rawTranscript,
        },
        voiceProcessingMs,
      });
    },
    [clearFinalizeInterimTimeout, onValidAttemptCaptured]
  );

  // Submits the last valid interim number after `delayMs` unless something
  // newer (speech start, a final result, a new problem) cancels it first.
  const scheduleInterimFinalize = useCallback(
    (delayMs: number, via: 'speechend' | 'stable' | 'end') => {
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
          null,
          via
        );
      }, delayMs);
    },
    [clearFinalizeInterimTimeout, submitVoiceAttempt]
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

      const restartDelayMs = computeRestartDelayMs(
        isRetry ? RESTART_DELAY_MS : 0,
        getVoiceExperiments().delayMs,
        lastEndPerfRef.current === null
          ? Infinity
          : performance.now() - lastEndPerfRef.current
      );
      logVoiceDebug(
        'restart scheduled',
        `${isRetry ? 'retry' : 'initial'} in ${Math.round(restartDelayMs)}ms`
      );

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
      const ignoreSince = ignoreResultsSincePerfRef.current;
      if (ignoreSince !== null) {
        if (performance.now() - ignoreSince < LATE_RESULT_GUARD_MS) {
          logVoiceDebug('late result ignored');
          return;
        }
        ignoreResultsSincePerfRef.current = null;
      }

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
          const stableInterimMs = getVoiceExperiments().stableInterimMs;
          if (stableInterimMs !== null) {
            // Once the browser has reported the end of speech, don't wait
            // longer than the normal end-of-speech delay.
            const holdMs = couldGrowIntoLongerNumber(
              rawTranscript,
              getVoiceAnswerRange(
                currentProblemRef.current,
                optionsRef.current.operation
              )
            )
              ? stableInterimMs + GROWING_NUMBER_EXTRA_HOLD_MS
              : stableInterimMs;
            const delayMs =
              speechEndPerfRef.current !== null
                ? Math.min(holdMs, FINALIZE_INTERIM_DELAY_MS)
                : holdMs;
            scheduleInterimFinalize(delayMs, 'stable');
          }
          return;
        }

        const finalResultPerfMs = performance.now();
        lastValidInterimRef.current = null;
        submitVoiceAttempt(
          normalized.normalizedText,
          rawTranscript,
          finalResultPerfMs,
          'final'
        );
        return;
      }

      if (!event.isFinal && getVoiceExperiments().stableInterimMs !== null) {
        // The speech changed into something that is not a valid answer.
        clearFinalizeInterimTimeout();
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
    [clearFinalizeInterimTimeout, scheduleInterimFinalize, submitVoiceAttempt]
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

  // The speech-event handlers are re-created on most renders. Subscribing to
  // the recognizer is done once and calls the latest handlers through this ref,
  // so a re-render never adds another listener (which made every browser event
  // fire the handlers several times).
  const handlersRef = useRef({
    clearFinalizeInterimTimeout,
    handleError,
    handleResult,
    onSpeechStart,
    scheduleInterimFinalize,
    scheduleRestart,
  });
  useEffect(() => {
    handlersRef.current = {
      clearFinalizeInterimTimeout,
      handleError,
      handleResult,
      onSpeechStart,
      scheduleInterimFinalize,
      scheduleRestart,
    };
  });

  useEffect(() => {
    if (!platformSupported) {
      return;
    }

    const handlers = handlersRef;
    const subscriptions = [
      adapter.addListener('start', () => {
        isRecognizerRunningRef.current = true;
        recognizerStartPerfRef.current = performance.now();
        dispatch({ type: 'listeningStarted' });
      }),
      adapter.addListener('end', () => {
        lastEndPerfRef.current = performance.now();
        isRecognizerRunningRef.current = false;
        ignoreResultsSincePerfRef.current = null;

        // A valid interim number is waiting to be accepted: don't restart the
        // recognizer just to shut it down again a moment later. In ?fast mode
        // the last valid interim is accepted as soon as the recognizer ends.
        const hasValidInterim = lastValidInterimRef.current !== null;
        if (hasValidInterim && getVoiceExperiments().stableInterimMs !== null) {
          handlers.current.scheduleInterimFinalize(0, 'end');
        }
        const isAnswerPending =
          hasValidInterim && finalizeInterimTimeoutRef.current !== null;

        const shouldRetry =
          enabledRef.current &&
          shouldListenRef.current &&
          !suppressRestartRef.current &&
          !isAnswerPending;
        dispatch({ type: 'listeningEnded', shouldRetry });
        if (shouldRetry) {
          handlers.current.scheduleRestart(true);
        }
      }),
      adapter.addListener('speechstart', () => {
        const problemInstanceId = currentProblemRef.current?.problemInstanceId;
        if (!problemInstanceId) {
          return;
        }
        handlers.current.clearFinalizeInterimTimeout();
        lastValidInterimRef.current = null;
        // A new utterance: forget the previous attempt's end-of-speech time so
        // it can't be used to compute this attempt's processing time.
        speechEndPerfRef.current = null;
        const speechStartPerfMs = performance.now();
        speechStartPerfRef.current = speechStartPerfMs;
        handlers.current.onSpeechStart(problemInstanceId, speechStartPerfMs);
      }),
      adapter.addListener('speechend', () => {
        speechEndPerfRef.current = performance.now();
        handlers.current.scheduleInterimFinalize(
          FINALIZE_INTERIM_DELAY_MS,
          'speechend'
        );
      }),
      adapter.addListener('result', event => handlers.current.handleResult(event)),
      adapter.addListener('error', event => handlers.current.handleError(event)),
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
  }, [adapter, platformSupported]);

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

  // The held microphone (web) lives for the session, so it is released
  // only when the session ends, not between problems.
  useEffect(() => {
    if (!isSessionActive) {
      adapter.releaseMic?.();
    }
  }, [adapter, isSessionActive]);

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
