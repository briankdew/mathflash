import {
  SessionInputMode,
  SessionPerformanceModeSummary,
  SessionPerformanceReport,
  SessionPerformanceSummary,
  SessionProblemPerformance,
  SessionProblemOutcome,
} from './types';

const SESSION_PERFORMANCE_SCHEMA_VERSION = 1;

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  return Math.round(sorted[mid]);
}

function buildModeSummary(
  problems: SessionProblemPerformance[]
): SessionPerformanceModeSummary {
  const onsetValues = problems
    .map(problem => problem.responseOnsetLatencyMs)
    .filter((value): value is number => value !== null);
  const completionValues = problems
    .map(problem => problem.completionLatencyMs)
    .filter((value): value is number => value !== null);
  const accuracyRows = problems.filter(problem =>
    isCountedForAccuracy(problem.outcome)
  );
  const correctFirstTryCount = problems.filter(
    problem => problem.outcome === 'correct_first_try'
  ).length;

  return {
    problemCount: problems.length,
    measuredProblemCount: onsetValues.length,
    medianOnsetLatencyMs: median(onsetValues),
    fastestOnsetLatencyMs:
      onsetValues.length > 0 ? Math.min(...onsetValues) : null,
    slowestOnsetLatencyMs:
      onsetValues.length > 0 ? Math.max(...onsetValues) : null,
    medianCompletionLatencyMs: median(completionValues),
    noInputCount: problems.filter(problem => problem.outcome === 'no_input').length,
    firstTryAccuracyPct:
      accuracyRows.length > 0
        ? Math.round((correctFirstTryCount / accuracyRows.length) * 100)
        : null,
  };
}

function isCountedForAccuracy(outcome: SessionProblemOutcome): boolean {
  return (
    outcome === 'correct_first_try' ||
    outcome === 'wrong_then_correct' ||
    outcome === 'wrong_only'
  );
}

export function buildSessionPerformanceSummary(
  problems: SessionProblemPerformance[]
): SessionPerformanceSummary {
  const orderedProblems = [...problems].sort(
    (a, b) => a.problemIndex - b.problemIndex
  );
  const onsetValues = orderedProblems
    .map(problem => problem.responseOnsetLatencyMs)
    .filter((value): value is number => value !== null);

  const completionValues = orderedProblems
    .map(problem => problem.completionLatencyMs)
    .filter((value): value is number => value !== null);

  const correctFirstTryOnsets = orderedProblems
    .filter(problem => problem.outcome === 'correct_first_try')
    .map(problem => problem.responseOnsetLatencyMs)
    .filter((value): value is number => value !== null);

  const otherOutcomeOnsets = orderedProblems
    .filter(problem => problem.outcome !== 'correct_first_try')
    .map(problem => problem.responseOnsetLatencyMs)
    .filter((value): value is number => value !== null);

  const accuracyRows = orderedProblems.filter(problem =>
    isCountedForAccuracy(problem.outcome)
  );
  const correctFirstTryCount = orderedProblems.filter(
    problem => problem.outcome === 'correct_first_try'
  ).length;

  const attemptCountDistribution = orderedProblems.reduce<Record<string, number>>(
    (distribution, problem) => {
      const key = String(problem.attemptCount);
      distribution[key] = (distribution[key] ?? 0) + 1;
      return distribution;
    },
    {}
  );
  const outcomeCounts = orderedProblems.reduce<Record<SessionProblemOutcome, number>>(
    (counts, problem) => {
      counts[problem.outcome] += 1;
      return counts;
    },
    {
      correct_first_try: 0,
      wrong_then_correct: 0,
      wrong_only: 0,
      no_input: 0,
      reset_incomplete: 0,
    }
  );

  const modeBreakdown: Partial<
    Record<SessionInputMode, SessionPerformanceModeSummary>
  > = {};

  (['keypad', 'voice'] as SessionInputMode[]).forEach(mode => {
    const modeProblems = orderedProblems.filter(problem => problem.inputMode === mode);
    if (modeProblems.length > 0) {
      modeBreakdown[mode] = buildModeSummary(modeProblems);
    }
  });

  return {
    problemCount: orderedProblems.length,
    measuredProblemCount: onsetValues.length,
    measuredCompletionCount: completionValues.length,
    noInputCount: outcomeCounts.no_input,
    medianOnsetLatencyMs: median(onsetValues),
    fastestOnsetLatencyMs:
      onsetValues.length > 0 ? Math.min(...onsetValues) : null,
    slowestOnsetLatencyMs:
      onsetValues.length > 0 ? Math.max(...onsetValues) : null,
    medianCompletionLatencyMs: median(completionValues),
    firstTryAccuracyPct:
      accuracyRows.length > 0
        ? Math.round((correctFirstTryCount / accuracyRows.length) * 100)
        : null,
    correctFirstTryMedianOnsetMs: median(correctFirstTryOnsets),
    otherOutcomeMedianOnsetMs: median(otherOutcomeOnsets),
    attemptCountDistribution,
    outcomeCounts,
    modeBreakdown,
  };
}

export function buildSessionPerformanceReport(
  inputMode: SessionInputMode,
  problems: SessionProblemPerformance[]
): SessionPerformanceReport {
  const orderedProblems = [...problems].sort(
    (a, b) => a.problemIndex - b.problemIndex
  );

  return {
    schemaVersion: SESSION_PERFORMANCE_SCHEMA_VERSION,
    generatedAtIso: new Date().toISOString(),
    inputMode,
    summary: buildSessionPerformanceSummary(orderedProblems),
    problems: orderedProblems,
  };
}
