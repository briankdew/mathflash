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

export function useMathSession() {
    const [operation, setOperation] = useState<OperationMode>('addsub');
    const [settingsByOperation, setSettingsByOperation] = useState<SettingsByOperation>({
        addsub: defaultOperationSettings(),
        multdiv: defaultOperationSettings(),
    });
    const [globalSettings, setGlobalSettings] = useState<GlobalSessionSettings>({
        useTimer: true,
        startMode: 'min',
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
        appendInputDigit,
        setInputValue,
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
        if (inputMode !== 'voice') {
            return;
        }

        setInputValue(voiceState.transcriptPreview);
    }, [inputMode, setInputValue, voiceState.transcriptPreview]);

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

        const { initialQueue, cyclesRemaining, totalProblems } = createSessionQueue(basePool, options);

        setQueue(initialQueue);
        setTotalProblems(totalProblems);
        metrics.current.cyclesRemaining = cyclesRemaining;

        const prepSchedule = getSessionPrepSchedule(options.startMode);

        setPhase('preparing');
        setIsActive(true);
        setIsInputEnabled(false);
        setIsStadiumActive(true);
        setVoiceListeningArmed(false);
        resetInputValue();
        resetSessionMetrics();
        setCurrentProblem(null);
        setSessionId(generateSessionId());
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
        const resolution = resolveNextProblem(currentQueue, remainingCycles, options);

        if (resolution.type === 'end') {
            endSession();
            return;
        }

        metrics.current.cyclesRemaining = resolution.cyclesRemaining;
        setQueue(resolution.queue);
        _setCurrent(resolution.problem, nextPhase);
    };

    const _setCurrent = (p: ProblemSpec, nextPhase: SessionPhase = 'awaitingAnswer') => {
        metrics.current.isFirstTry = true;
        metrics.current.wrongAnswerCount = 0;
        setCurrentProblem(createProblemDisplay(p, options));
        setPhase(nextPhase);
    };

    const checkAnswer = useCallback((attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult => {
        const evaluation = evaluateAnswerInput({
            currentProblem,
            isActive,
            attempt,
            forceComplete,
        });

        if (evaluation.result === 'incomplete') {
            return evaluation.result;
        }

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
    }, [currentProblem, isActive, options]);

    const submitAnswerAttempt = useCallback((attempt: AnswerAttempt, forceComplete: boolean = false): AnswerCheckResult => {
        return checkAnswer(attempt, forceComplete);
    }, [checkAnswer]);

    const submitAnswer = useCallback((forceComplete: boolean = false): AnswerCheckResult => {
        return submitAnswerAttempt({
            value: inputValue,
            source: 'keypad',
        }, forceComplete);
    }, [inputValue, submitAnswerAttempt]);

    const endSession = useCallback(() => {
        clearPrepTimeouts();
        if (!isActive) return;

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
        }));

        setIsActive(false);
        setIsInputEnabled(false);
        setIsStadiumActive(true);
        setVoiceListeningArmed(false);
        resetInputValue();
        setCurrentProblem(null);
        setQueue([]);
        setPhase('idle');
    }, [
        clearPrepTimeouts,
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

    const advanceToNextProblem = useCallback(() => {
        _nextProblem(queue, metrics.current.cyclesRemaining);
    }, [queue, options]);

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
    };
}
