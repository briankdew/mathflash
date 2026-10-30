import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from 'react';
import { evaluateAnswerInput } from '../lib/answerEvaluation';
import { expoSpeechRecognitionAdapter } from '../lib/expoSpeechRecognitionAdapter';
import { MathEngine } from '../lib/MathEngine';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import { sessionPrepTimeline } from '../lib/sessionPrepTimeline';
import { getPracticeCycles } from '../lib/sessionProgression';
import { getCoreSession } from '../lib/timing/coreSession';
import { AnswerFeedback } from '../lib/timing/sessionFlow';
import {
  AnswerAttempt,
  AnswerCheckResult,
  SessionInputMode,
  SessionPhase,
  VoiceInputState,
} from '../lib/types';
import { getVoiceExperiments } from '../lib/voiceExperiments';
import {
  applyAddTestPreset,
  createInitialSessionState,
  getSessionOptionsFromState,
  sessionReducer,
} from './session/sessionState';
import type { useMathSession } from './useMathSession';

// If a hidden tab pauses animation frames, the card still gets reported.
const DRAW_FALLBACK_MS = 100;

export type SessionApi = ReturnType<typeof useMathSession> & {
  pace?: 'evaluation';
  answerFeedback?: AnswerFeedback | null;
};

// Calls back once the card is really on screen: two animation frames after the
// update, or after the first card's fade (docs/timing-core-design.md, section 5).
function afterCardDrawn(delayMs: number, onDrawn: () => void) {
  let frame = 0;
  let isDone = false;
  const finish = () => {
    if (!isDone) {
      isDone = true;
      onDrawn();
    }
  };
  const fallback = setTimeout(finish, delayMs + DRAW_FALLBACK_MS);
  const delay = setTimeout(() => {
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(finish);
    });
  }, delayMs);

  return () => {
    clearTimeout(delay);
    clearTimeout(fallback);
    cancelAnimationFrame(frame);
  };
}

function toSessionPhase(phase: string): SessionPhase {
  switch (phase) {
    case 'preparing':
      return 'preparing';
    case 'showing':
      return 'awaitingAnswer';
    case 'feedback':
      return 'feedbackPendingAdvance';
    default:
      return 'idle';
  }
}

// The session hook for ?core=2. Same shape as useMathSession, so the screen
// does not change; the flow itself lives in lib/timing/coreSession.ts.
export function useCoreSession(): SessionApi {
  const [core] = useState(getCoreSession);
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    getVoiceExperiments().addTestPreset
      ? applyAddTestPreset(createInitialSessionState())
      : createInitialSessionState()
  );
  const options = useMemo(() => getSessionOptionsFromState(state), [state]);
  const snapshot = useSyncExternalStore(core.subscribe, core.getSnapshot);
  const { flow, listening, notice, preview } = snapshot;
  const { problem, phase, isFirstCard, isDrawn } = flow;
  const problemId = problem?.problemInstanceId;
  const [isVoiceAvailable] = useState(
    () =>
      globalThis.window?.isSecureContext === true &&
      expoSpeechRecognitionAdapter.isRecognitionAvailable()
  );

  // Typed text belongs to one card, so a new card can never see the old answer.
  const [typed, setTyped] = useState({ problemId: '', value: '' });
  const typedValue = typed.problemId === problemId ? typed.value : '';
  const inputValue = state.inputMode === 'voice' ? preview : typedValue;
  const isActive = phase !== 'idle' && phase !== 'done';
  const isInputEnabled =
    (phase === 'showing' || phase === 'feedback') && (!isFirstCard || isDrawn);

  useEffect(() => {
    if (!problemId) {
      return undefined;
    }
    return afterCardDrawn(
      isFirstCard ? sessionPrepTimeline.firstProblemDissolve : 0,
      () => core.problemDrawn(problemId)
    );
  }, [core, isFirstCard, problemId]);

  const setInputMode = useCallback(
    (nextMode: SessionInputMode) => {
      if (!isActive) {
        dispatch({ type: 'setInputMode', inputMode: nextMode });
      }
    },
    [isActive]
  );

  const typeValue = useCallback(
    (value: string) => {
      if (problemId) {
        setTyped({ problemId, value });
      }
    },
    [problemId]
  );

  const appendInputDigit = useCallback(
    (digit: string) => {
      if (isInputEnabled) {
        core.keyDigit(digit);
        typeValue(typedValue + digit);
      }
    },
    [core, isInputEnabled, typeValue, typedValue]
  );

  const setInputValue = useCallback(
    (value: string) => {
      if (state.inputMode !== 'keypad' || value === typedValue) {
        return;
      }
      if (value.length > typedValue.length && /^\d+$/.test(value)) {
        core.keyDigit(value.slice(-1));
      }
      typeValue(value);
    },
    [core, state.inputMode, typeValue, typedValue]
  );

  const clearInputValue = useCallback(() => {
    core.keyClear();
    typeValue('');
  }, [core, typeValue]);

  const getPendingCount = useCallback(
    () =>
      MathEngine.getFilteredPool(options).length *
      getPracticeCycles(options.practiceCycles),
    [options]
  );

  const updateOptions = useCallback((update: SessionOptionsUpdate) => {
    dispatch({ type: 'applyOptionsUpdate', update });
  }, []);

  const startSession = useCallback(async () => {
    await core.start({ inputMode: state.inputMode, options });
  }, [core, options, state.inputMode]);

  const submitAnswerAttempt = useCallback(
    (attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult => {
      const { result } = evaluateAnswerInput({
        currentProblem: problem,
        isActive,
        attempt,
        forceComplete,
      });
      if (result !== 'incomplete') {
        core.submitKeypad(
          attempt.problemInstanceId,
          Number.parseInt(attempt.value, 10)
        );
      }
      return result;
    },
    [core, isActive, problem]
  );

  const voiceState: VoiceInputState = useMemo(
    () => ({
      platformSupported: true,
      isAvailable: isVoiceAvailable,
      permissionStatus: 'undetermined',
      isListening: listening.isListening,
      statusLabel: notice ?? listening.statusLabel,
      errorMessage: listening.errorMessage,
      transcriptPreview: preview,
      retryCount: 0,
      noSpeechCount: 0,
      noMatchCount: 0,
      ambiguousFinalCount: 0,
      processingMsTotal: 0,
      pendingAttempt: null,
    }),
    [isVoiceAvailable, listening, notice, preview]
  );

  const noop = useCallback(() => undefined, []);

  return {
    phase: toSessionPhase(phase),
    options,
    updateOptions,
    useTimer: state.globalSettings.useTimer,
    setUseTimer: (value: boolean) => dispatch({ type: 'setUseTimer', value }),
    isActive,
    isInputEnabled,
    isStadiumActive: snapshot.isStadiumActive,
    inputMode: state.inputMode,
    setInputMode,
    voiceState,
    sessionPerformanceReport: snapshot.report,
    isPerformanceReportVisible: snapshot.isReportVisible,
    inputValue,
    appendInputDigit,
    setInputValue,
    clearInputValue,
    currentProblem: problem,
    stats: flow.stats,
    totalProblems: flow.totalProblems,
    wrongAnswerCount: 0,
    getPendingCount,
    startSession,
    checkAnswer: submitAnswerAttempt,
    submitAnswerAttempt,
    submitAnswer: (forceComplete: boolean = false) =>
      submitAnswerAttempt(
        { problemInstanceId: problemId, value: inputValue, source: 'keypad' },
        forceComplete
      ),
    endSession: core.end,
    // The flow moves on by itself at this pace.
    advanceToNextProblem: noop,
    pauseVoiceInput: noop,
    resumeVoiceInput: noop,
    clearPendingVoiceAttempt: noop,
    openPerformanceReport: core.openReport,
    closePerformanceReport: core.closeReport,
    pace: 'evaluation',
    answerFeedback: flow.feedback,
  };
}
