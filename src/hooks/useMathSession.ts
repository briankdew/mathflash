import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { MathEngine } from '../lib/MathEngine';
import { saveLogToCloud } from '../lib/CloudSync';
import { evaluateAnswerInput } from '../lib/answerEvaluation';
import { getSessionPrepSchedule } from '../lib/sessionPrepTimeline';
import {
  createProblemDisplay,
  createSessionQueue,
  getPracticeCycles,
  resolveNextProblem,
} from '../lib/sessionProgression';
import {
  appendMissedProblem,
  recordCorrectAnswer,
  recordWrongAnswer,
} from '../lib/sessionStats';
import { buildSessionLogPayload } from '../lib/sessionTelemetry';
import { buildSessionPerformanceReport } from '../lib/sessionPerformance';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import {
  AnswerAttempt,
  AnswerCheckResult,
  ProblemDisplay,
  ProblemSpec,
  SessionInputMode,
  SessionProblemPerformance,
  SessionPhase,
} from '../lib/types';
import { useSessionInput } from './session/useSessionInput';
import { useVoiceAnswerInput } from './useVoiceAnswerInput';
import {
  createInitialSessionState,
  getSessionOptionsFromState,
  sessionReducer,
} from './session/sessionState';
import {
  createSessionPerformanceRow,
  finalizeSessionPerformanceRows,
  getPerformanceFirstDigitPerfMs,
  recordPerformanceAttempt,
  recordPerformanceInputOnset,
} from './session/sessionPerformanceTracker';

function generateSessionId() {
  return `mf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isDigitInputValue(value: string): boolean {
  return /^\d+$/.test(value);
}

export function useMathSession() {
  const [state, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createInitialSessionState
  );
  const options = useMemo(() => getSessionOptionsFromState(state), [state]);
  const {
    inputValue,
    appendInputDigit: appendInputDigitInternal,
    setInputValue: setInputValueInternal,
    clearInputValue,
    resetInputValue,
  } = useSessionInput(state.isInputEnabled);

  const metrics = useRef({
    cyclesRemaining: 0,
    wrongAnswerCount: 0,
    isFirstTry: true,
    sessionCompletionMsTotal: 0,
  });
  const prepTimeouts = useRef<{
    stadiumHide: ReturnType<typeof setTimeout> | null;
    firstProblem: ReturnType<typeof setTimeout> | null;
    timerStartDelay: ReturnType<typeof setTimeout> | null;
    inputUnlock: ReturnType<typeof setTimeout> | null;
  }>({
    stadiumHide: null,
    firstProblem: null,
    timerStartDelay: null,
    inputUnlock: null,
  });
  const performanceRowsRef = useRef<SessionProblemPerformance[]>([]);
  const queueRef = useRef<ProblemSpec[]>([]);
  const optionsRef = useRef(options);
  const sessionIdRef = useRef(state.sessionId);
  const problemCounterRef = useRef(0);
  const endSessionRef = useRef<() => void>(() => {});

  const updatePerformanceRows = useCallback(
    (
      updater: (
        rows: SessionProblemPerformance[]
      ) => SessionProblemPerformance[]
    ) => {
      performanceRowsRef.current = updater(performanceRowsRef.current);
      return performanceRowsRef.current;
    },
    []
  );

  const beginProblemPerformance = useCallback(
    (problem: ProblemDisplay) => {
      const nextRow = createSessionPerformanceRow(
        problem,
        state.inputMode,
        options.operation
      );
      if (!nextRow) {
        return;
      }

      updatePerformanceRows(prev => [...prev, nextRow]);
    },
    [options.operation, state.inputMode, updatePerformanceRows]
  );

  const recordInputOnset = useCallback(
    (problemInstanceId: string | undefined, perfMs: number) => {
      updatePerformanceRows(prev =>
        recordPerformanceInputOnset(prev, problemInstanceId, 'first_digit', perfMs)
      );
    },
    [updatePerformanceRows]
  );

  const recordSpeechInputOnset = useCallback(
    (problemInstanceId: string | undefined, perfMs: number) => {
      updatePerformanceRows(prev =>
        recordPerformanceInputOnset(prev, problemInstanceId, 'speechstart', perfMs)
      );
    },
    [updatePerformanceRows]
  );

  const recordAttempt = useCallback(
    (
      problemInstanceId: string | undefined,
      attempt: AnswerAttempt,
      result: Exclude<AnswerCheckResult, 'incomplete'>
    ) => {
      updatePerformanceRows(prev =>
        recordPerformanceAttempt(prev, problemInstanceId, attempt, result)
      );
    },
    [updatePerformanceRows]
  );

  const finalizePerformanceRows = useCallback(
    (wasReset: boolean) => {
      const finalizedRows = finalizeSessionPerformanceRows(
        performanceRowsRef.current,
        wasReset
      );
      performanceRowsRef.current = finalizedRows;
      return finalizedRows;
    },
    []
  );

  const clearPrepTimeouts = useCallback(() => {
    if (prepTimeouts.current.stadiumHide) {
      clearTimeout(prepTimeouts.current.stadiumHide);
      prepTimeouts.current.stadiumHide = null;
    }
    if (prepTimeouts.current.firstProblem) {
      clearTimeout(prepTimeouts.current.firstProblem);
      prepTimeouts.current.firstProblem = null;
    }
    if (prepTimeouts.current.timerStartDelay) {
      clearTimeout(prepTimeouts.current.timerStartDelay);
      prepTimeouts.current.timerStartDelay = null;
    }
    if (prepTimeouts.current.inputUnlock) {
      clearTimeout(prepTimeouts.current.inputUnlock);
      prepTimeouts.current.inputUnlock = null;
    }
  }, []);

  useEffect(() => clearPrepTimeouts, [clearPrepTimeouts]);

  useEffect(() => {
    queueRef.current = state.queue;
  }, [state.queue]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);

  const setCurrentProblem = useCallback(
    (problemSpec: ProblemSpec, phase: SessionPhase = 'awaitingAnswer') => {
      metrics.current.isFirstTry = true;
      metrics.current.wrongAnswerCount = 0;
      const problemDisplay = createProblemDisplay(problemSpec, optionsRef.current);
      const problemIndex = problemCounterRef.current + 1;
      problemCounterRef.current = problemIndex;
      problemDisplay.problemIndex = problemIndex;
      problemDisplay.problemInstanceId = `${sessionIdRef.current || 'mf'}-p${problemIndex}`;
      beginProblemPerformance(problemDisplay);
      dispatch({
        type: 'setCurrentProblem',
        problem: problemDisplay,
        phase,
      });
    },
    [beginProblemPerformance]
  );

  const advanceProblem = useCallback(
    (
      currentQueue: ProblemSpec[],
      remainingCycles: number,
      nextPhase: SessionPhase = 'awaitingAnswer'
    ) => {
      const resolution = resolveNextProblem(
        currentQueue,
        remainingCycles,
        optionsRef.current
      );

      if (resolution.type === 'end') {
        endSessionRef.current();
        return;
      }

      metrics.current.cyclesRemaining = resolution.cyclesRemaining;
      queueRef.current = resolution.queue;
      dispatch({ type: 'setQueue', queue: resolution.queue });
      setCurrentProblem(resolution.problem, nextPhase);
    },
    [setCurrentProblem]
  );

  const {
    voiceState,
    voiceMetrics,
    ensureReadyForSession,
    clearPendingAttempt,
    resetSessionMetrics,
  } = useVoiceAnswerInput({
    enabled: state.inputMode === 'voice',
    shouldListen:
      state.inputMode === 'voice' &&
      state.isActive &&
      state.isInputEnabled &&
      state.phase === 'awaitingAnswer' &&
      state.voiceListeningArmed &&
      state.currentProblem !== null,
    isSessionActive: state.isActive,
    currentProblem: state.currentProblem,
    options,
    onSpeechStart: (problemInstanceId, speechStartPerfMs) => {
      recordSpeechInputOnset(problemInstanceId, speechStartPerfMs);
    },
    onValidAttemptCaptured: () => {
      dispatch({ type: 'setVoiceListeningArmed', value: false });
    },
  });

  useEffect(() => {
    if (state.inputMode !== 'voice') {
      return;
    }

    setInputValueInternal(voiceState.transcriptPreview);
  }, [setInputValueInternal, state.inputMode, voiceState.transcriptPreview]);

  useEffect(() => {
    const shouldArmVoice =
      state.inputMode === 'voice' &&
      state.isActive &&
      state.isInputEnabled &&
      state.phase === 'awaitingAnswer' &&
      !!state.currentProblem;

    dispatch({ type: 'setVoiceListeningArmed', value: shouldArmVoice });
  }, [
    state.currentProblem,
    state.inputMode,
    state.isActive,
    state.isInputEnabled,
    state.phase,
  ]);

  const setInputMode = useCallback(
    (nextMode: SessionInputMode) => {
      if (state.isActive) {
        return;
      }

      dispatch({ type: 'setInputMode', inputMode: nextMode });
      resetInputValue();
    },
    [resetInputValue, state.isActive]
  );

  const appendInputDigit = useCallback(
    (digit: string) => {
      if (!state.isInputEnabled) return;

      const nextValue = inputValue + digit;
      if (
        state.inputMode === 'keypad' &&
        inputValue === '' &&
        isDigitInputValue(nextValue)
      ) {
        recordInputOnset(state.currentProblem?.problemInstanceId, performance.now());
      }

      appendInputDigitInternal(digit);
    },
    [
      appendInputDigitInternal,
      inputValue,
      recordInputOnset,
      state.currentProblem,
      state.inputMode,
      state.isInputEnabled,
    ]
  );

  const setInputValue = useCallback(
    (value: string) => {
      if (
        state.inputMode === 'keypad' &&
        inputValue === '' &&
        isDigitInputValue(value)
      ) {
        recordInputOnset(state.currentProblem?.problemInstanceId, performance.now());
      }

      setInputValueInternal(value);
    },
    [
      inputValue,
      recordInputOnset,
      setInputValueInternal,
      state.currentProblem,
      state.inputMode,
    ]
  );

  const getPendingCount = useCallback(() => {
    const pool = MathEngine.getFilteredPool(options);
    const cycles = getPracticeCycles(options.practiceCycles);
    return pool.length * cycles;
  }, [options]);

  const updateOptions = useCallback(
    (update: SessionOptionsUpdate) => {
      dispatch({ type: 'applyOptionsUpdate', update });
    },
    []
  );

  const startSession = useCallback(async () => {
    clearPrepTimeouts();

    if (state.inputMode === 'voice') {
      const isVoiceReady = await ensureReadyForSession();
      if (!isVoiceReady) {
        return;
      }
    }

    const basePool = MathEngine.getFilteredPool(options);
    if (basePool.length === 0) {
      console.warn('No Problem Set Selected');
      return;
    }

    const { initialQueue, cyclesRemaining, totalProblems } = createSessionQueue(
      basePool,
      optionsRef.current
    );
    const prepSchedule = getSessionPrepSchedule(options.startMode);
    const nextSessionId = generateSessionId();

    queueRef.current = initialQueue;
    metrics.current.cyclesRemaining = cyclesRemaining;
    metrics.current.sessionCompletionMsTotal = 0;
    problemCounterRef.current = 0;
    performanceRowsRef.current = [];
    dispatch({
      type: 'prepareSession',
      sessionId: nextSessionId,
      sessionStart: new Date(),
      queue: initialQueue,
      totalProblems,
    });
    resetInputValue();
    resetSessionMetrics();

    prepTimeouts.current.stadiumHide = setTimeout(() => {
      dispatch({ type: 'setIsStadiumActive', value: false });
      prepTimeouts.current.stadiumHide = null;
    }, prepSchedule.stadiumHideAtMs);

    prepTimeouts.current.firstProblem = setTimeout(() => {
      if (state.inputMode === 'voice') {
        advanceProblem(initialQueue, cyclesRemaining, 'awaitingAnswer');
        dispatch({ type: 'setIsInputEnabled', value: true });
      } else {
        advanceProblem(initialQueue, cyclesRemaining, 'revealingProblem');
        prepTimeouts.current.timerStartDelay = setTimeout(() => {
          prepTimeouts.current.timerStartDelay = null;
        }, prepSchedule.timerStartDelayMs);
        prepTimeouts.current.inputUnlock = setTimeout(() => {
          dispatch({ type: 'setIsInputEnabled', value: true });
          dispatch({ type: 'setPhase', phase: 'awaitingAnswer' });
          prepTimeouts.current.inputUnlock = null;
        }, prepSchedule.inputUnlockDelayMs);
      }

      prepTimeouts.current.firstProblem = null;
    }, prepSchedule.firstProblemAtMs);
  }, [
    advanceProblem,
    clearPrepTimeouts,
    ensureReadyForSession,
    options,
    resetInputValue,
    resetSessionMetrics,
    state.inputMode,
  ]);

  const checkAnswer = useCallback(
    (attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult => {
      const problemInstanceId =
        attempt.problemInstanceId ?? state.currentProblem?.problemInstanceId;
      const normalizedAttempt: AnswerAttempt = {
        ...attempt,
        problemInstanceId,
        completedAtPerfMs: attempt.completedAtPerfMs ?? performance.now(),
        firstDigitPerfMs:
          attempt.source === 'keypad'
            ? attempt.firstDigitPerfMs ??
              getPerformanceFirstDigitPerfMs(
                performanceRowsRef.current,
                problemInstanceId
              )
            : attempt.firstDigitPerfMs ?? null,
      };
      const evaluation = evaluateAnswerInput({
        currentProblem: state.currentProblem,
        isActive: state.isActive,
        attempt: normalizedAttempt,
        forceComplete,
      });

      if (evaluation.result === 'incomplete') {
        return evaluation.result;
      }

      recordAttempt(problemInstanceId, normalizedAttempt, evaluation.result);

      if (evaluation.result === 'correct') {
        metrics.current.sessionCompletionMsTotal += evaluation.attemptMs ?? 0;
        dispatch({ type: 'setPhase', phase: 'feedbackPendingAdvance' });
        dispatch({
          type: 'setStats',
          stats: recordCorrectAnswer(state.stats, metrics.current.isFirstTry),
        });
        return 'correct';
      }

      const wasFirstTry = metrics.current.isFirstTry;
      if (wasFirstTry) {
        dispatch({
          type: 'setStats',
          stats: recordWrongAnswer(state.stats, wasFirstTry),
        });
        metrics.current.isFirstTry = false;
      }

      metrics.current.wrongAnswerCount += 1;

      if (state.currentProblem) {
        dispatch({
          type: 'setMissedProblems',
          missedProblems: appendMissedProblem(
            state.missedProblems,
            state.currentProblem,
            attempt.value,
            options.operation
          ),
        });
      }

      return 'wrong';
    },
    [
      options.operation,
      recordAttempt,
      state.currentProblem,
      state.isActive,
      state.missedProblems,
      state.stats,
    ]
  );

  const submitAnswerAttempt = useCallback(
    (attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult =>
      checkAnswer(attempt, forceComplete),
    [checkAnswer]
  );

  const submitAnswer = useCallback(
    (forceComplete: boolean = false): AnswerCheckResult =>
      submitAnswerAttempt(
        {
          problemInstanceId: state.currentProblem?.problemInstanceId,
          value: inputValue,
          source: 'keypad',
        },
        forceComplete
      ),
    [inputValue, state.currentProblem, submitAnswerAttempt]
  );

  const endSession = useCallback(() => {
    clearPrepTimeouts();
    if (!state.isActive) return;

    const wasReset = state.stats.completed < state.totalProblems;
    const finalizedRows = finalizePerformanceRows(wasReset);
    const performanceReport = buildSessionPerformanceReport(
      state.inputMode,
      finalizedRows
    );

    void saveLogToCloud(
      buildSessionLogPayload({
        options,
        sessionId: state.sessionId,
        sessionStart: state.sessionStart,
        stats: state.stats,
        totalProblems: state.totalProblems,
        useTimer: state.globalSettings.useTimer,
        sessionCompletionMsTotal: metrics.current.sessionCompletionMsTotal,
        inputMode: state.inputMode,
        voiceMetrics,
        sessionPerformanceReport: performanceReport,
      })
    );

    resetInputValue();
    queueRef.current = [];
    dispatch({
      type: 'completeSession',
      report: performanceReport,
      showPerformanceReport:
        options.autoShowPerformanceReport && performanceReport.problems.length > 0,
    });
  }, [
    clearPrepTimeouts,
    finalizePerformanceRows,
    options,
    resetInputValue,
    state.globalSettings.useTimer,
    state.inputMode,
    state.isActive,
    state.sessionId,
    state.sessionStart,
    state.stats,
    state.totalProblems,
    voiceMetrics,
  ]);

  useEffect(() => {
    endSessionRef.current = endSession;
  }, [endSession]);

  const advanceToNextProblem = useCallback(() => {
    advanceProblem(queueRef.current, metrics.current.cyclesRemaining);
  }, [advanceProblem]);

  return {
    phase: state.phase,
    options,
    updateOptions,
    useTimer: state.globalSettings.useTimer,
    setUseTimer: (value: boolean) => dispatch({ type: 'setUseTimer', value }),
    isActive: state.isActive,
    isInputEnabled: state.isInputEnabled,
    isStadiumActive: state.isStadiumActive,
    inputMode: state.inputMode,
    setInputMode,
    voiceState,
    sessionPerformanceReport: state.sessionPerformanceReport,
    isPerformanceReportVisible: state.isPerformanceReportVisible,
    inputValue,
    appendInputDigit,
    setInputValue,
    clearInputValue,
    currentProblem: state.currentProblem,
    stats: state.stats,
    totalProblems: state.totalProblems,
    wrongAnswerCount: metrics.current.wrongAnswerCount,
    getPendingCount,
    startSession,
    checkAnswer,
    submitAnswerAttempt,
    submitAnswer,
    endSession,
    advanceToNextProblem,
    pauseVoiceInput: () =>
      dispatch({ type: 'setVoiceListeningArmed', value: false }),
    resumeVoiceInput: () =>
      dispatch({ type: 'setVoiceListeningArmed', value: true }),
    clearPendingVoiceAttempt: clearPendingAttempt,
    openPerformanceReport: () => dispatch({ type: 'openPerformanceReport' }),
    closePerformanceReport: () => dispatch({ type: 'closePerformanceReport' }),
  };
}
