import { createRecordingWebRecognizer } from '../recordingWebRecognizer';
import { createSessionRecorder } from '../timing/sessionRecorder';
import type { BrowserRecognition } from '../webSpeechRecognizer';

type Handler = (event: unknown) => void;

class FakeRecognition {
  lang = '';
  interimResults = false;
  maxAlternatives = 0;
  continuous = false;
  handlers: Record<string, Handler[]> = {};
  started = 0;
  stopped = 0;

  addEventListener(name: string, handler: Handler) {
    (this.handlers[name] ??= []).push(handler);
  }

  removeEventListener(name: string, handler: Handler) {
    this.handlers[name] = (this.handlers[name] ?? []).filter(h => h !== handler);
  }

  start() {
    this.started += 1;
  }

  stop() {
    this.stopped += 1;
  }

  abort() {}

  fire(name: string, event: unknown = {}) {
    [...(this.handlers[name] ?? [])].forEach(handler => handler(event));
  }
}

function setup() {
  let now = 1000;
  const recorder = createSessionRecorder(() => now);
  const made: FakeRecognition[] = [];
  const recognizer = createRecordingWebRecognizer(
    recorder,
    () => {
      const fake = new FakeRecognition();
      made.push(fake);
      return fake as unknown as BrowserRecognition;
    }
  );
  return {
    recognizer,
    recorder,
    made,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const alternatives = (...texts: string[]) =>
  texts.map(transcript => ({ transcript, confidence: 0.9 }));

describe('recordingWebRecognizer', () => {
  it('makes a new recognizer with a new recId for every start', () => {
    const { recognizer, recorder, made } = setup();
    recognizer.start({});
    made[0].fire('start');
    made[0].fire('end');
    recognizer.start({});

    expect(made).toHaveLength(2);
    expect(made[1].started).toBe(1);
    const requested = recorder
      .getRecord()
      .events.filter(e => e.kind === 'rec.requested');
    expect(requested.map(e => (e as { recId: number }).recId)).toEqual([1, 2]);
  });

  it('records lifecycle and speech events with our time and the browser time', () => {
    const { recognizer, recorder, made, advance } = setup();
    recognizer.start({ continuous: true });
    advance(100);
    made[0].fire('start', { timeStamp: 5000.5 });
    advance(900);
    made[0].fire('speechstart', { timeStamp: 5900 });

    const [requested, started, speech] = recorder.getRecord().events;
    expect(requested).toMatchObject({
      kind: 'rec.requested',
      t: 1000,
      continuous: true,
    });
    expect(started).toMatchObject({ kind: 'rec.started', t: 1100, browserT: 5000.5 });
    expect(speech).toMatchObject({ kind: 'rec.speechstart', t: 2000, browserT: 5900 });
  });

  it('records the newest text, all alternatives and the result index', () => {
    const { recognizer, recorder, made } = setup();
    recognizer.start({ maxAlternatives: 3 });
    const final = Object.assign(alternatives('eight', 'ate', 'a'), {
      isFinal: true,
    });
    made[0].fire('result', { resultIndex: 1, results: [{}, final] });

    expect(recorder.getRecord().events.pop()).toMatchObject({
      kind: 'rec.result',
      recId: 1,
      resultIndex: 1,
      text: 'eight',
      alternatives: ['eight', 'ate', 'a'],
      isFinal: true,
    });
  });

  it('records errors by code', () => {
    const { recognizer, recorder, made } = setup();
    recognizer.start({});
    made[0].fire('error', { error: 'no-speech' });
    expect(recorder.getRecord().events.pop()).toMatchObject({
      kind: 'rec.error',
      code: 'no-speech',
    });
  });

  it('delivers library-shaped payloads to listeners until removed', () => {
    const { recognizer, made } = setup();
    const onResult = jest.fn();
    const subscription = recognizer.addListener('result', onResult);
    recognizer.start({});
    const interim = Object.assign(alternatives('seven'), { isFinal: false });
    made[0].fire('result', { resultIndex: 0, results: [interim] });
    expect(onResult.mock.calls[0][0]).toMatchObject({
      isFinal: false,
      results: [{ transcript: 'seven' }],
    });

    subscription.remove();
    made[0].fire('result', { resultIndex: 0, results: [interim] });
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('removes the browser listeners when a recognizer ends', () => {
    const { recognizer, recorder, made } = setup();
    recognizer.start({});
    made[0].fire('end');
    const count = recorder.getRecord().events.length;
    made[0].fire('speechstart');
    made[0].fire('end');

    expect(recorder.getRecord().events).toHaveLength(count);
  });

  it('keeps an old recognizer apart from the new one by recId', () => {
    const { recognizer, recorder, made } = setup();
    recognizer.start({});
    recognizer.start({});
    const late = Object.assign(alternatives('late'), { isFinal: true });
    made[0].fire('result', { resultIndex: 0, results: [late] });

    expect(recorder.getRecord().events.pop()).toMatchObject({
      kind: 'rec.result',
      recId: 1,
    });
  });

  it('stops only the newest recognizer', () => {
    const { recognizer, made } = setup();
    recognizer.start({});
    recognizer.start({});
    recognizer.stop();
    expect(made.map(m => m.stopped)).toEqual([0, 1]);
  });
});
