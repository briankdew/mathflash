// Appends events to the session record (docs/timing-core-design.md, section 3).
// Instruments call `append`; nothing here makes a timing decision.

import { EventDraft, SessionEvent, SessionRecord } from './sessionRecord';

/** An event as an instrument supplies it: the recorder adds `t` and `seq`. */
export type RecorderDraft = EventDraft extends infer E
  ? E extends EventDraft
    ? Omit<E, 't'>
    : never
  : never;

export interface SessionRecorder {
  append: (draft: RecorderDraft) => SessionEvent;
  getRecord: () => SessionRecord;
  reset: () => void;
}

const defaultClock = () => globalThis.performance?.now() ?? Date.now();

export function createSessionRecorder(
  clock: () => number = defaultClock
): SessionRecorder {
  let events: SessionEvent[] = [];
  return {
    append: draft => {
      const event = { ...draft, t: clock(), seq: events.length } as SessionEvent;
      events = [...events, event];
      return event;
    },
    getRecord: () => ({ events }),
    reset: () => {
      events = [];
    },
  };
}

// The record of the running session; reset when a session starts.
export const sessionRecorder = createSessionRecorder();
