// Decides when something the recognizer returned is an answer. Pure: it takes
// one speech event at a time and says what to do, so the rules run in tests and
// against real logs (docs/timing-core-design.md, sections 5 and 6a).
//
// Times are never worked out here. A wait is handed back as a `timer`; the
// caller runs it and comes back with `{ type: 'timer' }`.

import {
  couldGrowIntoLongerNumber,
  isDigitByDigit,
  joinNumberFragments,
  normalizeVoiceNumber,
  VoiceAnswerRange,
  VoiceNormalizationResult,
} from '../voiceNumberNormalization';
import { AcceptedVia } from './sessionRecord';

export const FINALIZE_INTERIM_DELAY_MS = 250;
// Extra time an interim number is held when it could still grow into a longer
// answer ("four" may become "fourteen").
export const GROWING_NUMBER_EXTRA_HOLD_MS = 400;

type VoiceVia = Exclude<AcceptedVia, 'keypad'>;

export interface AccepterProblem {
  problemId: string;
  /** Numbers that count as an answer, right or wrong. */
  acceptedRange: VoiceAnswerRange;
  /** Numbers that could be the answer; decides whether a number may grow. */
  answerRange: VoiceAnswerRange;
}

export interface AcceptedAnswer {
  problemId: string;
  value: number;
  rawTranscript: string;
  via: VoiceVia;
  recId: number;
  resultSeq: number;
  /** Which of the browser's guesses was used (0 = its best guess). */
  alternative: number;
  /** Where this answer began, when it ran on from the previous one. */
  onsetSeq?: number;
}

interface WaitingNumber extends Omit<AcceptedAnswer, 'via'> {
  /** The whole text of the result, before any run-on part was taken from it. */
  fullText: string;
  resultIndex?: number;
}

// The stretch of speech the last answer came from. Its later results are the
// same words arriving again, unless they add to them.
interface AnsweredStretch {
  recId: number;
  resultIndex?: number;
  text: string;
  /** The stretch so far as digits: "Seven" -> "7", then "78". */
  digits: string;
  finalSeen: boolean;
}

export interface AccepterState {
  stableInterimMs: number | null;
  problem: AccepterProblem | null;
  waiting: WaitingNumber | null;
  timerVia: VoiceVia | null;
  speechEnded: boolean;
  fragment: string | null;
  answered: AnsweredStretch | null;
  /** Where the run-on part of an answered stretch began. */
  runOnSeq: number | null;
}

export type AccepterInput =
  | { type: 'problem'; problem: AccepterProblem | null }
  | { type: 'speechstart' }
  | { type: 'speechend' }
  | {
      type: 'result';
      recId: number;
      resultIndex?: number;
      text: string;
      alternatives?: string[];
      isFinal: boolean;
      seq: number;
    }
  | { type: 'ended'; recId: number }
  | { type: 'timer' };

export type AccepterNotice = 'number_only' | 'whole_number';

export interface AccepterStep {
  state: AccepterState;
  accepted?: AcceptedAnswer;
  notice?: AccepterNotice;
  /** The number to show while it is being heard; '' clears it. */
  preview?: string;
  /** Start this wait (replacing any other); `null` cancels the wait. */
  timer?: { ms: number } | null;
}

export function createAccepter(stableInterimMs: number | null): AccepterState {
  return {
    stableInterimMs,
    problem: null,
    waiting: null,
    timerVia: null,
    speechEnded: false,
    fragment: null,
    answered: null,
    runOnSeq: null,
  };
}

const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,!?/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function pickGuess(
  text: string,
  alternatives: string[] | undefined,
  range: VoiceAnswerRange
): { result: VoiceNormalizationResult; index: number; text: string } {
  const guesses = [text, ...(alternatives ?? []).slice(1)];
  for (let index = 0; index < guesses.length; index += 1) {
    if (isDigitByDigit(guesses[index])) {
      continue;
    }
    const result = normalizeVoiceNumber(guesses[index], range);
    if (result.kind === 'valid') {
      return { result, index, text: guesses[index] };
    }
  }
  return { result: normalizeVoiceNumber(text, range), index: 0, text };
}

function accept(
  state: AccepterState,
  { fullText, resultIndex, ...answer }: WaitingNumber,
  via: VoiceVia,
  isFinal: boolean
): AccepterStep {
  const previous = state.answered;
  const sameStretch =
    previous?.recId === answer.recId && previous.resultIndex === resultIndex;
  return {
    state: {
      ...state,
      waiting: null,
      timerVia: null,
      speechEnded: false,
      fragment: null,
      runOnSeq: null,
      answered: {
        recId: answer.recId,
        resultIndex,
        text: clean(fullText),
        digits: `${sameStretch ? previous.digits : ''}${answer.value}`,
        finalSeen: isFinal,
      },
    },
    accepted: { ...answer, via },
    preview: '',
    timer: null,
  };
}

// What a result adds to the answered stretch, or null if it adds nothing: it is
// the same words, or a late revision of them ("six" -> "sixteen").
function runOnText(answered: AnsweredStretch, text: string): string | null {
  const seen = clean(text);
  if (seen.startsWith(answered.text) && seen.length > answered.text.length) {
    const rest = seen.slice(answered.text.length).trim();
    const onWordBoundary = seen[answered.text.length] === ' ';
    const isNumber =
      normalizeVoiceNumber(rest, { min: 0, max: 99 }).kind === 'valid';
    return onWordBoundary || isNumber ? rest : null;
  }
  if (
    /^\d+$/.test(seen) &&
    seen.startsWith(answered.digits) &&
    seen.length > answered.digits.length
  ) {
    return seen.slice(answered.digits.length);
  }
  return null;
}

function holdMs(state: AccepterState, rawTranscript: string): number | null {
  const { stableInterimMs, problem, speechEnded } = state;
  if (stableInterimMs === null || !problem) {
    return null;
  }
  const hold = couldGrowIntoLongerNumber(rawTranscript, problem.answerRange)
    ? stableInterimMs + GROWING_NUMBER_EXTRA_HOLD_MS
    : stableInterimMs;
  // Once the browser has reported the end of speech, don't wait longer than
  // the normal end-of-speech delay.
  return speechEnded ? Math.min(hold, FINALIZE_INTERIM_DELAY_MS) : hold;
}

function handleResult(
  state: AccepterState,
  input: Extract<AccepterInput, { type: 'result' }>
): AccepterStep {
  const { problem } = state;
  const { recId, resultIndex, seq, isFinal } = input;
  let next = state;
  let text = input.text.trim();
  let alternatives = input.alternatives;
  let onsetSeq: number | undefined;

  const answered = state.answered;
  const sameStretch =
    answered?.recId === recId && answered.resultIndex === resultIndex;
  if (answered && sameStretch) {
    if (answered.finalSeen) {
      // A finished stretch cannot grow, so this index was reused for new speech.
      next = { ...next, answered: null };
    } else {
      const runOn = runOnText(answered, text);
      if (runOn === null) {
        return {
          state: isFinal
            ? { ...next, answered: { ...answered, finalSeen: true } }
            : next,
        };
      }
      text = runOn;
      alternatives = undefined;
      onsetSeq = state.runOnSeq ?? seq;
      next = { ...next, runOnSeq: onsetSeq };
    }
  }

  if (!text || !problem) {
    return { state: next };
  }

  const { problemId, acceptedRange } = problem;
  const digitByDigit = isDigitByDigit(text);
  const guess = digitByDigit
    ? null
    : pickGuess(text, alternatives, acceptedRange);

  if (guess?.result.kind === 'valid') {
    const answer: WaitingNumber = {
      problemId,
      value: guess.result.numericValue,
      rawTranscript: guess.text,
      recId,
      resultSeq: seq,
      alternative: guess.index,
      fullText: input.text,
      resultIndex,
      ...(onsetSeq === undefined ? {} : { onsetSeq }),
    };
    if (isFinal) {
      return accept(next, answer, 'final', true);
    }

    const stableMs = holdMs(next, guess.text);
    const waiting = { ...next, waiting: answer };
    return stableMs === null
      ? { state: waiting, preview: guess.result.normalizedText }
      : {
          state: { ...waiting, timerVia: 'stable' },
          preview: guess.result.normalizedText,
          timer: { ms: stableMs },
        };
  }

  if (!isFinal) {
    // The speech changed into something that is not a valid answer.
    if (next.stableInterimMs === null) {
      return { state: next };
    }
    return {
      state: {
        ...next,
        timerVia: null,
        waiting: digitByDigit ? null : next.waiting,
      },
      timer: null,
    };
  }

  // A final result that is not a number may be the second half of one.
  if (!digitByDigit && next.fragment) {
    const joined = joinNumberFragments(next.fragment, text, acceptedRange);
    if (joined.kind === 'valid') {
      return accept(
        next,
        {
          problemId,
          value: joined.numericValue,
          rawTranscript: `${next.fragment} ${text}`,
          recId,
          resultSeq: seq,
          alternative: 0,
          fullText: input.text,
          resultIndex,
        },
        'final',
        true
      );
    }
  }

  return {
    state: {
      ...next,
      waiting: null,
      timerVia: null,
      fragment: digitByDigit ? null : text,
    },
    notice: digitByDigit ? 'whole_number' : 'number_only',
    preview: '',
    timer: null,
  };
}

export function stepAccepter(
  state: AccepterState,
  input: AccepterInput
): AccepterStep {
  switch (input.type) {
    case 'problem':
      return {
        state: {
          ...state,
          problem: input.problem,
          waiting: null,
          timerVia: null,
          speechEnded: false,
          fragment: null,
          runOnSeq: null,
        },
        preview: '',
        timer: null,
      };
    case 'speechstart':
      return {
        state: { ...state, waiting: null, timerVia: null, speechEnded: false },
        timer: null,
      };
    case 'speechend':
      return {
        state: { ...state, speechEnded: true, timerVia: 'speechend' },
        timer: { ms: FINALIZE_INTERIM_DELAY_MS },
      };
    case 'result':
      return handleResult(state, input);
    case 'ended': {
      const next: AccepterState = {
        ...state,
        answered: state.answered?.recId === input.recId ? null : state.answered,
      };
      // Safari may end without a final result: take the waiting number now.
      return state.waiting && state.stableInterimMs !== null
        ? { state: { ...next, timerVia: 'end' }, timer: { ms: 0 } }
        : { state: next };
    }
    case 'timer': {
      const { waiting, timerVia, problem } = state;
      if (!waiting || !timerVia || waiting.problemId !== problem?.problemId) {
        return { state: { ...state, timerVia: null } };
      }
      return accept(state, waiting, timerVia, false);
    }
    default:
      return { state };
  }
}
