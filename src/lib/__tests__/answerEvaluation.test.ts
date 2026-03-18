import { evaluateAnswerInput } from '../answerEvaluation';
import { ProblemDisplay } from '../types';

const problem: ProblemDisplay = {
  left: 4,
  right: 5,
  result: 9,
  missing: 'result',
  correct: 9,
  presentedAtPerf: 100,
};

describe('evaluateAnswerInput', () => {
  it('returns incomplete for partial keypad input', () => {
    const doubleDigitProblem: ProblemDisplay = {
      ...problem,
      result: 12,
      correct: 12,
    };

    expect(
      evaluateAnswerInput({
        currentProblem: doubleDigitProblem,
        isActive: true,
        attempt: { value: '1', source: 'keypad', completedAtPerfMs: 150 },
        forceComplete: false,
      })
    ).toEqual({ result: 'incomplete', attemptMs: null });
  });

  it('returns correct with computed attempt time', () => {
    expect(
      evaluateAnswerInput({
        currentProblem: problem,
        isActive: true,
        attempt: { value: '9', source: 'keypad', completedAtPerfMs: 175 },
        forceComplete: true,
      })
    ).toEqual({ result: 'correct', attemptMs: 75 });
  });

  it('returns wrong for forced incorrect input', () => {
    expect(
      evaluateAnswerInput({
        currentProblem: problem,
        isActive: true,
        attempt: { value: '8', source: 'keypad', completedAtPerfMs: 190 },
        forceComplete: true,
      })
    ).toEqual({ result: 'wrong', attemptMs: 90 });
  });
});
