import {
  AnswerAttempt,
  VoiceInputState,
  VoicePermissionStatus,
  VoiceSessionMetrics,
} from '../../lib/types';

export type VoiceControllerStatus =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'listening'
  | 'retrying'
  | 'captured'
  | 'error'
  | 'unavailable';

export interface VoiceControllerState {
  status: VoiceControllerStatus;
  permissionStatus: VoicePermissionStatus;
  isAvailable: boolean;
  isListening: boolean;
  statusLabel: string | null;
  errorMessage: string;
  transcriptPreview: string;
  pendingAttempt: AnswerAttempt | null;
  metrics: VoiceSessionMetrics;
}

export type VoiceMetricKey =
  | 'retryCount'
  | 'noSpeechCount'
  | 'noMatchCount'
  | 'ambiguousFinalCount';

export type VoiceControllerAction =
  | {
      type: 'availabilityResolved';
      isAvailable: boolean;
      permissionStatus: VoicePermissionStatus;
    }
  | { type: 'readyCheckStarted' }
  | { type: 'ready' }
  | { type: 'unsupported'; errorMessage: string; statusLabel?: string | null }
  | {
      type: 'permissionDenied';
      permissionStatus: VoicePermissionStatus;
      errorMessage: string;
      statusLabel: string;
    }
  | { type: 'listeningStarted' }
  | { type: 'listeningEnded'; shouldRetry: boolean }
  | { type: 'retryScheduled' }
  | { type: 'transcriptPreviewUpdated'; transcriptPreview: string }
  | {
      type: 'attemptCaptured';
      attempt: AnswerAttempt;
      voiceProcessingMs: number;
    }
  | {
      type: 'error';
      errorMessage: string;
      statusLabel: string | null;
      metricKey?: VoiceMetricKey;
      status?: VoiceControllerStatus;
    }
  | { type: 'clearPendingAttempt' }
  | { type: 'clearStatus' }
  | { type: 'resetSessionMetrics' };

const INITIAL_VOICE_METRICS: VoiceSessionMetrics = {
  retryCount: 0,
  noSpeechCount: 0,
  noMatchCount: 0,
  ambiguousFinalCount: 0,
  processingMsTotal: 0,
};

export function createInitialVoiceControllerState(
  platformSupported: boolean
): VoiceControllerState {
  return {
    status: platformSupported ? 'idle' : 'unavailable',
    permissionStatus: platformSupported ? 'undetermined' : 'unavailable',
    isAvailable: false,
    isListening: false,
    statusLabel: null,
    errorMessage: '',
    transcriptPreview: '',
    pendingAttempt: null,
    metrics: INITIAL_VOICE_METRICS,
  };
}

export function voiceControllerReducer(
  state: VoiceControllerState,
  action: VoiceControllerAction
): VoiceControllerState {
  switch (action.type) {
    case 'availabilityResolved':
      return {
        ...state,
        status:
          action.isAvailable || state.status === 'checking'
            ? state.status
            : 'unavailable',
        isAvailable: action.isAvailable,
        permissionStatus: action.permissionStatus,
      };
    case 'readyCheckStarted':
      return {
        ...state,
        status: 'checking',
      };
    case 'ready':
      return {
        ...state,
        status: 'ready',
        errorMessage: '',
        statusLabel: null,
      };
    case 'unsupported':
      return {
        ...state,
        status: 'unavailable',
        isAvailable: false,
        statusLabel: action.statusLabel ?? 'Voice unavailable',
        errorMessage: action.errorMessage,
      };
    case 'permissionDenied':
      return {
        ...state,
        status: 'error',
        permissionStatus: action.permissionStatus,
        statusLabel: action.statusLabel,
        errorMessage: action.errorMessage,
      };
    case 'listeningStarted':
      return {
        ...state,
        status: 'listening',
        isListening: true,
        statusLabel: 'Listening…',
        errorMessage: '',
      };
    case 'listeningEnded':
      return {
        ...state,
        status: action.shouldRetry ? 'retrying' : state.status,
        isListening: false,
      };
    case 'retryScheduled':
      return {
        ...state,
        status: 'retrying',
        statusLabel: 'Retrying…',
        metrics: {
          ...state.metrics,
          retryCount: state.metrics.retryCount + 1,
        },
      };
    case 'transcriptPreviewUpdated':
      return {
        ...state,
        transcriptPreview: action.transcriptPreview,
      };
    case 'attemptCaptured':
      return {
        ...state,
        status: 'captured',
        pendingAttempt: action.attempt,
        statusLabel: null,
        metrics: {
          ...state.metrics,
          processingMsTotal:
            state.metrics.processingMsTotal + action.voiceProcessingMs,
        },
      };
    case 'error':
      return {
        ...state,
        status: action.status ?? 'error',
        isListening: false,
        errorMessage: action.errorMessage,
        statusLabel: action.statusLabel,
        transcriptPreview:
          action.metricKey === 'noMatchCount' ||
          action.metricKey === 'ambiguousFinalCount'
            ? ''
            : state.transcriptPreview,
        metrics: action.metricKey
          ? {
              ...state.metrics,
              [action.metricKey]: state.metrics[action.metricKey] + 1,
            }
          : state.metrics,
      };
    case 'clearPendingAttempt':
      return {
        ...state,
        pendingAttempt: null,
      };
    case 'clearStatus':
      return {
        ...state,
        statusLabel: null,
        errorMessage: '',
      };
    case 'resetSessionMetrics':
      return {
        ...state,
        status: state.isAvailable ? 'ready' : state.status,
        isListening: false,
        statusLabel: null,
        errorMessage: '',
        transcriptPreview: '',
        pendingAttempt: null,
        metrics: INITIAL_VOICE_METRICS,
      };
    default:
      return state;
  }
}

export function buildVoiceInputState(
  platformSupported: boolean,
  state: VoiceControllerState
): VoiceInputState {
  return {
    platformSupported,
    isAvailable: state.isAvailable,
    permissionStatus: state.permissionStatus,
    isListening: state.isListening,
    statusLabel: state.statusLabel,
    errorMessage: state.errorMessage,
    transcriptPreview: state.transcriptPreview,
    retryCount: state.metrics.retryCount,
    noSpeechCount: state.metrics.noSpeechCount,
    noMatchCount: state.metrics.noMatchCount,
    ambiguousFinalCount: state.metrics.ambiguousFinalCount,
    processingMsTotal: state.metrics.processingMsTotal,
    pendingAttempt: state.pendingAttempt,
  };
}
