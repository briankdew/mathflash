export const sessionPrepTimeline = {
  tuck: 500,
  beat: 150,
  roll: 300,
  firstProblemDissolve: 220,
  postRollPause: 500,
  flip: 300,
  pauseAfterLeftFlip: 750,
  pauseAfterRightFlip: 750,
  pauseAfterResultFlip: 750,
  pauseAfterFinalFlip: 750,
} as const;

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
  finalFlipAt:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterLeftFlip +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterRightFlip +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterResultFlip,
  finalFlipAtMin:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause,
  totalPrep:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterLeftFlip +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterRightFlip +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterResultFlip +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterFinalFlip,
  totalPrepMin:
    sessionPrepTimeline.tuck +
    sessionPrepTimeline.beat +
    sessionPrepTimeline.roll +
    sessionPrepTimeline.postRollPause +
    sessionPrepTimeline.flip +
    sessionPrepTimeline.pauseAfterFinalFlip,
} as const;
