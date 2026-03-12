export const sessionPrepTimeline = {
  tuck: 500,
  beat: 150,
  roll: 300,
  postRollPause: 500,
  flip: 300,
  pauseAfterLeftFlip: 700,
  pauseAfterRightFlip: 700,
  pauseAfterResultFlip: 1000,
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
    sessionPrepTimeline.pauseAfterResultFlip,
} as const;
