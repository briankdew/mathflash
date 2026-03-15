import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import {
  AnswerAttempt,
  ProblemDisplay,
  SessionOptions,
  VoiceInputState,
  VoicePermissionStatus,
  VoiceSessionMetrics,
} from '../lib/types';
import {
  buildVoiceContextualStrings,
  getVoiceAnswerRange,
  normalizeVoiceNumber,
} from '../lib/voiceNumberNormalization';

const RESTART_DELAY_MS = 220;

const INITIAL_VOICE_METRICS: VoiceSessionMetrics = {
  retryCount: 0,
  noSpeechCount: 0,
  noMatchCount: 0,
  ambiguousFinalCount: 0,
  processingMsTotal: 0,
};

interface UseVoiceAnswerInputArgs {
  enabled: boolean;
  shouldListen: boolean;
  isSessionActive: boolean;
  currentProblem: ProblemDisplay | null;
  options: SessionOptions;
  onValidAttemptCaptured: () => void;
}

interface UseVoiceAnswerInputResult {
  voiceState: VoiceInputState;
  voiceMetrics: VoiceSessionMetrics;
  ensureReadyForSession: () => Promise<boolean>;
  clearPendingAttempt: () => void;
  resetSessionMetrics: () => void;
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
  onValidAttemptCaptured,
}: UseVoiceAnswerInputArgs): UseVoiceAnswerInputResult {
  const platformSupported =
    Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';
  const isWebPlatform = Platform.OS === 'web';
  const [permissionStatus, setPermissionStatus] = useState<VoicePermissionStatus>(
    platformSupported ? 'undetermined' : 'unavailable'
  );
  const [isAvailable, setIsAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [pendingAttempt, setPendingAttempt] = useState<AnswerAttempt | null>(null);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceSessionMetrics>(INITIAL_VOICE_METRICS);

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

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    shouldListenRef.current = shouldListen;
    if (shouldListen) {
      suppressRestartRef.current = false;
    }
  }, [shouldListen]);

  useEffect(() => {
    currentProblemRef.current = currentProblem;
    speechStartPerfRef.current = null;
    speechEndPerfRef.current = null;
    setTranscriptPreview('');
    setPendingAttempt(null);
    setErrorMessage('');
    if (!shouldListen) {
      setStatusLabel(null);
    }
  }, [currentProblem, shouldListen]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimeout();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Stop can throw if recognition is not active. Ignore that case.
    }
  }, [clearRestartTimeout]);

  const refreshAvailability = useCallback(async () => {
    if (!platformSupported) {
      if (!mountedRef.current) return false;
      setPermissionStatus('unavailable');
      setIsAvailable(false);
      return false;
    }

    const isSecureWebContext = !isWebPlatform || globalThis.window?.isSecureContext === true;
    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    supportsOnDeviceRef.current = supportsOnDevice;

    const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!mountedRef.current) return available;

    setIsAvailable(available && isSecureWebContext);
    setPermissionStatus(
      permissionStatusFromResponse(permission.granted, permission.canAskAgain)
    );

    return available && isSecureWebContext;
  }, [isWebPlatform, platformSupported]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshAvailability();

    return () => {
      mountedRef.current = false;
      clearRestartTimeout();
      stopRecognition();
    };
  }, [clearRestartTimeout, refreshAvailability, stopRecognition]);

  const ensureReadyForSession = useCallback(async () => {
    if (!platformSupported) {
      if (mountedRef.current) {
        setPermissionStatus('unavailable');
        setIsAvailable(false);
        setStatusLabel('Voice unavailable');
        setErrorMessage('Voice unsupported here');
      }
      return false;
    }

    if (isWebPlatform && globalThis.window?.isSecureContext !== true) {
      if (mountedRef.current) {
        setIsAvailable(false);
        setStatusLabel('Secure origin required');
        setErrorMessage('Use localhost or HTTPS');
      }
      return false;
    }

    const available = await refreshAvailability();
    if (!available) {
      if (mountedRef.current) {
        setStatusLabel('Voice unavailable');
        setErrorMessage(
          isWebPlatform ? 'Browser speech unavailable' : 'Speech recognition unavailable'
        );
      }
      return false;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    const nextStatus = permissionStatusFromResponse(
      permission.granted,
      permission.canAskAgain
    );

    if (!mountedRef.current) {
      return permission.granted;
    }

    setPermissionStatus(nextStatus);

    if (!permission.granted) {
      setStatusLabel('Permission needed');
      setErrorMessage('Microphone permission needed');
      return false;
    }

    setErrorMessage('');
    setStatusLabel(null);
    return true;
  }, [isWebPlatform, platformSupported, refreshAvailability]);

  const scheduleRestart = useCallback((isRetry: boolean) => {
    if (!mountedRef.current || restartTimeoutRef.current) {
      return;
    }

    if (isRetry) {
      setVoiceMetrics(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
      setStatusLabel('Retrying…');
    }

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
          setErrorMessage('');
          const range = getVoiceAnswerRange(
            currentProblemRef.current,
            optionsRef.current.operation
          );

          ExpoSpeechRecognitionModule.start({
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
          setStatusLabel('Voice unavailable');
          setErrorMessage('Unable to start voice input');
        }
      });
    }, RESTART_DELAY_MS);
  }, [ensureReadyForSession]);

  const handleResult = useCallback(
    (event: ExpoSpeechRecognitionResultEvent) => {
      const rawTranscript = event.results[0]?.transcript?.trim() ?? '';
      if (!rawTranscript || !currentProblemRef.current) {
        return;
      }

      const range = getVoiceAnswerRange(
        currentProblemRef.current,
        optionsRef.current.operation
      );
      const normalized = normalizeVoiceNumber(rawTranscript, range);

      if (normalized.kind === 'valid') {
        setTranscriptPreview(normalized.normalizedText);
        setErrorMessage('');

        if (!event.isFinal) {
          return;
        }

        const finalResultPerfMs = performance.now();
        const speechEndPerfMs = speechEndPerfRef.current ?? finalResultPerfMs;
        const voiceProcessingMs = Math.max(0, finalResultPerfMs - speechEndPerfMs);

        suppressRestartRef.current = true;
        shouldListenRef.current = false;
        onValidAttemptCaptured();
        setStatusLabel(null);
        setPendingAttempt({
          value: normalized.normalizedText,
          source: 'voice',
          completedAtPerfMs: speechEndPerfMs,
          speechStartPerfMs: speechStartPerfRef.current,
          speechEndPerfMs,
          finalResultPerfMs,
          voiceProcessingMs,
          rawTranscript,
        });
        setVoiceMetrics(prev => ({
          ...prev,
          processingMsTotal: prev.processingMsTotal + voiceProcessingMs,
        }));
        return;
      }

      if (event.isFinal) {
        setTranscriptPreview('');
        setErrorMessage('Say a number only');
        setStatusLabel('Retrying…');
        setVoiceMetrics(prev => ({
          ...prev,
          ambiguousFinalCount: prev.ambiguousFinalCount + 1,
        }));
      }
    },
    [onValidAttemptCaptured]
  );

  const handleError = useCallback((event: ExpoSpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted' || event.error === 'busy') {
      return;
    }

    setIsListening(false);
    setErrorMessage(getVoiceErrorMessage(event));
    setStatusLabel(getVoiceErrorMessage(event));

    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      setVoiceMetrics(prev => ({ ...prev, noSpeechCount: prev.noSpeechCount + 1 }));
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
      ExpoSpeechRecognitionModule.addListener('start', () => {
        setIsListening(true);
        setStatusLabel('Listening…');
        setErrorMessage('');
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        setIsListening(false);
        if (
          enabledRef.current &&
          shouldListenRef.current &&
          !suppressRestartRef.current
        ) {
          scheduleRestart(true);
        }
      }),
      ExpoSpeechRecognitionModule.addListener('speechstart', () => {
        speechStartPerfRef.current = performance.now();
      }),
      ExpoSpeechRecognitionModule.addListener('speechend', () => {
        speechEndPerfRef.current = performance.now();
      }),
      ExpoSpeechRecognitionModule.addListener('result', handleResult),
      ExpoSpeechRecognitionModule.addListener('error', handleError),
      ExpoSpeechRecognitionModule.addListener('nomatch', () => {
        setTranscriptPreview('');
        setErrorMessage('Say a number only');
        setStatusLabel('Retrying…');
        setVoiceMetrics(prev => ({ ...prev, noMatchCount: prev.noMatchCount + 1 }));
      }),
    ];

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [handleError, handleResult, platformSupported, scheduleRestart]);

  useEffect(() => {
    if (!enabled || !shouldListen || !isSessionActive || !currentProblem) {
      if (!shouldListen) {
        suppressRestartRef.current = true;
      }
      stopRecognition();
      if (!isSessionActive) {
        setStatusLabel(null);
        setTranscriptPreview('');
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
    setPendingAttempt(null);
  }, []);

  const resetSessionMetrics = useCallback(() => {
    setVoiceMetrics(INITIAL_VOICE_METRICS);
    setTranscriptPreview('');
    setPendingAttempt(null);
    setErrorMessage('');
    setStatusLabel(null);
    speechStartPerfRef.current = null;
    speechEndPerfRef.current = null;
    suppressRestartRef.current = false;
  }, []);

  const voiceState = useMemo<VoiceInputState>(
    () => ({
      platformSupported,
      isAvailable,
      permissionStatus,
      isListening,
      statusLabel,
      errorMessage,
      transcriptPreview,
      retryCount: voiceMetrics.retryCount,
      noSpeechCount: voiceMetrics.noSpeechCount,
      noMatchCount: voiceMetrics.noMatchCount,
      ambiguousFinalCount: voiceMetrics.ambiguousFinalCount,
      processingMsTotal: voiceMetrics.processingMsTotal,
      pendingAttempt,
    }),
    [
      errorMessage,
      isAvailable,
      isListening,
      pendingAttempt,
      permissionStatus,
      platformSupported,
      statusLabel,
      transcriptPreview,
      voiceMetrics,
    ]
  );

  return {
    voiceState,
    voiceMetrics,
    ensureReadyForSession,
    clearPendingAttempt,
    resetSessionMetrics,
  };
}
