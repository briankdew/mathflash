import { MathEngine } from './MathEngine';
import { ProblemDisplay, ProblemSpec, SessionOptions } from './types';

export interface SessionQueueSetup {
    initialQueue: ProblemSpec[];
    cyclesRemaining: number;
    totalProblems: number;
}

export type NextProblemResolution =
    | {
          type: 'next';
          problem: ProblemSpec;
          queue: ProblemSpec[];
          cyclesRemaining: number;
      }
    | {
          type: 'end';
      };

export function getPracticeCycles(practiceCycles: number): number {
    return Math.max(1, Math.min(5, practiceCycles));
}

export function createSessionQueue(
    basePool: ProblemSpec[],
    options: SessionOptions
): SessionQueueSetup {
    const cycles = getPracticeCycles(options.practiceCycles);
    const useCombinedSet = cycles > 1 && options.setsMode === 'single';

    let initialQueue: ProblemSpec[] = [];
    let cyclesRemaining = 0;

    if (useCombinedSet) {
        for (const problem of basePool) {
            for (let i = 0; i < cycles; i++) {
                initialQueue.push(problem);
            }
        }

        if (options.problemOrder === 'random') {
            initialQueue = MathEngine.shuffle(initialQueue);
        }
    } else {
        initialQueue =
            options.problemOrder === 'random'
                ? MathEngine.shuffle(basePool)
                : [...basePool];
        cyclesRemaining = cycles - 1;
    }

    return {
        initialQueue,
        cyclesRemaining,
        totalProblems: basePool.length * cycles,
    };
}

export function resolveNextProblem(
    currentQueue: ProblemSpec[],
    remainingCycles: number,
    options: SessionOptions
): NextProblemResolution {
    if (currentQueue.length === 0) {
        if (remainingCycles <= 0) {
            return { type: 'end' };
        }

        let pool = MathEngine.getFilteredPool(options);
        if (options.problemOrder === 'random') {
            pool = MathEngine.shuffle(pool);
        }

        if (pool.length === 0) {
            return { type: 'end' };
        }

        const nextProblem = pool.shift()!;
        return {
            type: 'next',
            problem: nextProblem,
            queue: pool,
            cyclesRemaining: remainingCycles - 1,
        };
    }

    const nextQueue = [...currentQueue];
    const nextProblem = nextQueue.shift()!;

    return {
        type: 'next',
        problem: nextProblem,
        queue: nextQueue,
        cyclesRemaining: remainingCycles,
    };
}

export function createProblemDisplay(
    problem: ProblemSpec,
    options: SessionOptions
): ProblemDisplay {
    const display = MathEngine.configureProblemDisplay(problem, options);
    display.presentedAtPerf = performance.now();
    display.attempts = 0;
    return display;
}
