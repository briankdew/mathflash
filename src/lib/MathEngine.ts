import { ProblemSpec, ProblemDisplay, SessionOptions } from './types';

export class MathEngine {
    /**
     * Generates the pool of practice problems based on the active chips or custom sets.
     */
    static getFilteredPool(options: SessionOptions): ProblemSpec[] {
        const pool: ProblemSpec[] = [];

        // BRANCH A: Custom Set is active (ignores 1-9 chips)
        if (options.customSet === '10s') {
            for (let a = 1; a <= 9; a++) {
                for (let b = 1; b <= 9; b++) {
                    if (a + b === 10) {
                        pool.push({ a, b, sum: 10, product: a * b });
                    }
                }
            }
            return pool;
        } else if (options.customSet === 'doubles') {
            for (let a = 1; a <= 9; a++) {
                pool.push({ a, b: a, sum: a + a, product: a * a });
            }
            return pool;
        }

        // BRANCH B: Standard Logic (uses 1-9 chips)
        for (let a = 1; a <= 9; a++) {
            for (let b = a; b <= 9; b++) {
                pool.push({ a, b, sum: a + b, product: a * b });
            }
        }

        if (options.activeChips.length === 0) {
            return [];
        }

        return pool.filter(p => options.activeChips.includes(p.a));
    }

    /**
     * Shuffles an array in place using Fisher-Yates algorithm.
     */
    static shuffle<T>(array: T[]): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Configures how the problem should be displayed based on user settings
     * such as Operand Order and Missing Value options.
     */
    static configureProblemDisplay(p: ProblemSpec, options: SessionOptions): ProblemDisplay {
        let left = p.a;
        let right = p.b;

        if (options.operandOrder === 'reverse') {
            left = p.b;
            right = p.a;
        } else if (options.operandOrder === 'random' && Math.random() > 0.5) {
            left = p.b;
            right = p.a;
        }

        const slots: Array<'left' | 'right' | 'result'> = ['left', 'right', 'result'];
        let missing: 'left' | 'right' | 'result' = 'result';

        if (options.missingValue === 'operand') {
            missing = Math.random() > 0.5 ? 'left' : 'right';
        } else if (options.missingValue === 'random') {
            missing = slots[Math.floor(Math.random() * slots.length)];
        }

        const result = options.operation === 'addsub' ? left + right : left * right;

        let correct: number;
        if (missing === 'left') correct = left;
        else if (missing === 'right') correct = right;
        else correct = result;

        return { left, right, result, missing, correct };
    }
}
