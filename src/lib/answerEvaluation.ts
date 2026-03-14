import { AnswerCheckResult, ProblemDisplay } from './types';

interface EvaluateAnswerInputArgs {
    currentProblem: ProblemDisplay | null;
    isActive: boolean;
    inputStr: string;
    forceComplete: boolean;
    nowMs?: number;
}

export interface AnswerEvaluationResult {
    result: AnswerCheckResult;
    attemptMs: number | null;
}

export function evaluateAnswerInput({
    currentProblem,
    isActive,
    inputStr,
    forceComplete,
    nowMs = performance.now(),
}: EvaluateAnswerInputArgs): AnswerEvaluationResult {
    if (!currentProblem || !isActive) {
        return { result: 'incomplete', attemptMs: null };
    }

    const userVal = parseInt(inputStr, 10);
    const correctStr = String(currentProblem.correct);

    if (
        isNaN(userVal) ||
        (!forceComplete &&
            inputStr.length < correctStr.length &&
            userVal !== currentProblem.correct)
    ) {
        return { result: 'incomplete', attemptMs: null };
    }

    const presentedTime = currentProblem.presentedAtPerf || nowMs;
    const attemptMs = Math.max(0, nowMs - presentedTime);

    return {
        result: userVal === currentProblem.correct ? 'correct' : 'wrong',
        attemptMs,
    };
}
