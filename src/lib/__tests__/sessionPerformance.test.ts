import { buildSessionPerformanceReport } from '../sessionPerformance';
import { SessionProblemPerformance } from '../types';

const problems: SessionProblemPerformance[] = [
  {
    problemInstanceId: 'p1',
    problemIndex: 1,
    inputMode: 'keypad',
    operation: 'addsub',
    left: 2,
    right: 3,
    result: 5,
    missing: 'result',
    correct: 5,
    presentedAtPerfMs: 10,
    firstInputOnsetPerfMs: 110,
    responseOnsetLatencyMs: 100,
    onsetSource: 'first_digit',
    firstAttemptCompletedAtPerfMs: 210,
    completionLatencyMs: 200,
    outcome: 'correct_first_try',
    attemptCount: 1,
    isResolved: true,
    submittedValues: ['5'],
    voiceDiagnostics: {
      speechStartPerfMs: null,
      speechEndPerfMs: null,
      finalResultPerfMs: null,
      voiceProcessingMs: null,
      transcript: null,
    },
    keypadDiagnostics: { firstDigitPerfMs: 110 },
  },
  {
    problemInstanceId: 'p2',
    problemIndex: 2,
    inputMode: 'voice',
    operation: 'addsub',
    left: 4,
    right: 4,
    result: 8,
    missing: 'result',
    correct: 8,
    presentedAtPerfMs: 20,
    firstInputOnsetPerfMs: 170,
    responseOnsetLatencyMs: 150,
    onsetSource: 'speechstart',
    firstAttemptCompletedAtPerfMs: 260,
    completionLatencyMs: 240,
    outcome: 'wrong_then_correct',
    attemptCount: 2,
    isResolved: true,
    submittedValues: ['7', '8'],
    voiceDiagnostics: {
      speechStartPerfMs: 170,
      speechEndPerfMs: 230,
      finalResultPerfMs: 260,
      voiceProcessingMs: 30,
      transcript: 'eight',
    },
    keypadDiagnostics: { firstDigitPerfMs: null },
  },
];

describe('sessionPerformance', () => {
  it('builds an ordered performance report with aggregate statistics', () => {
    const report = buildSessionPerformanceReport('voice', [...problems].reverse());

    expect(report.problems.map(problem => problem.problemInstanceId)).toEqual(['p1', 'p2']);
    expect(report.summary.problemCount).toBe(2);
    expect(report.summary.measuredProblemCount).toBe(2);
    expect(report.summary.fastestOnsetLatencyMs).toBe(100);
    expect(report.summary.slowestOnsetLatencyMs).toBe(150);
    expect(report.summary.firstTryAccuracyPct).toBe(50);
    expect(report.summary.modeBreakdown.keypad?.medianOnsetLatencyMs).toBe(100);
    expect(report.summary.modeBreakdown.voice?.medianOnsetLatencyMs).toBe(150);
  });
});
