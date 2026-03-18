import { MathEngine } from '../MathEngine';
import { SessionOptions } from '../types';

const baseOptions: SessionOptions = {
  operation: 'addsub',
  problemOrder: 'standard',
  operandOrder: 'standard',
  missingValue: 'result',
  startMode: 'min',
  autoShowPerformanceReport: false,
  setsMode: 'cycles',
  activeChips: [1, 2, 3],
  customSet: null,
  practiceCycles: 1,
};

describe('MathEngine', () => {
  it('filters the standard pool by active chips', () => {
    const pool = MathEngine.getFilteredPool(baseOptions);

    expect(pool.every(problem => [1, 2, 3].includes(problem.a))).toBe(true);
    expect(pool).toHaveLength(24);
  });

  it('builds the tens custom set without duplicates', () => {
    const pool = MathEngine.getFilteredPool({
      ...baseOptions,
      customSet: '10s',
      activeChips: [],
    });

    expect(pool).toEqual([
      { a: 1, b: 9, sum: 10, product: 9 },
      { a: 2, b: 8, sum: 10, product: 16 },
      { a: 3, b: 7, sum: 10, product: 21 },
      { a: 4, b: 6, sum: 10, product: 24 },
      { a: 5, b: 5, sum: 10, product: 25 },
    ]);
  });

  it('respects reverse operand order and random missing slot choices', () => {
    const mathRandomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.8);

    const display = MathEngine.configureProblemDisplay(
      { a: 3, b: 7, sum: 10, product: 21 },
      {
        ...baseOptions,
        operation: 'multdiv',
        operandOrder: 'random',
        missingValue: 'random',
      }
    );

    expect(display).toEqual({
      left: 7,
      right: 3,
      result: 21,
      missing: 'result',
      correct: 21,
    });

    mathRandomSpy.mockRestore();
  });
});
