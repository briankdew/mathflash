import { useState, useCallback, useEffect, useRef } from 'react';
import { MathEngine } from '../lib/MathEngine';
import { saveLogToCloud } from '../lib/CloudSync';
import { sessionPrepMarks, sessionPrepTimeline } from '../lib/sessionPrepTimeline';
import {
    OperationMode,
    SessionOptions,
    ProblemSpec,
    ProblemDisplay,
    SessionStats,
    MissedProblem,
} from '../lib/types';

// Fallback UUID generation
function generateSessionId() {
    return 'mf-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

type OperationScopedSettings = {
    problemOrder: SessionOptions['problemOrder'];
    operandOrder: SessionOptions['operandOrder'];
    missingValue: SessionOptions['missingValue'];
    activeChips: number[];
    customSet: SessionOptions['customSet'];
};

type GlobalSettings = {
    practiceCycles: number;
    useTimer: boolean;
    startMode: SessionOptions['startMode'];
};

const defaultOperationSettings = (): OperationScopedSettings => ({
    problemOrder: 'random',
    operandOrder: 'random',
    missingValue: 'random',
    activeChips: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    customSet: null,
});

const normalizeScopedSettingsForOperation = (
    operation: OperationMode,
    settings: OperationScopedSettings
): OperationScopedSettings => {
    if (operation === 'multdiv' && settings.customSet !== null) {
        return { ...settings, customSet: null };
    }
    return settings;
};

export function useMathSession() {
    const [operation, setOperation] = useState<OperationMode>('addsub');
    const [settingsByOperation, setSettingsByOperation] = useState<Record<OperationMode, OperationScopedSettings>>({
        addsub: defaultOperationSettings(),
        multdiv: defaultOperationSettings(),
    });
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
        practiceCycles: 1,
        useTimer: true,
        startMode: 'full',
    });

    const currentOperationSettings = normalizeScopedSettingsForOperation(operation, settingsByOperation[operation]);
    const options: SessionOptions = {
        operation,
        problemOrder: currentOperationSettings.problemOrder,
        operandOrder: currentOperationSettings.operandOrder,
        missingValue: currentOperationSettings.missingValue,
        startMode: globalSettings.startMode,
        activeChips: currentOperationSettings.activeChips,
        customSet: currentOperationSettings.customSet,
        practiceCycles: globalSettings.practiceCycles,
    };
    const useTimer = globalSettings.useTimer;
    const setUseTimer = (val: boolean) => {
        setGlobalSettings(prev => ({ ...prev, useTimer: val }));
    };

    // Session State
    const [isActive, setIsActive] = useState(false);
    const [isStadiumActive, setIsStadiumActive] = useState(true);
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
    const prepTimeouts = useRef<{
        stadiumHide: ReturnType<typeof setTimeout> | null;
        firstProblem: ReturnType<typeof setTimeout> | null;
        timerStartDelay: ReturnType<typeof setTimeout> | null;
    }>({
        stadiumHide: null,
        firstProblem: null,
        timerStartDelay: null,
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
    }, []);

    useEffect(() => {
        return () => {
            clearPrepTimeouts();
        };
    }, [clearPrepTimeouts]);

    // Derived Values
    const getPendingCount = useCallback(() => {
        const pool = MathEngine.getFilteredPool(options);
        const cycles = Math.max(1, Math.min(5, options.practiceCycles));
        return pool.length * cycles;
    }, [options]);

    const updateOptions = (newOpts: Partial<SessionOptions>) => {
        if (newOpts.operation) {
            setOperation(newOpts.operation);
        }
        if (newOpts.practiceCycles !== undefined || newOpts.startMode !== undefined) {
            setGlobalSettings(prev => ({
                ...prev,
                ...(newOpts.practiceCycles !== undefined ? { practiceCycles: newOpts.practiceCycles } : {}),
                ...(newOpts.startMode !== undefined ? { startMode: newOpts.startMode } : {}),
            }));
        }

        const hasScopedChanges = (
            newOpts.problemOrder !== undefined ||
            newOpts.operandOrder !== undefined ||
            newOpts.missingValue !== undefined ||
            newOpts.activeChips !== undefined ||
            newOpts.customSet !== undefined
        );

        if (!hasScopedChanges) return;

        const targetOperation: OperationMode = newOpts.operation ?? operation;
        const prevSettings = settingsByOperation[targetOperation];
        const nextSettingsRaw: OperationScopedSettings = {
            ...prevSettings,
            ...(newOpts.problemOrder !== undefined ? { problemOrder: newOpts.problemOrder } : {}),
            ...(newOpts.operandOrder !== undefined ? { operandOrder: newOpts.operandOrder } : {}),
            ...(newOpts.missingValue !== undefined ? { missingValue: newOpts.missingValue } : {}),
            ...(newOpts.activeChips !== undefined ? { activeChips: newOpts.activeChips } : {}),
            ...(newOpts.customSet !== undefined ? { customSet: newOpts.customSet } : {}),
        };
        const nextSettings = normalizeScopedSettingsForOperation(targetOperation, nextSettingsRaw);

        setSettingsByOperation(prev => ({
            ...prev,
            [targetOperation]: nextSettings,
        }));
    };

    const startSession = useCallback(() => {
        clearPrepTimeouts();

        let pool = MathEngine.getFilteredPool(options);
        if (pool.length === 0) {
            // In a real app, maybe trigger an alert here.
            console.warn("No Problem Set Selected");
            return;
        }

        if (options.problemOrder === 'random') {
            pool = MathEngine.shuffle(pool);
        }

        const cycles = Math.max(1, Math.min(5, options.practiceCycles));

        setQueue(pool);
        setTotalProblems(pool.length * cycles);
        metrics.current.cyclesRemaining = cycles - 1;

        setIsActive(true);
        setSessionId(generateSessionId());
        setSessionStart(new Date());
        metrics.current.sessionCompletionMsTotal = 0;

        setStats({ completed: 0, correctFirst: 0, missedFirst: 0 });
        setMissedProblems([]);

        // Hide the stadium after tuck + beat, as keypad roll starts.
        prepTimeouts.current.stadiumHide = setTimeout(() => {
            setIsStadiumActive(false);
            prepTimeouts.current.stadiumHide = null;
        }, sessionPrepMarks.stadiumHideAt);

        const prepTotal = options.startMode === 'min' ? sessionPrepMarks.totalPrepMin : sessionPrepMarks.totalPrep;

        // Total visual prep now follows shared staged-flip timeline, then first problem + timer start.
        prepTimeouts.current.firstProblem = setTimeout(() => {
            _nextProblem(pool, cycles - 1);
            prepTimeouts.current.timerStartDelay = setTimeout(() => {
                timerStart.current = Date.now();
                prepTimeouts.current.timerStartDelay = null;
            }, sessionPrepTimeline.firstProblemDissolve);
            prepTimeouts.current.firstProblem = null;
        }, prepTotal);
    }, [options, clearPrepTimeouts]);

    const _nextProblem = (currentQueue: ProblemSpec[], remainingCycles: number) => {
        if (currentQueue.length === 0) {
            if (remainingCycles > 0) {
                let pool = MathEngine.getFilteredPool(options);
                if (options.problemOrder === 'random') pool = MathEngine.shuffle(pool);

                if (pool.length === 0) {
                    endSession();
                    return;
                }

                metrics.current.cyclesRemaining = remainingCycles - 1;

                const p = pool.shift()!;
                setQueue(pool);
                _setCurrent(p);
            } else {
                endSession();
            }
        } else {
            const q = [...currentQueue];
            const p = q.shift()!;
            setQueue(q);
            _setCurrent(p);
        }
    };

    const _setCurrent = (p: ProblemSpec) => {
        metrics.current.isFirstTry = true;
        metrics.current.wrongAnswerCount = 0;
        const display = MathEngine.configureProblemDisplay(p, options);
        display.presentedAtPerf = performance.now();
        display.attempts = 0;
        setCurrentProblem(display);
    };

    const checkAnswer = useCallback((inputStr: string, forceComplete: boolean = false): 'correct' | 'wrong' | 'incomplete' => {
        if (!currentProblem || !isActive) return 'incomplete';

        // Accept empty strings or partials if not forcing
        const userVal = parseInt(inputStr, 10);
        const correctStr = String(currentProblem.correct);

        if (isNaN(userVal) || (!forceComplete && inputStr.length < correctStr.length && userVal !== currentProblem.correct)) {
            return 'incomplete';
        }

        const now = performance.now();
        const presentedTime = currentProblem.presentedAtPerf || now;
        const attemptMs = Math.max(0, now - presentedTime);

        // Provide Answer
        if (userVal === currentProblem.correct) {
            metrics.current.sessionCompletionMsTotal += attemptMs;

            setStats(prev => ({
                ...prev,
                completed: prev.completed + 1,
                correctFirst: metrics.current.isFirstTry ? prev.correctFirst + 1 : prev.correctFirst
            }));

            // Advance after small delay (handled by UI)
            return 'correct';
        } else {
            if (metrics.current.isFirstTry) {
                setStats(prev => ({ ...prev, missedFirst: prev.missedFirst + 1 }));
                metrics.current.isFirstTry = false;
            }

            metrics.current.wrongAnswerCount += 1;

            // Log Missed Problem
            setMissedProblems(prev => {
                const stdA = Math.min(currentProblem.left, currentProblem.right);
                const stdB = Math.max(currentProblem.left, currentProblem.right);

                const existing = prev.find(m => m.a === stdA && m.b === stdB);
                if (existing) {
                    return prev.map(m => m === existing ? { ...m, guesses: [...m.guesses, inputStr] } : m);
                } else {
                    return [...prev, {
                        a: stdA,
                        b: stdB,
                        res: currentProblem.result,
                        op: options.operation === 'addsub' ? '+' : '×',
                        guesses: [inputStr]
                    }];
                }
            });
            return 'wrong';
        }
    }, [currentProblem, isActive, options]);

    const endSession = useCallback(() => {
        clearPrepTimeouts();
        if (!isActive) return;

        const end = new Date();
        const elapsedSec = Math.round((Date.now() - timerStart.current) / 1000);

        const n = stats.completed;
        const c = stats.correctFirst;
        const speed = n > 0 ? (metrics.current.sessionCompletionMsTotal / 1000 / n).toFixed(1) : '0.0';

        const opText = options.operation === 'addsub' ? 'Addition / Subtraction' : 'Multiplication / Division';
        let levelText = "Easy";
        if (options.missingValue === 'operand') levelText = "Moderate";
        else if (options.missingValue === 'random') levelText = "Difficult";

        saveLogToCloud({
            'Log Timestamp': new Date().toLocaleString(),
            'Session ID': sessionId,
            'User': '',
            'Timer on': useTimer ? 'Y' : 'N',
            'Operation': opText,
            'Level': levelText,
            'Session reset': n < totalProblems ? 'Y' : 'N',
            'Session date': sessionStart?.toLocaleDateString('en-US') || '',
            // Note: Full formatting should match index.html for backend compatibility
            'Problems selected': Math.round(totalProblems / Math.max(1, options.practiceCycles)).toString(),
            'Practice cycles': options.practiceCycles.toString(),
            'Total problems': totalProblems.toString(),
            'Problems completed': n.toString(),
            'Percent completed (%)': totalProblems > 0 ? (100 * (n / totalProblems)).toFixed(0) : '0',
            'Correct (first try)': c.toString(),
            'Missed (first try)': stats.missedFirst.toString(),
            'Accuracy (%)': n > 0 ? (100 * (c / n)).toFixed(0) : '0',
            'Calculation speed (sec/prob)': useTimer ? speed : '',
            // Formatting other columns omitted for brevity but should be hydrated before saveLogToCloud is called natively.
        });

        setIsActive(false);
        setIsStadiumActive(true);
        setCurrentProblem(null);
        setQueue([]);
    }, [isActive, stats, totalProblems, useTimer, options, sessionStart, sessionId, clearPrepTimeouts]);

    const advanceToNextProblem = useCallback(() => {
        _nextProblem(queue, metrics.current.cyclesRemaining);
    }, [queue, options]);

    return {
        options,
        updateOptions,
        useTimer,
        setUseTimer,
        isActive,
        isStadiumActive,
        currentProblem,
        stats,
        totalProblems,
        wrongAnswerCount: metrics.current.wrongAnswerCount,
        getPendingCount,
        startSession,
        checkAnswer,
        endSession,
        advanceToNextProblem
    };
}
