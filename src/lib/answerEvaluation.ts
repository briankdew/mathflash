import { AnswerAttempt, AnswerCheckResult, ProblemDisplay } from './types';

interface EvaluateAnswerInputArgs {
    currentProblem: ProblemDisplay | null;
    isActive: boolean;
    attempt: AnswerAttempt;
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
    attempt,
    forceComplete,
    nowMs = performance.now(),
}: EvaluateAnswerInputArgs): AnswerEvaluationResult {
    if (!currentProblem || !isActive) {
        return { result: 'incomplete', attemptMs: null };
    }

    const inputStr = attempt.value;
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
    const completedAtPerfMs = attempt.completedAtPerfMs ?? nowMs;
    const attemptMs = Math.max(0, completedAtPerfMs - presentedTime);

    return {
        result: userVal === currentProblem.correct ? 'correct' : 'wrong',
        attemptMs,
    };
}
