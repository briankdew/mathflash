// The scorer: a pure function from a session record to per-problem rows and a
// session summary (docs/timing-core-design.md, section 4, decisions D1-D3).
// No browser code, so it runs in tests and in the log script. Changing a rule
// bumps SCORER_VERSION so old records can be rescored.

import { normalizeVoiceNumber } from '../voiceNumberNormalization';
import {
  AnswerAcceptedEvent,
  ProblemSpec,
  RecordEngine,
  RecordInputMode,
  RecResultEvent,
  SessionEvent,
  SessionRecord,
} from './sessionRecord';

export const SCORER_VERSION = 1;

/** Where utterance onsets come from; one source per session, never mixed. */
export type OnsetSource = 'speechstart' | 'first_text' | 'keypad';

export type ProblemOutcome =
  | 'correct_first_try'
  | 'wrong_then_correct'
  | 'wrong_only'
  | 'no_answer';

export type ScoreFlag =
  /** D1 applied: response starts at the first empty or non-number try. */
  | 'tries_before_answer'
  /** A spoken number nothing accepted (the old code ignored it). */
  | 'unaccepted_number'
  | 'onset_before_shown'
  | 'no_utterance';

export interface AttemptRow {
  value: number;
  correct: boolean | null;
  via: string;
  /** Start of the answer (after D1), problem shown -> onset. */
  responseMs: number | null;
  /** Speech onset -> answer accepted: the engine's share. */
  captureLagMs: number | null;
  /** Empty or non-number tries joined into this attempt (D1). */
  joinedTries: number;
}

export interface ProblemRow {
  problemId: string;
  index: number;
  spec: ProblemSpec;
  inputMode: RecordInputMode;
  outcome: ProblemOutcome;
  attempts: AttemptRow[];
  /** D3: the time to the first answer, right or wrong. */
  firstResponseMs: number | null;
  /** The time to the accepted correct answer. */
  correctResponseMs: number | null;
  captureLagMs: number | null;
  startupLagMs: number;
  utterances: number;
  unrecognized: number;
  fragments: number;
  restarts: number;
  errors: Record<string, number>;
  flags: ScoreFlag[];
  onsetSource: OnsetSource;
  scorerVersion: number;
}

export interface SpreadStats {
  count: number;
  medianMs: number | null;
  /** Middle half of the values: smaller means more consistent. */
  spreadMs: number | null;
}

export interface SessionSummary {
  problems: number;
  answeredCorrectly: number;
  response: SpreadStats;
  captureLag: SpreadStats;
}

export interface ScoredSession {
  scorerVersion: number;
  engine: RecordEngine;
  inputMode: RecordInputMode;
  onsetSource: OnsetSource;
  rows: ProblemRow[];
  summary: SessionSummary;
}

const NUMBER_RANGE = { min: 0, max: 99 };

interface Utterance {
  recId: number;
  onsetT: number;
  results: RecResultEvent[];
  closed: boolean;
  resultIndex?: number;
}

type UtteranceKind = 'empty' | 'fragment' | 'number';

function lastText(utterance: Utterance): string {
  return utterance.results[utterance.results.length - 1]?.text ?? '';
}

function kindOf(utterance: Utterance): UtteranceKind {
  const text = lastText(utterance);
  if (!text.trim()) return 'empty';
  return normalizeVoiceNumber(text, NUMBER_RANGE).kind === 'valid'
    ? 'number'
    : 'fragment';
}

// Builds the session's utterances. An utterance is one stretch of speech. With
// `speechstart` as the source each speechstart opens one; with `first_text`
// (Safari) the first text does. A final result closes the utterance, and a
// different `resultIndex` starts a new one.
function buildUtterances(
  events: SessionEvent[],
  source: OnsetSource
): Utterance[] {
  const utterances: Utterance[] = [];
  const open = new Map<number, Utterance>();
  for (const event of events) {
    if (event.kind === 'rec.speechstart' && source === 'speechstart') {
      const utterance: Utterance = {
        recId: event.recId,
        onsetT: event.t,
        results: [],
        closed: false,
      };
      utterances.push(utterance);
      open.set(event.recId, utterance);
    } else if (event.kind === 'rec.result') {
      let utterance = open.get(event.recId);
      const startsNew =
        !utterance ||
        (source === 'first_text' &&
          (utterance.closed ||
            (event.resultIndex !== undefined &&
              utterance.resultIndex !== undefined &&
              event.resultIndex !== utterance.resultIndex)));
      if (startsNew) {
        utterance = {
          recId: event.recId,
          onsetT: event.t,
          results: [],
          closed: false,
        };
        utterances.push(utterance);
        open.set(event.recId, utterance);
      }
      utterance!.results.push(event);
      utterance!.resultIndex = event.resultIndex ?? utterance!.resultIndex;
      if (event.isFinal) utterance!.closed = true;
    } else if (event.kind === 'rec.ended') {
      open.delete(event.recId);
    }
  }
  return utterances;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

export function spreadStats(values: number[]): SpreadStats {
  if (values.length === 0) {
    return { count: 0, medianMs: null, spreadMs: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    medianMs: quantile(sorted, 0.5),
    spreadMs:
      sorted.length < 2 ? null : quantile(sorted, 0.75) - quantile(sorted, 0.25),
  };
}

export function score(record: SessionRecord): ScoredSession {
  const events = record.events;
  const started = events.find(event => event.kind === 'session.started');
  const engine: RecordEngine = started?.engine ?? 'unknown';
  const inputMode: RecordInputMode = started?.inputMode ?? 'voice';
  const hasSpeechStart = events.some(event => event.kind === 'rec.speechstart');
  const onsetSource: OnsetSource =
    inputMode === 'keypad'
      ? 'keypad'
      : engine !== 'webkit' && hasSpeechStart
        ? 'speechstart'
        : 'first_text';

  const utterances =
    inputMode === 'voice' ? buildUtterances(events, onsetSource) : [];

  const rows: ProblemRow[] = [];
  events.forEach((shown, position) => {
    if (shown.kind !== 'problem.shown') return;
    const rest = events.slice(position + 1);
    const endEvent = rest.find(
      event =>
        (event.kind === 'problem.left' && event.problemId === shown.problemId) ||
        event.kind === 'problem.shown'
    );
    const windowEnd = endEvent ? endEvent.t : Infinity;
    const inWindow = (t: number) => t >= shown.t && t < windowEnd;
    const windowEvents = events.filter(
      event => event.seq > shown.seq && inWindow(event.t)
    );

    const flags = new Set<ScoreFlag>();
    const own = utterances
      .filter(u => inWindow(u.onsetT))
      .sort((a, b) => a.onsetT - b.onsetT);
    const accepted = events.filter(
      (event): event is AnswerAcceptedEvent =>
        event.kind === 'answer.accepted' && event.problemId === shown.problemId
    );

    // Which utterance each attempt came from.
    const attemptUtterances = accepted.map(attempt => {
      if (attempt.via === 'keypad') {
        return null;
      }
      const byResult = utterances.find(u =>
        u.results.some(result => result.seq === attempt.resultSeq)
      );
      if (byResult) return byResult;
      const earlier = own.filter(u => u.onsetT <= attempt.t && lastText(u));
      return earlier[earlier.length - 1] ?? null;
    });

    let previousIndex = -1;
    const attempts: AttemptRow[] = accepted.map((attempt, i) => {
      const checked = events.find(
        event =>
          event.kind === 'answer.checked' &&
          event.problemId === shown.problemId &&
          event.seq > attempt.seq
      );
      const correct = checked?.kind === 'answer.checked' ? checked.correct : null;

      let onsetT: number | null = null;
      let captureLagMs: number | null = null;
      let joinedTries = 0;
      if (attempt.via === 'keypad') {
        const digits = windowEvents.filter(
          event => event.kind === 'key.digit' && event.seq < attempt.seq
        );
        const previousT = i > 0 ? accepted[i - 1].t : shown.t;
        const first = digits.find(event => event.t >= previousT);
        onsetT = first?.t ?? attempt.t;
      } else {
        const utterance = attemptUtterances[i];
        if (!utterance) {
          flags.add('no_utterance');
        } else {
          const index = own.indexOf(utterance);
          onsetT = utterance.onsetT;
          captureLagMs = Math.max(0, attempt.t - utterance.onsetT);
          // D1: empty and non-number tries since the previous attempt belong
          // to this answer; a spoken number nothing accepted stops the chain.
          let start = index < 0 ? -1 : index;
          for (let j = index - 1; j > previousIndex && j >= 0; j -= 1) {
            if (kindOf(own[j]) === 'number') break;
            start = j;
          }
          if (start >= 0 && start < index) {
            joinedTries = index - start;
            onsetT = own[start].onsetT;
            flags.add('tries_before_answer');
          }
          if (index >= 0) previousIndex = index;
        }
      }

      let responseMs: number | null = null;
      if (onsetT !== null) {
        responseMs = onsetT - shown.t;
        if (responseMs < 0) {
          responseMs = 0;
          flags.add('onset_before_shown');
        }
      }
      return {
        value: attempt.value,
        correct,
        via: attempt.via,
        responseMs,
        captureLagMs,
        joinedTries,
      };
    });

    const accepts = new Set(attemptUtterances);
    for (const utterance of own) {
      if (kindOf(utterance) === 'number' && !accepts.has(utterance)) {
        flags.add('unaccepted_number');
      }
    }

    const correctAttempt = attempts.find(attempt => attempt.correct === true);
    const outcome: ProblemOutcome = correctAttempt
      ? attempts[0] === correctAttempt
        ? 'correct_first_try'
        : 'wrong_then_correct'
      : attempts.length > 0
        ? 'wrong_only'
        : 'no_answer';

    // Recognizer startup after the problem appeared; restarts are measured
    // from the previous recognizer's end.
    let startupLagMs = 0;
    let restarts = 0;
    for (const event of windowEvents) {
      if (event.kind === 'rec.started') {
        const requested = events.find(
          e => e.kind === 'rec.requested' && e.recId === event.recId
        );
        const priorEnd = [...events]
          .reverse()
          .find(
            e =>
              e.kind === 'rec.ended' &&
              e.seq < (requested?.seq ?? event.seq) &&
              e.t >= shown.t
          );
        const base = priorEnd
          ? priorEnd.t
          : Math.max(requested?.t ?? event.t, shown.t);
        startupLagMs += Math.max(0, event.t - base);
        if (priorEnd) restarts += 1;
      }
    }

    const errors: Record<string, number> = {};
    for (const event of windowEvents) {
      if (event.kind === 'rec.error') {
        errors[event.code] = (errors[event.code] ?? 0) + 1;
      }
    }

    const correctIndex = correctAttempt ? attempts.indexOf(correctAttempt) : -1;
    rows.push({
      problemId: shown.problemId,
      index: shown.index,
      spec: shown.spec,
      inputMode,
      outcome,
      attempts,
      firstResponseMs: attempts[0]?.responseMs ?? null,
      correctResponseMs:
        correctIndex >= 0 ? attempts[correctIndex].responseMs : null,
      captureLagMs:
        (correctIndex >= 0 ? attempts[correctIndex] : attempts[0])
          ?.captureLagMs ?? null,
      startupLagMs,
      utterances: own.length,
      unrecognized: own.filter(u => kindOf(u) === 'empty').length,
      fragments: own.filter(u => kindOf(u) === 'fragment').length,
      restarts,
      errors,
      flags: [...flags],
      onsetSource,
      scorerVersion: SCORER_VERSION,
    });
  });

  const present = <T>(values: (T | null)[]): T[] =>
    values.filter((value): value is T => value !== null);
  return {
    scorerVersion: SCORER_VERSION,
    engine,
    inputMode,
    onsetSource,
    rows,
    summary: {
      problems: rows.length,
      answeredCorrectly: rows.filter(row => row.correctResponseMs !== null)
        .length,
      response: spreadStats(present(rows.map(row => row.firstResponseMs))),
      captureLag: spreadStats(present(rows.map(row => row.captureLagMs))),
    },
  };
}
