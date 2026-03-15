import { SessionPrepSchedule, StartMode } from './types';

export const sessionPrepTimeline = {
  tuck: 500,
  beat: 150,
  roll: 300,
  firstProblemDissolve: 220,
  operatorColorDissolve: 300,
  pauseAfterOperatorDissolve: 0,
  postRollPause: 500,
  flip: 300,
  pauseAfterLeftFlip: 750,
  pauseAfterRightFlip: 750,
  pauseAfterResultFlip: 750,
  pauseAfterFinalFlip: 750,
} as const;

const fullFinalFlipAt =
  sessionPrepTimeline.tuck +
  sessionPrepTimeline.beat +
  sessionPrepTimeline.roll +
  sessionPrepTimeline.postRollPause +
  sessionPrepTimeline.flip +
  sessionPrepTimeline.pauseAfterLeftFlip +
  sessionPrepTimeline.flip +
  sessionPrepTimeline.pauseAfterRightFlip +
  sessionPrepTimeline.flip +
  sessionPrepTimeline.pauseAfterResultFlip;

const minFinalFlipAt =
  sessionPrepTimeline.tuck +
  sessionPrepTimeline.beat +
  sessionPrepTimeline.roll +
  sessionPrepTimeline.postRollPause;

// After the shared final flip starts, the card-flip branch and operator-color branch run in parallel.
// First-problem reveal waits for whichever branch finishes later.
const postFinalSharedWindow = Math.max(
  sessionPrepTimeline.flip + sessionPrepTimeline.pauseAfterFinalFlip,
  sessionPrepTimeline.operatorColorDissolve + sessionPrepTimeline.pauseAfterOperatorDissolve,
);

export const sessionPrepMarks = {
  stadiumHideAt: sessionPrepTimeline.tuck + sessionPrepTimeline.beat,
  keypadRollStartAt: sessionPrepTimeline.tuck + sessionPrepTimeline.beat,
  leftFlipAt:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause,
  rightFlipAt:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterLeftFlip,
  resultFlipAt:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterLeftFlip +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterRightFlip,
  finalFlipAt: fullFinalFlipAt,
  finalFlipAtMin: minFinalFlipAt,
  totalPrep: fullFinalFlipAt + postFinalSharedWindow,
  totalPrepMin: minFinalFlipAt + postFinalSharedWindow,
} as const;

export function getSessionPrepSchedule(startMode: StartMode): SessionPrepSchedule {
  const prepDurationMs = startMode === 'min' ? sessionPrepMarks.totalPrepMin : sessionPrepMarks.totalPrep;

  return {
    startMode,
    prepDurationMs,
    stadiumHideAtMs: sessionPrepMarks.stadiumHideAt,
    firstProblemAtMs: prepDurationMs,
    timerStartDelayMs: sessionPrepTimeline.firstProblemDissolve,
    inputUnlockDelayMs: sessionPrepTimeline.firstProblemDissolve,
    inputUnlockAtMs: prepDurationMs + sessionPrepTimeline.firstProblemDissolve,
  };
}
