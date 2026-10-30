import { createRecordingWebRecognizer } from '../../recordingWebRecognizer';
import { VoiceExperiments } from '../../voiceExperiments';
import {
  applyAddTestPreset,
  createInitialSessionState,
  getSessionOptionsFromState,
} from '../../../hooks/session/sessionState';
import {
  CORRECT_HOLD_MS,
  createCoreSession,
  LISTENER_WAIT_MS,
} from '../coreSession';
import { LOST_SERVICE_RETRY_MS, RETRY_DELAY_MS } from '../listeningController';
import { score } from '../scorer';
import { createSessionRecorder } from '../sessionRecorder';

const PREP_MS = 2500;

class FakeBrowserRecognition {
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  stopped = 0;
  aborted = 0;
  private handlers = new Map<string, ((event: unknown) => void)[]>();

  start() {}
  stop() {
    this.stopped += 1;
  }
  abort() {
    this.aborted += 1;
  }
  addEventListener(name: string, handler: (event: never) => void) {
    const list = this.handlers.get(name) ?? [];
    list.push(handler as (event: unknown) => void);
    this.handlers.set(name, list);
  }
  removeEventListener(name: string, handler: (event: never) => void) {
    this.handlers.set(
      name,
      (this.handlers.get(name) ?? []).filter(item => item !== handler)
    );
  }
  fire(name: string, event: unknown = {}) {
    this.handlers.get(name)?.forEach(handler => handler(event));
  }
  result(text: string, isFinal: boolean, resultIndex = 0, others: string[] = []) {
    const results: unknown[] = [];
    results[resultIndex] = Object.assign(
      [text, ...others].map(transcript => ({ transcript, confidence: 0.9 })),
      { isFinal }
    );
    this.fire('result', { resultIndex, results });
  }
}

interface SetupArgs {
  continuous: boolean;
  stableMs: number | null;
}

async function setup(
  { continuous, stableMs }: SetupArgs,
  inputMode: 'voice' | 'keypad' = 'voice',
  autoReady = true
) {
  let t = 1000;
  const recorder = createSessionRecorder(() => t);
  const made: FakeBrowserRecognition[] = [];
  const recognizer = createRecordingWebRecognizer(recorder, () => {
    const recognition = new FakeBrowserRecognition();
    made.push(recognition);
    return recognition;
  });
  const releaseMic = jest.fn();
  const core = createCoreSession({
    recorder,
    recognizer,
    prepareVoice: async () => null,
    releaseMic,
    experiments: () =>
      ({ continuous, stableInterimMs: stableMs, delayMs: 0 }) as VoiceExperiments,
    isWebKit: () => stableMs !== null,
    now: () => t,
  });
  const tick = (ms: number) => {
    t += ms;
    jest.advanceTimersByTime(ms);
  };
  const flow = () => core.getSnapshot().flow;
  const draw = () => {
    const id = flow().problem?.problemInstanceId;
    if (id) core.problemDrawn(id);
  };
  const current = () => made[made.length - 1];
  const answer = () => flow().problem?.correct ?? 0;
  const events = () => recorder.getRecord().events;
  const kinds = (kind: string) => events().filter(event => event.kind === kind);

  await core.start({
    inputMode,
    options: getSessionOptionsFromState(
      applyAddTestPreset(createInitialSessionState())
    ),
  });
  if (autoReady && inputMode === 'voice') {
    current().fire('start');
  }
  return {
    core,
    made,
    tick,
    flow,
    draw,
    current,
    answer,
    events,
    kinds,
    recorder,
    releaseMic,
    scored: () => score(recorder.getRecord()),
    snapshot: () => core.getSnapshot(),
  };
}

const CHROME = { continuous: false, stableMs: null };
const SAFARI = { continuous: true, stableMs: 500 };

describe('coreSession on Chrome (new recognizer per card)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // One spoken answer, as Chrome reports it.
  function say(session: Awaited<ReturnType<typeof setup>>, text: string) {
    const recognition = session.current();
    session.tick(800);
    recognition.fire('speechstart');
    session.tick(600);
    recognition.result(text, true);
  }

  it('runs a session: one recognizer per card, each answer counted once', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    expect(session.flow().phase).toBe('showing');

    const total = session.flow().totalProblems;
    for (let done = 0; done < total; done += 1) {
      session.draw();
      const recognition = session.current();
      say(session, String(session.answer()));
      if (done < total - 1) {
        expect(session.flow().phase).toBe('feedback');
        expect(recognition.stopped).toBe(1);
        recognition.fire('end');
        session.current().fire('start');
        expect(session.flow().phase).toBe('feedback');
        session.tick(CORRECT_HOLD_MS);
        expect(session.flow().phase).toBe('showing');
      }
    }

    session.tick(CORRECT_HOLD_MS);
    expect(session.flow().phase).toBe('idle');
    expect(session.kinds('answer.accepted')).toHaveLength(total);
    expect(session.kinds('answer.checked')).toHaveLength(total);
    expect(session.kinds('problem.shown')).toHaveLength(total);
    expect(session.made).toHaveLength(total);
    expect(session.releaseMic).toHaveBeenCalled();

    const { rows } = session.scored();
    expect(rows).toHaveLength(total);
    rows.forEach(row => {
      expect(row.outcome).toBe('correct_first_try');
      expect(row.firstResponseMs).toBe(800);
      expect(row.captureLagMs).toBe(600);
      expect(row.flags).toEqual([]);
    });
    expect(session.snapshot().report?.problems).toHaveLength(total);
  });

  it('shows the next card even if the recognizer never starts', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    say(session, String(session.answer()));
    session.current().fire('end');
    expect(session.flow().phase).toBe('feedback');
    session.tick(CORRECT_HOLD_MS);
    expect(session.flow().phase).toBe('feedback');
    session.tick(LISTENER_WAIT_MS);
    expect(session.flow().phase).toBe('showing');
  });

  it('keeps the card after a wrong answer and listens for the right one', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const first = session.flow().problem?.problemInstanceId;
    say(session, String(session.answer() - 1));
    session.current().fire('end');
    session.tick(1000);
    session.current().fire('start');

    expect(session.flow().problem?.problemInstanceId).toBe(first);
    expect(session.flow().phase).toBe('showing');
    expect(session.flow().stats).toMatchObject({ completed: 0, missedFirst: 1 });
    expect(session.flow().feedback?.result).toBe('wrong');

    say(session, String(session.answer()));
    session.current().fire('end');
    session.current().fire('start');
    session.tick(CORRECT_HOLD_MS);
    expect(session.flow().problem?.problemInstanceId).not.toBe(first);
    expect(session.flow().stats).toMatchObject({ completed: 1, missedFirst: 1 });
    expect(session.scored().rows[0].outcome).toBe('wrong_then_correct');
  });

  it('a late final never answers the next card', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const recognition = session.current();
    session.tick(500);
    recognition.fire('speechstart');
    recognition.result(String(session.answer()), false);
    recognition.fire('speechend');
    session.tick(250);
    expect(session.kinds('answer.accepted')).toHaveLength(1);
    recognition.fire('end');
    session.current().fire('start');
    session.draw();

    recognition.result(String(session.answer()), true);
    expect(session.kinds('answer.accepted')).toHaveLength(1);
  });

  it('retries when a recognizer ends with nothing, then times from first speech', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const first = session.current();
    session.tick(1000);
    first.fire('speechstart');
    session.tick(500);
    first.fire('end');
    session.tick(RETRY_DELAY_MS);
    session.current().fire('start');
    say(session, String(session.answer()));

    const row = session.scored().rows[0];
    expect(row.unrecognized).toBe(1);
    expect(row.firstResponseMs).toBe(1000);
    expect(row.flags).toEqual(['tries_before_answer']);
  });

  it('rejects a digit-by-digit answer even when a valid guess is offered', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const recognition = session.current();
    session.tick(500);
    recognition.fire('speechstart');
    recognition.result('one five', true, 0, ['15']);

    expect(session.kinds('answer.accepted')).toHaveLength(0);
    expect(session.snapshot().notice).toBe('Say the whole number');
    expect(session.flow().phase).toBe('showing');
  });

  it('survives a lost speech service and takes the outage off the time', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const first = session.current();
    session.tick(1000);
    first.fire('error', { error: 'network' });
    first.fire('end');
    expect(session.snapshot().listening.statusLabel).toBe('Lost speech service');
    expect(session.flow().phase).toBe('showing');

    session.tick(LOST_SERVICE_RETRY_MS);
    expect(session.made).toHaveLength(2);
    session.current().fire('start');
    expect(session.snapshot().listening.statusLabel).toBe('Listening…');
    say(session, String(session.answer()));

    const row = session.scored().rows[0];
    expect(row.lostMs).toBe(LOST_SERVICE_RETRY_MS);
    expect(row.firstResponseMs).toBe(1800);
    expect(row.errors).toEqual({ network: 1 });
  });

  it('stops listening for good when the microphone is refused', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const recognition = session.current();
    recognition.fire('error', { error: 'not-allowed' });
    recognition.fire('end');
    session.tick(LOST_SERVICE_RETRY_MS);

    expect(session.made).toHaveLength(1);
    expect(session.snapshot().listening.errorMessage).toBe('Permission needed');
    session.core.end();
    expect(session.flow().phase).toBe('idle');
  });

  it('ending mid-card records it and ignores anything that arrives later', async () => {
    const session = await setup(CHROME);
    session.tick(PREP_MS);
    session.draw();
    const recognition = session.current();
    session.core.end();

    expect(session.flow().phase).toBe('idle');
    expect(recognition.aborted).toBe(1);
    expect(session.events().at(-1)).toMatchObject({
      kind: 'problem.left',
      reason: 'reset',
    });
    expect(session.snapshot().report?.problems[0].outcome).toBe('no_input');

    recognition.result('12', true);
    expect(session.kinds('answer.accepted')).toHaveLength(0);
  });

  it('can end during the opening animation', async () => {
    const session = await setup(CHROME);
    session.core.end();
    session.tick(PREP_MS);
    expect(session.flow().phase).toBe('idle');
    expect(session.snapshot().report).toBeNull();
  });
});

describe('coreSession on Safari (one recognizer for the session)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // Each `index` is one stretch of speech. Holds cover numbers that could grow.
  function say(
    session: Awaited<ReturnType<typeof setup>>,
    text: string,
    resultIndex: number
  ) {
    session.tick(700);
    session.current().result(text, false, resultIndex);
    session.tick(900);
  }

  it('uses one recognizer and shows the next card after the pause', async () => {
    const session = await setup(SAFARI);
    session.tick(PREP_MS);
    session.draw();
    const first = session.flow().problem?.problemInstanceId;
    say(session, String(session.answer()), 0);

    expect(session.made).toHaveLength(1);
    expect(session.made[0].continuous).toBe(true);
    expect(session.made[0].maxAlternatives).toBe(5);
    expect(session.flow().phase).toBe('feedback');
    session.tick(CORRECT_HOLD_MS);
    expect(session.flow().phase).toBe('showing');
    expect(session.flow().problem?.problemInstanceId).not.toBe(first);
  });

  it('a late final of the last answer does not touch the next card', async () => {
    const session = await setup(SAFARI);
    session.tick(PREP_MS);
    session.draw();
    const spoken = String(session.answer());
    say(session, spoken, 0);
    session.tick(CORRECT_HOLD_MS);
    session.draw();
    session.current().result(spoken, true, 0);

    expect(session.kinds('answer.accepted')).toHaveLength(1);
    expect(session.snapshot().notice).toBeNull();

    say(session, String(session.answer()), 1);
    expect(session.kinds('answer.accepted')).toHaveLength(2);
    const { rows, onsetSource } = session.scored();
    expect(onsetSource).toBe('first_text');
    expect(rows[1].firstResponseMs).toBe(700);
    expect(rows[1].flags).toEqual([]);
  });

  it('separates a second answer run into the first ("Seven eight")', async () => {
    const session = await setup(SAFARI);
    session.tick(PREP_MS);
    session.draw();
    const firstAnswer = session.answer();
    say(session, String(firstAnswer), 0);
    session.tick(CORRECT_HOLD_MS);
    session.draw();
    const secondAnswer = session.answer();
    say(session, `${firstAnswer} ${secondAnswer}`, 0);

    expect(session.kinds('answer.accepted')).toHaveLength(2);
    expect(session.kinds('answer.accepted')[1]).toMatchObject({
      value: secondAnswer,
    });
    const row = session.scored().rows[1];
    expect(row.firstResponseMs).toBe(700);
    expect(row.flags).toEqual([]);
  });

  it('restarts at once when the recognizer ends on its own', async () => {
    const session = await setup(SAFARI);
    session.tick(PREP_MS);
    session.draw();
    session.current().fire('end');
    expect(session.made).toHaveLength(2);
    session.current().fire('start');
    say(session, String(session.answer()), 0);
    expect(session.kinds('answer.accepted')).toHaveLength(1);
  });
});

describe('coreSession start', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts listening during the opening animation', async () => {
    const session = await setup(CHROME);
    expect(session.flow().phase).toBe('preparing');
    expect(session.made).toHaveLength(1);
  });

  it('holds the first card for a slow recognizer, but not for long', async () => {
    const slow = await setup(CHROME, 'voice', false);
    slow.tick(PREP_MS);
    expect(slow.flow().phase).toBe('preparing');
    slow.current().fire('start');
    expect(slow.flow().phase).toBe('showing');

    const stuck = await setup(CHROME, 'voice', false);
    stuck.tick(PREP_MS + LISTENER_WAIT_MS);
    expect(stuck.flow().phase).toBe('showing');
  });

  it('does not start when voice is not ready', async () => {
    let t = 0;
    const recorder = createSessionRecorder(() => t);
    const core = createCoreSession({
      recorder,
      recognizer: createRecordingWebRecognizer(recorder, () => {
        t += 1;
        return new FakeBrowserRecognition();
      }),
      prepareVoice: async () => 'Microphone permission needed',
      releaseMic: jest.fn(),
      experiments: () => ({ continuous: false, stableInterimMs: null }) as VoiceExperiments,
      isWebKit: () => false,
      now: () => t,
    });
    const message = await core.start({
      inputMode: 'voice',
      options: getSessionOptionsFromState(
        applyAddTestPreset(createInitialSessionState())
      ),
    });
    expect(message).toBe('Microphone permission needed');
    expect(core.getSnapshot().flow.phase).toBe('idle');
    expect(core.getSnapshot().listening.errorMessage).toBe(message);
  });
});

describe('coreSession with the keypad', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('times from the first digit, needs no recognizer, and keeps the card when wrong', async () => {
    const session = await setup(CHROME, 'keypad');
    session.tick(PREP_MS);
    session.draw();
    expect(session.made).toHaveLength(0);

    const firstId = session.flow().problem?.problemInstanceId;
    session.tick(700);
    session.core.keyDigit('1');
    session.tick(200);
    session.core.submitKeypad(firstId, 99);

    expect(session.flow().problem?.problemInstanceId).toBe(firstId);
    session.tick(500);
    session.core.submitKeypad(firstId, session.answer());
    session.tick(CORRECT_HOLD_MS);
    expect(session.flow().problem?.problemInstanceId).not.toBe(firstId);
    const row = session.scored().rows[0];
    expect(row.outcome).toBe('wrong_then_correct');
    expect(row.firstResponseMs).toBe(700);
  });

  it('ignores a submit for a card that has gone', async () => {
    const session = await setup(CHROME, 'keypad');
    session.tick(PREP_MS);
    session.draw();
    const firstId = session.flow().problem?.problemInstanceId;
    const right = session.answer();
    session.core.submitKeypad(firstId, right);
    session.core.submitKeypad(firstId, right);
    expect(session.kinds('answer.accepted')).toHaveLength(1);
  });
});
