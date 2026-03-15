import {
    MissedProblem,
    OperationMode,
    ProblemDisplay,
    SessionStats,
} from './types';

export function recordCorrectAnswer(
    stats: SessionStats,
    isFirstTry: boolean
): SessionStats {
    return {
        ...stats,
        completed: stats.completed + 1,
        correctFirst: isFirstTry ? stats.correctFirst + 1 : stats.correctFirst,
    };
}

export function recordWrongAnswer(
    stats: SessionStats,
    isFirstTry: boolean
): SessionStats {
    if (!isFirstTry) {
        return stats;
    }

    return {
        ...stats,
        missedFirst: stats.missedFirst + 1,
    };
}

export function appendMissedProblem(
    missedProblems: MissedProblem[],
    currentProblem: ProblemDisplay,
    inputStr: string,
    operation: OperationMode
): MissedProblem[] {
    const stdA = Math.min(currentProblem.left, currentProblem.right);
    const stdB = Math.max(currentProblem.left, currentProblem.right);
    const existing = missedProblems.find(m => m.a === stdA && m.b === stdB);

    if (existing) {
        return missedProblems.map(m =>
            m === existing ? { ...m, guesses: [...m.guesses, inputStr] } : m
        );
    }

    return [
        ...missedProblems,
        {
            a: stdA,
            b: stdB,
            res: currentProblem.result,
            op: operation === 'addsub' ? '+' : '×',
            guesses: [inputStr],
        },
    ];
}
