// Fills the existing Performance sheet from scored rows, until the new sheet
// arrives (docs/timing-core-design.md, section 9).

import { buildSessionPerformanceReport } from '../sessionPerformance';
import {
  OperationMode,
  SessionPerformanceReport,
  SessionProblemOutcome,
  SessionProblemPerformance,
} from '../types';
import { ProblemRow, ScoredSession } from './scorer';

function toPerformanceRow(
  row: ProblemRow,
  operation: OperationMode
): SessionProblemPerformance {
  const outcome: SessionProblemOutcome =
    row.outcome === 'no_answer' ? 'no_input' : row.outcome;
  const onsetSource =
    row.firstResponseMs === null
      ? 'none'
      : row.inputMode === 'keypad'
        ? 'first_digit'
        : 'speechstart';

  return {
    problemInstanceId: row.problemId,
    problemIndex: row.index,
    inputMode: row.inputMode,
    operation,
    left: row.spec.left ?? 0,
    right: row.spec.right ?? 0,
    result: row.spec.result ?? 0,
    missing: row.spec.missing ?? 'result',
    correct: row.spec.correct ?? 0,
    presentedAtPerfMs: 0,
    firstInputOnsetPerfMs: null,
    responseOnsetLatencyMs: row.firstResponseMs,
    onsetSource,
    firstAttemptCompletedAtPerfMs: null,
    completionLatencyMs: row.correctResponseMs,
    outcome,
    attemptCount: row.attempts.length,
    isResolved: true,
    submittedValues: row.attempts.map(attempt => String(attempt.value)),
    voiceDiagnostics: {
      speechStartPerfMs: null,
      speechEndPerfMs: null,
      finalResultPerfMs: null,
      voiceProcessingMs: null,
      captureLagMs: row.captureLagMs,
      recognizerReadyLagMs: row.startupLagMs,
      emptyTryMs: null,
      transcript: null,
    },
    keypadDiagnostics: {
      firstDigitPerfMs: null,
    },
  };
}

export function scoredToReport(
  scored: ScoredSession,
  operation: OperationMode
): SessionPerformanceReport | null {
  if (scored.rows.length === 0) {
    return null;
  }
  return buildSessionPerformanceReport(
    scored.inputMode,
    scored.rows.map(row => toPerformanceRow(row, operation))
  );
}
