import { useState, useCallback, useEffect, useRef } from 'react';
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
import {
    applySessionOptionsUpdate,
    defaultOperationSettings,
    getSessionOptions,
    GlobalSessionSettings,
    SettingsByOperation,
    SessionOptionsUpdate,
} from '../lib/sessionOptions';
import {
    AnswerAttempt,
    AnswerCheckResult,
    OperationMode,
    ProblemSpec,
    ProblemDisplay,
    ResponseOnsetSource,
    SessionPerformanceReport,
    SessionProblemOutcome,
    SessionProblemPerformance,
    SessionInputMode,
    SessionStats,
    MissedProblem,
    SessionPhase,
    SessionOptions,
} from '../lib/types';
import { useSessionInput } from './session/useSessionInput';
import { useVoiceAnswerInput } from './useVoiceAnswerInput';

// Fallback UUID generation
function generateSessionId() {
    return 'mf-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function isDigitInputValue(value: string): boolean {
    return /^\d+$/.test(value);
}

export function useMathSession() {
    const [operation, setOperation] = useState<OperationMode>('addsub');
    const [settingsByOperation, setSettingsByOperation] = useState<SettingsByOperation>({
        addsub: defaultOperationSettings(),
        multdiv: defaultOperationSettings(),
    });
    const [globalSettings, setGlobalSettings] = useState<GlobalSessionSettings>({
        useTimer: true,
        startMode: 'min',
        autoShowPerformanceReport: false,
    });

    const options: SessionOptions = getSessionOptions(operation, settingsByOperation, globalSettings);
    const useTimer = globalSettings.useTimer;
    const setUseTimer = (val: boolean) => {
        setGlobalSettings(prev => ({ ...prev, useTimer: val }));
    };

    // Session State
    const [phase, setPhase] = useState<SessionPhase>('idle');
    const [isActive, setIsActive] = useState(false);
    const [isInputEnabled, setIsInputEnabled] = useState(false);
    const [isStadiumActive, setIsStadiumActive] = useState(true);
    const [inputMode, setInputModeState] = useState<SessionInputMode>('keypad');
    const [voiceListeningArmed, setVoiceListeningArmedState] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [sessionStart, setSessionStart] = useState<Date | null>(null);

    const [queue, setQueue] = useState<ProblemSpec[]>([]);
    const [currentProblem, setCurrentProblem] = useState<ProblemDisplay | null>(null);

    const [stats, setStats] = useState<SessionStats>({ completed: 0, correctFirst: 0, missedFirst: 0 });
    const [missedProblems, setMissedProblems] = useState<MissedProblem[]>([]);
    const [totalProblems, setTotalProblems] = useState(0);
    const [sessionPerformanceRows, setSessionPerformanceRows] = useState<SessionProblemPerformance[]>([]);
    const [sessionPerformanceReport, setSessionPerformanceReport] = useState<SessionPerformanceReport | null>(null);
    const [isPerformanceReportVisible, setIsPerformanceReportVisible] = useState(false);

    // Internal Tracking (Refs prevent redundant re-renders during rapid inputs)
    const metrics = useRef({
        cyclesRemaining: 0,
        wrongAnswerCount: 0,
        isFirstTry: true,
        sessionCompletionMsTotal: 0
    });

    const timerStart = useRef(0);
    const {
        inputValue,
        appendInputDigit: appendInputDigitInternal,
        setInputValue: setInputValueInternal,
        clearInputValue,
        resetInputValue,
    } = useSessionInput(isInputEnabled);
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
    const sessionIdRef = useRef('');
    const problemCounterRef = useRef(0);
    const queueRef = useRef<ProblemSpec[]>([]);
    const optionsRef = useRef(options);
    const beginProblemPerformanceRef = useRef<(problem: ProblemDisplay) => void>(() => {});
    const endSessionRef = useRef<() => void>(() => {});

    const updatePerformanceRows = useCallback((
        updater: (rows: SessionProblemPerformance[]) => SessionProblemPerformance[]
    ) => {
        setSessionPerformanceRows(prev => {
            const next = updater(prev);
            performanceRowsRef.current = next;
            return next;
        });
    }, []);

    const closePerformanceReport = useCallback(() => {
        setIsPerformanceReportVisible(false);
    }, []);

    const openPerformanceReport = useCallback(() => {
        if (sessionPerformanceReport) {
            setIsPerformanceReportVisible(true);
        }
    }, [sessionPerformanceReport]);

    const beginProblemPerformance = useCallback((problem: ProblemDisplay) => {
        if (!problem.problemInstanceId || problem.presentedAtPerf === undefined || problem.problemIndex === undefined) {
            return;
        }

        const nextRow: SessionProblemPerformance = {
            problemInstanceId: problem.problemInstanceId,
            problemIndex: problem.problemIndex,
            inputMode,
            operation: options.operation,
            left: problem.left,
            right: problem.right,
            result: problem.result,
            missing: problem.missing,
            correct: problem.correct,
            presentedAtPerfMs: problem.presentedAtPerf,
            firstInputOnsetPerfMs: null,
            responseOnsetLatencyMs: null,
            onsetSource: 'none',
            firstAttemptCompletedAtPerfMs: null,
            completionLatencyMs: null,
            outcome: 'no_input',
            attemptCount: 0,
            isResolved: false,
            submittedValues: [],
            voiceDiagnostics: {
                speechStartPerfMs: null,
                speechEndPerfMs: null,
                finalResultPerfMs: null,
                voiceProcessingMs: null,
                transcript: null,
            },
            keypadDiagnostics: {
                firstDigitPerfMs: null,
            },
        };

        updatePerformanceRows(prev => [...prev, nextRow]);
    }, [inputMode, options.operation, updatePerformanceRows]);

    const recordInputOnset = useCallback((
        problemInstanceId: string | undefined,
        onsetSource: ResponseOnsetSource,
        perfMs: number
    ) => {
        if (!problemInstanceId) {
            return;
        }

        updatePerformanceRows(prev => prev.map(row => {
            if (row.problemInstanceId !== problemInstanceId || row.firstInputOnsetPerfMs !== null) {
                return row;
            }

            return {
                ...row,
                firstInputOnsetPerfMs: perfMs,
                responseOnsetLatencyMs: Math.max(0, perfMs - row.presentedAtPerfMs),
                onsetSource,
                voiceDiagnostics: onsetSource === 'speechstart'
                    ? { ...row.voiceDiagnostics, speechStartPerfMs: perfMs }
                    : row.voiceDiagnostics,
                keypadDiagnostics: onsetSource === 'first_digit'
                    ? { ...row.keypadDiagnostics, firstDigitPerfMs: perfMs }
                    : row.keypadDiagnostics,
            };
        }));
    }, [updatePerformanceRows]);

    const recordAttemptPerformance = useCallback((
        problemInstanceId: string | undefined,
        attempt: AnswerAttempt,
        result: Exclude<AnswerCheckResult, 'incomplete'>
    ) => {
        if (!problemInstanceId) {
            return;
        }

        const completedAtPerfMs = attempt.completedAtPerfMs ?? performance.now();

        updatePerformanceRows(prev => prev.map(row => {
            if (row.problemInstanceId !== problemInstanceId) {
                return row;
            }

            const nextAttemptCount = row.attemptCount + 1;
            const isCorrectFirstTry = result === 'correct' && row.attemptCount === 0;
            const outcome: SessionProblemOutcome =
                result === 'correct'
                    ? (isCorrectFirstTry ? 'correct_first_try' : 'wrong_then_correct')
                    : 'wrong_only';

            return {
                ...row,
                firstAttemptCompletedAtPerfMs:
                    row.firstAttemptCompletedAtPerfMs ?? completedAtPerfMs,
                completionLatencyMs:
                    row.completionLatencyMs ?? Math.max(0, completedAtPerfMs - row.presentedAtPerfMs),
                attemptCount: nextAttemptCount,
                outcome,
                isResolved: result === 'correct',
                submittedValues: [...row.submittedValues, attempt.value],
                voiceDiagnostics: attempt.source === 'voice'
                    ? {
                        speechStartPerfMs:
                            row.voiceDiagnostics.speechStartPerfMs ?? attempt.speechStartPerfMs ?? null,
                        speechEndPerfMs: attempt.speechEndPerfMs ?? row.voiceDiagnostics.speechEndPerfMs,
                        finalResultPerfMs: attempt.finalResultPerfMs ?? row.voiceDiagnostics.finalResultPerfMs,
                        voiceProcessingMs: attempt.voiceProcessingMs ?? row.voiceDiagnostics.voiceProcessingMs,
                        transcript: attempt.rawTranscript ?? row.voiceDiagnostics.transcript,
                    }
                    : row.voiceDiagnostics,
                keypadDiagnostics: attempt.source === 'keypad'
                    ? {
                        firstDigitPerfMs:
                            row.keypadDiagnostics.firstDigitPerfMs ?? attempt.firstDigitPerfMs ?? null,
                    }
                    : row.keypadDiagnostics,
            };
        }));
    }, [updatePerformanceRows]);

    const getCurrentProblemFirstDigitPerfMs = useCallback((problemInstanceId: string | undefined) => {
        if (!problemInstanceId) {
            return null;
        }

        const activeRow = performanceRowsRef.current.find(
            row => row.problemInstanceId === problemInstanceId
        );

        return activeRow?.keypadDiagnostics.firstDigitPerfMs ?? null;
    }, []);

    const finalizePerformanceRows = useCallback((wasReset: boolean) => {
        let finalizedRows: SessionProblemPerformance[] = performanceRowsRef.current;

        updatePerformanceRows(prev => {
            finalizedRows = prev.map(row => {
                if (row.isResolved) {
                    return row;
                }

                if (row.attemptCount > 0) {
                    return {
                        ...row,
                        outcome: 'wrong_only',
                        isResolved: true,
                    };
                }

                return {
                    ...row,
                    outcome:
                        wasReset && row.firstInputOnsetPerfMs !== null
                            ? 'reset_incomplete'
                            : 'no_input',
                    isResolved: true,
                };
            });

            return finalizedRows;
        });

        return finalizedRows;
    }, [updatePerformanceRows]);
    const setVoiceListeningArmed = useCallback((value: boolean) => {
        setVoiceListeningArmedState(value);
    }, []);

    const setInputMode = useCallback((nextMode: SessionInputMode) => {
        if (isActive) return;
        setInputModeState(nextMode);
        setVoiceListeningArmed(false);
        resetInputValue();
    }, [isActive, resetInputValue, setVoiceListeningArmed]);

    const {
        voiceState,
        voiceMetrics,
        ensureReadyForSession,
        clearPendingAttempt,
        resetSessionMetrics,
    } = useVoiceAnswerInput({
        enabled: inputMode === 'voice',
        shouldListen:
            inputMode === 'voice' &&
            isActive &&
            isInputEnabled &&
            phase === 'awaitingAnswer' &&
            voiceListeningArmed &&
            currentProblem !== null,
        isSessionActive: isActive,
        currentProblem,
        options,
        onSpeechStart: (problemInstanceId, speechStartPerfMs) => {
            recordInputOnset(problemInstanceId, 'speechstart', speechStartPerfMs);
        },
        onValidAttemptCaptured: () => {
            setVoiceListeningArmed(false);
        },
    });

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

    useEffect(() => {
        return () => {
            clearPrepTimeouts();
        };
    }, [clearPrepTimeouts]);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        beginProblemPerformanceRef.current = beginProblemPerformance;
    }, [beginProblemPerformance]);

    useEffect(() => {
        if (inputMode !== 'voice') {
            return;
        }

        setInputValueInternal(voiceState.transcriptPreview);
    }, [inputMode, setInputValueInternal, voiceState.transcriptPreview]);

    useEffect(() => {
        if (
            inputMode === 'voice' &&
            isActive &&
            isInputEnabled &&
            phase === 'awaitingAnswer' &&
            currentProblem
        ) {
            setVoiceListeningArmed(true);
            return;
        }

        setVoiceListeningArmed(false);
    }, [
        currentProblem,
        inputMode,
        isActive,
        isInputEnabled,
        phase,
        setVoiceListeningArmed,
    ]);

    const appendInputDigit = useCallback((digit: string) => {
        if (!isInputEnabled) return;

        const nextValue = inputValue + digit;
        if (
            inputMode === 'keypad' &&
            inputValue === '' &&
            isDigitInputValue(nextValue)
        ) {
            recordInputOnset(currentProblem?.problemInstanceId, 'first_digit', performance.now());
        }

        appendInputDigitInternal(digit);
    }, [
        appendInputDigitInternal,
        currentProblem?.problemInstanceId,
        inputMode,
        inputValue,
        isInputEnabled,
        recordInputOnset,
    ]);

    const setInputValue = useCallback((value: string) => {
        if (
            inputMode === 'keypad' &&
            inputValue === '' &&
            isDigitInputValue(value)
        ) {
            recordInputOnset(currentProblem?.problemInstanceId, 'first_digit', performance.now());
        }

        setInputValueInternal(value);
    }, [
        currentProblem?.problemInstanceId,
        inputMode,
        inputValue,
        recordInputOnset,
        setInputValueInternal,
    ]);

    // Derived Values
    const getPendingCount = useCallback(() => {
        const pool = MathEngine.getFilteredPool(options);
        const cycles = getPracticeCycles(options.practiceCycles);
        return pool.length * cycles;
    }, [options]);

    const updateOptions = useCallback((update: SessionOptionsUpdate) => {
        const nextState = applySessionOptionsUpdate({
            operation,
            settingsByOperation,
            globalSettings,
        }, update);

        setOperation(nextState.operation);
        setSettingsByOperation(nextState.settingsByOperation);
        setGlobalSettings(nextState.globalSettings);
    }, [operation, settingsByOperation, globalSettings]);

    const startSession = useCallback(async () => {
        clearPrepTimeouts();

        if (inputMode === 'voice') {
            const isVoiceReady = await ensureReadyForSession();
            if (!isVoiceReady) {
                return;
            }
        }

        const basePool = MathEngine.getFilteredPool(options);
        if (basePool.length === 0) {
            console.warn("No Problem Set Selected");
            return;
        }

        const { initialQueue, cyclesRemaining, totalProblems } = createSessionQueue(basePool, optionsRef.current);

        queueRef.current = initialQueue;
        setQueue(initialQueue);
        setTotalProblems(totalProblems);
        metrics.current.cyclesRemaining = cyclesRemaining;
        problemCounterRef.current = 0;
        performanceRowsRef.current = [];
        setSessionPerformanceRows([]);
        setSessionPerformanceReport(null);
        setIsPerformanceReportVisible(false);

        const prepSchedule = getSessionPrepSchedule(options.startMode);
        const nextSessionId = generateSessionId();

        setPhase('preparing');
        setIsActive(true);
        setIsInputEnabled(false);
        setIsStadiumActive(true);
        setVoiceListeningArmed(false);
        resetInputValue();
        resetSessionMetrics();
        setCurrentProblem(null);
        sessionIdRef.current = nextSessionId;
        setSessionId(nextSessionId);
        setSessionStart(new Date());
        metrics.current.sessionCompletionMsTotal = 0;

        setStats({ completed: 0, correctFirst: 0, missedFirst: 0 });
        setMissedProblems([]);

        // Preserve original selector visual sequence state.
        prepTimeouts.current.stadiumHide = setTimeout(() => {
            setIsStadiumActive(false);
            prepTimeouts.current.stadiumHide = null;
        }, prepSchedule.stadiumHideAtMs);

        // Total visual prep now follows shared staged-flip timeline, then first problem + timer start.
        prepTimeouts.current.firstProblem = setTimeout(() => {
            if (inputMode === 'voice') {
                _nextProblem(initialQueue, cyclesRemaining, 'awaitingAnswer');
                timerStart.current = Date.now();
                setIsInputEnabled(true);
            } else {
                _nextProblem(initialQueue, cyclesRemaining, 'revealingProblem');
                prepTimeouts.current.timerStartDelay = setTimeout(() => {
                    timerStart.current = Date.now();
                    prepTimeouts.current.timerStartDelay = null;
                }, prepSchedule.timerStartDelayMs);
                prepTimeouts.current.inputUnlock = setTimeout(() => {
                    setIsInputEnabled(true);
                    setPhase('awaitingAnswer');
                    prepTimeouts.current.inputUnlock = null;
                }, prepSchedule.inputUnlockDelayMs);
            }
            prepTimeouts.current.firstProblem = null;
        }, prepSchedule.firstProblemAtMs);
    }, [
        clearPrepTimeouts,
        ensureReadyForSession,
        inputMode,
        options,
        resetInputValue,
        resetSessionMetrics,
        setVoiceListeningArmed,
    ]);

    const _nextProblem = (
        currentQueue: ProblemSpec[],
        remainingCycles: number,
        nextPhase: SessionPhase = 'awaitingAnswer'
    ) => {
        const resolution = resolveNextProblem(currentQueue, remainingCycles, optionsRef.current);

        if (resolution.type === 'end') {
            endSessionRef.current();
            return;
        }

        metrics.current.cyclesRemaining = resolution.cyclesRemaining;
        queueRef.current = resolution.queue;
        setQueue(resolution.queue);
        _setCurrent(resolution.problem, nextPhase);
    };

    const _setCurrent = (p: ProblemSpec, nextPhase: SessionPhase = 'awaitingAnswer') => {
        metrics.current.isFirstTry = true;
        metrics.current.wrongAnswerCount = 0;
        const problemDisplay = createProblemDisplay(p, optionsRef.current);
        const problemIndex = problemCounterRef.current + 1;
        problemCounterRef.current = problemIndex;
        problemDisplay.problemIndex = problemIndex;
        problemDisplay.problemInstanceId = `${sessionIdRef.current || 'mf'}-p${problemIndex}`;
        beginProblemPerformanceRef.current(problemDisplay);
        setCurrentProblem(problemDisplay);
        setPhase(nextPhase);
    };

    const checkAnswer = useCallback((attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult => {
        const problemInstanceId = attempt.problemInstanceId ?? currentProblem?.problemInstanceId;
        const normalizedAttempt: AnswerAttempt = {
            ...attempt,
            problemInstanceId,
            completedAtPerfMs: attempt.completedAtPerfMs ?? performance.now(),
            firstDigitPerfMs:
                attempt.source === 'keypad'
                    ? attempt.firstDigitPerfMs ?? getCurrentProblemFirstDigitPerfMs(problemInstanceId)
                    : attempt.firstDigitPerfMs ?? null,
        };
        const evaluation = evaluateAnswerInput({
            currentProblem,
            isActive,
            attempt: normalizedAttempt,
            forceComplete,
        });

        if (evaluation.result === 'incomplete') {
            return evaluation.result;
        }

        recordAttemptPerformance(
            problemInstanceId,
            normalizedAttempt,
            evaluation.result
        );

        if (evaluation.result === 'correct') {
            metrics.current.sessionCompletionMsTotal += evaluation.attemptMs ?? 0;
            setPhase('feedbackPendingAdvance');

            setStats(prev => recordCorrectAnswer(prev, metrics.current.isFirstTry));

            // Advance after small delay (handled by UI)
            return 'correct';
        }

        const wasFirstTry = metrics.current.isFirstTry;
        if (wasFirstTry) {
            setStats(prev => recordWrongAnswer(prev, wasFirstTry));
            metrics.current.isFirstTry = false;
        }

        metrics.current.wrongAnswerCount += 1;

        if (currentProblem) {
            setMissedProblems(prev =>
                appendMissedProblem(prev, currentProblem, attempt.value, options.operation)
            );
        }

        return 'wrong';
    }, [currentProblem, getCurrentProblemFirstDigitPerfMs, isActive, options, recordAttemptPerformance]);

    const submitAnswerAttempt = useCallback((attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult => {
        return checkAnswer(attempt, forceComplete);
    }, [checkAnswer]);

    const submitAnswer = useCallback((forceComplete: boolean = false): AnswerCheckResult => {
        return submitAnswerAttempt({
            problemInstanceId: currentProblem?.problemInstanceId,
            value: inputValue,
            source: 'keypad',
        }, forceComplete);
    }, [currentProblem?.problemInstanceId, inputValue, submitAnswerAttempt]);

    const endSession = useCallback(() => {
        clearPrepTimeouts();
        if (!isActive) return;
        const wasReset = stats.completed < totalProblems;
        const finalizedRows = finalizePerformanceRows(wasReset);
        const performanceReport = buildSessionPerformanceReport(inputMode, finalizedRows);

        saveLogToCloud(buildSessionLogPayload({
            options,
            sessionId,
            sessionStart,
            stats,
            totalProblems,
            useTimer,
            sessionCompletionMsTotal: metrics.current.sessionCompletionMsTotal,
            inputMode,
            voiceMetrics,
            sessionPerformanceReport: performanceReport,
        }));

        setSessionPerformanceReport(performanceReport);
        setIsPerformanceReportVisible(
            options.autoShowPerformanceReport && performanceReport.problems.length > 0
        );
        setIsActive(false);
        setIsInputEnabled(false);
        setIsStadiumActive(true);
        setVoiceListeningArmed(false);
        resetInputValue();
        setCurrentProblem(null);
        queueRef.current = [];
        setQueue([]);
        setPhase('idle');
    }, [
        buildSessionPerformanceReport,
        clearPrepTimeouts,
        finalizePerformanceRows,
        inputMode,
        isActive,
        options,
        resetInputValue,
        sessionId,
        sessionStart,
        setVoiceListeningArmed,
        stats,
        totalProblems,
        useTimer,
        voiceMetrics,
    ]);

    useEffect(() => {
        endSessionRef.current = endSession;
    }, [endSession]);

    const advanceToNextProblem = useCallback(() => {
        _nextProblem(queueRef.current, metrics.current.cyclesRemaining);
    }, []);

    return {
        phase,
        options,
        updateOptions,
        useTimer,
        setUseTimer,
        isActive,
        isInputEnabled,
        isStadiumActive,
        inputMode,
        setInputMode,
        voiceState,
        sessionPerformanceReport,
        isPerformanceReportVisible,
        inputValue,
        appendInputDigit,
        setInputValue,
        clearInputValue,
        currentProblem,
        stats,
        totalProblems,
        wrongAnswerCount: metrics.current.wrongAnswerCount,
        getPendingCount,
        startSession,
        checkAnswer,
        submitAnswerAttempt,
        submitAnswer,
        endSession,
        advanceToNextProblem,
        pauseVoiceInput: () => setVoiceListeningArmed(false),
        resumeVoiceInput: () => setVoiceListeningArmed(true),
        clearPendingVoiceAttempt: clearPendingAttempt,
        openPerformanceReport,
        closePerformanceReport,
    };
}
