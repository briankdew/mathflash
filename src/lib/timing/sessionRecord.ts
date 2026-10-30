// The session record: an append-only list of timed events, the single source
// of truth for one session (docs/timing-core-design.md, section 3).
//
// Instruments (recognizer, screen, keypad) only append events here. Response
// times are worked out afterwards by the scorer (`scorer.ts`), never while
// recording. All times are `performance.now()` milliseconds.

export type RecordEngine = 'webkit' | 'chrome' | 'native' | 'unknown';
export type RecordInputMode = 'voice' | 'keypad';
export type AcceptedVia =
  | 'final'
  | 'stable'
  | 'speechend'
  | 'end'
  | 'keypad';

export interface ProblemSpec {
  left?: number;
  right?: number;
  result?: number;
  missing?: 'left' | 'right' | 'result';
  correct?: number;
}

interface EventBase {
  /** Order of appending; unique and increasing within a record. */
  seq: number;
  /** When our code saw the event (ms). */
  t: number;
  /** The browser's own event time (`Event.timeStamp`), when it gives one. */
  browserT?: number;
}

export interface SessionStartedEvent extends EventBase {
  kind: 'session.started';
  device: string;
  browser: string;
  engine: RecordEngine;
  build: string;
  experiments: string[];
  inputMode: RecordInputMode;
  pace?: 'evaluation' | 'learning';
  settings?: Record<string, unknown>;
}

export interface ProblemShownEvent extends EventBase {
  kind: 'problem.shown';
  problemId: string;
  index: number;
  spec: ProblemSpec;
}

export interface ProblemLeftEvent extends EventBase {
  kind: 'problem.left';
  problemId: string;
  reason: 'answered' | 'ended' | 'reset';
}

export interface RecLifecycleEvent extends EventBase {
  kind: 'rec.requested' | 'rec.started' | 'rec.ended';
  recId: number;
  continuous?: boolean;
}

export interface RecSpeechEvent extends EventBase {
  kind: 'rec.speechstart' | 'rec.speechend';
  recId: number;
}

export interface RecResultEvent extends EventBase {
  kind: 'rec.result';
  recId: number;
  /** Absent in converted old logs. */
  resultIndex?: number;
  /** Only the newest piece of text, never the whole running transcript. */
  text: string;
  /** Every alternative the browser returned for this result, best first. */
  alternatives?: string[];
  isFinal: boolean;
}

export interface RecErrorEvent extends EventBase {
  kind: 'rec.error';
  recId: number;
  code: string;
}

export interface KeyEvent extends EventBase {
  kind: 'key.digit' | 'key.clear' | 'key.submit';
  digit?: string;
}

export interface AnswerAcceptedEvent extends EventBase {
  kind: 'answer.accepted';
  problemId: string;
  value: number;
  via: AcceptedVia;
  recId?: number;
  /** `seq` of the `rec.result` the answer was taken from. */
  resultSeq?: number;
  /** Which of the browser's guesses was used (0 = its best guess). */
  alternative?: number;
  /**
   * `seq` of the `rec.result` where this answer began, when the engine ran it
   * together with the previous answer in one stretch ("Seven" then "Seven
   * eight"). The scorer starts a new utterance there.
   */
  onsetSeq?: number;
}

export interface AnswerCheckedEvent extends EventBase {
  kind: 'answer.checked';
  problemId: string;
  value: number;
  correct: boolean;
}

export type SessionEvent =
  | SessionStartedEvent
  | ProblemShownEvent
  | ProblemLeftEvent
  | RecLifecycleEvent
  | RecSpeechEvent
  | RecResultEvent
  | RecErrorEvent
  | KeyEvent
  | AnswerAcceptedEvent
  | AnswerCheckedEvent;

/** An event before it is given its `seq` (Omit alone would flatten the union). */
export type EventDraft = SessionEvent extends infer E
  ? E extends SessionEvent
    ? Omit<E, 'seq'>
    : never
  : never;

export interface SessionRecord {
  events: SessionEvent[];
}
