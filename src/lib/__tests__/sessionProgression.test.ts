import {
  createProblemDisplay,
  createSessionQueue,
  resolveNextProblem,
} from '../sessionProgression';
import { SessionOptions } from '../types';

const baseOptions: SessionOptions = {
  operation: 'addsub',
  problemOrder: 'standard',
  operandOrder: 'standard',
  missingValue: 'result',
  startMode: 'min',
  autoShowPerformanceReport: false,
  setsMode: 'cycles',
  activeChips: [1, 2],
  customSet: null,
  practiceCycles: 2,
};

describe('sessionProgression', () => {
  it('creates a combined queue for single-set cycling', () => {
    const setup = createSessionQueue(
      [
        { a: 1, b: 1, sum: 2, product: 1 },
        { a: 1, b: 2, sum: 3, product: 2 },
      ],
      { ...baseOptions, setsMode: 'single' }
    );

    expect(setup.initialQueue).toHaveLength(4);
    expect(setup.cyclesRemaining).toBe(0);
    expect(setup.totalProblems).toBe(4);
  });

  it('resolves next problem and eventually ends when queue is empty', () => {
    const next = resolveNextProblem(
      [{ a: 1, b: 1, sum: 2, product: 1 }],
      0,
      baseOptions
    );

    expect(next.type).toBe('next');
    if (next.type === 'next') {
      expect(next.problem).toEqual({ a: 1, b: 1, sum: 2, product: 1 });
      expect(next.queue).toEqual([]);
    }

    expect(resolveNextProblem([], 0, baseOptions)).toEqual({ type: 'end' });
  });

  it('stamps problem display performance data', () => {
    const display = createProblemDisplay(
      { a: 2, b: 3, sum: 5, product: 6 },
      baseOptions
    );

    expect(typeof display.presentedAtPerf).toBe('number');
    expect(display.attempts).toBe(0);
  });
});
