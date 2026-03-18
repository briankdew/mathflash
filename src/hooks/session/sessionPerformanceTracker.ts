import {
  AnswerAttempt,
  AnswerCheckResult,
  OperationMode,
  ProblemDisplay,
  ResponseOnsetSource,
  SessionInputMode,
  SessionProblemOutcome,
  SessionProblemPerformance,
} from '../../lib/types';

export function createSessionPerformanceRow(
  problem: ProblemDisplay,
  inputMode: SessionInputMode,
  operation: OperationMode
): SessionProblemPerformance | null {
  if (
    !problem.problemInstanceId ||
    problem.presentedAtPerf === undefined ||
    problem.problemIndex === undefined
  ) {
    return null;
  }

  return {
    problemInstanceId: problem.problemInstanceId,
    problemIndex: problem.problemIndex,
    inputMode,
    operation,
    left: problem.left,
    right: problem.right,
    result: problem.result,
    missing: problem.missing,
    correct: problem.correct,
    presentedAtPerfMs: problem.presentedAtPerf,
    firstInputOnsetPerfMs: null,
    responseOnsetLatencyMs: null,
    onsetSource: 'none',
    firstAttemptCompletedAtPerfMs: null,
    completionLatencyMs: null,
    outcome: 'no_input',
    attemptCount: 0,
    isResolved: false,
    submittedValues: [],
    voiceDiagnostics: {
      speechStartPerfMs: null,
      speechEndPerfMs: null,
      finalResultPerfMs: null,
      voiceProcessingMs: null,
      transcript: null,
    },
    keypadDiagnostics: {
      firstDigitPerfMs: null,
    },
  };
}

export function recordPerformanceInputOnset(
  rows: SessionProblemPerformance[],
  problemInstanceId: string | undefined,
  onsetSource: ResponseOnsetSource,
  perfMs: number
): SessionProblemPerformance[] {
  if (!problemInstanceId) {
    return rows;
  }

  return rows.map(row => {
    if (
      row.problemInstanceId !== problemInstanceId ||
      row.firstInputOnsetPerfMs !== null
    ) {
      return row;
    }

    return {
      ...row,
      firstInputOnsetPerfMs: perfMs,
      responseOnsetLatencyMs: Math.max(0, perfMs - row.presentedAtPerfMs),
      onsetSource,
      voiceDiagnostics:
        onsetSource === 'speechstart'
          ? { ...row.voiceDiagnostics, speechStartPerfMs: perfMs }
          : row.voiceDiagnostics,
      keypadDiagnostics:
        onsetSource === 'first_digit'
          ? { ...row.keypadDiagnostics, firstDigitPerfMs: perfMs }
          : row.keypadDiagnostics,
    };
  });
}

export function recordPerformanceAttempt(
  rows: SessionProblemPerformance[],
  problemInstanceId: string | undefined,
  attempt: AnswerAttempt,
  result: Exclude<AnswerCheckResult, 'incomplete'>,
  nowMs: number = performance.now()
): SessionProblemPerformance[] {
  if (!problemInstanceId) {
    return rows;
  }

  return rows.map(row => {
    if (row.problemInstanceId !== problemInstanceId) {
      return row;
    }

    const completedAtPerfMs = attempt.completedAtPerfMs ?? nowMs;
    const nextAttemptCount = row.attemptCount + 1;
    const isCorrectFirstTry = result === 'correct' && row.attemptCount === 0;
    const outcome: SessionProblemOutcome =
      result === 'correct'
        ? isCorrectFirstTry
          ? 'correct_first_try'
          : 'wrong_then_correct'
        : 'wrong_only';

    return {
      ...row,
      firstAttemptCompletedAtPerfMs:
        row.firstAttemptCompletedAtPerfMs ?? completedAtPerfMs,
      completionLatencyMs:
        row.completionLatencyMs ??
        Math.max(0, completedAtPerfMs - row.presentedAtPerfMs),
      attemptCount: nextAttemptCount,
      outcome,
      isResolved: result === 'correct',
      submittedValues: [...row.submittedValues, attempt.value],
      voiceDiagnostics:
        attempt.source === 'voice'
          ? {
              speechStartPerfMs:
                row.voiceDiagnostics.speechStartPerfMs ??
                attempt.speechStartPerfMs ??
                null,
              speechEndPerfMs:
                attempt.speechEndPerfMs ?? row.voiceDiagnostics.speechEndPerfMs,
              finalResultPerfMs:
                attempt.finalResultPerfMs ??
                row.voiceDiagnostics.finalResultPerfMs,
              voiceProcessingMs:
                attempt.voiceProcessingMs ??
                row.voiceDiagnostics.voiceProcessingMs,
              transcript:
                attempt.rawTranscript ?? row.voiceDiagnostics.transcript,
            }
          : row.voiceDiagnostics,
      keypadDiagnostics:
        attempt.source === 'keypad'
          ? {
              firstDigitPerfMs:
                row.keypadDiagnostics.firstDigitPerfMs ??
                attempt.firstDigitPerfMs ??
                null,
            }
          : row.keypadDiagnostics,
    };
  });
}

export function getPerformanceFirstDigitPerfMs(
  rows: SessionProblemPerformance[],
  problemInstanceId: string | undefined
): number | null {
  if (!problemInstanceId) {
    return null;
  }

  const activeRow = rows.find(row => row.problemInstanceId === problemInstanceId);
  return activeRow?.keypadDiagnostics.firstDigitPerfMs ?? null;
}

export function finalizeSessionPerformanceRows(
  rows: SessionProblemPerformance[],
  wasReset: boolean
): SessionProblemPerformance[] {
  return rows.map(row => {
    if (row.isResolved) {
      return row;
    }

    if (row.attemptCount > 0) {
      return {
        ...row,
        outcome: 'wrong_only',
        isResolved: true,
      };
    }

    return {
      ...row,
      outcome:
        wasReset && row.firstInputOnsetPerfMs !== null
          ? 'reset_incomplete'
          : 'no_input',
      isResolved: true,
    };
  });
}
