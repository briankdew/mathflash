import {
  createListeningController,
  ListeningStatus,
  LOST_SERVICE_RETRY_MS,
  RETRY_DELAY_MS,
  STOP_WAIT_MS,
} from '../listeningController';
import { EventDraft, SessionEvent } from '../sessionRecord';

function setup(continuous: boolean, minGapMs = 0) {
  let t = 0;
  let recId = 0;
  let seq = 0;
  const statuses: ListeningStatus[] = [];
  const onListenerReady = jest.fn();
  const started: { continuous?: boolean; maxAlternatives?: number }[] = [];
  const recognizer = {
    start: jest.fn(options => {
      recId += 1;
      started.push(options);
      send({ kind: 'rec.requested', recId, t });
    }),
    stop: jest.fn(),
    abort: jest.fn(),
  };
  const controller = createListeningController({
    recognizer,
    continuous,
    minGapMs,
    now: () => t,
    onListenerReady,
    onStatus: status => statuses.push(status),
  });
  function send(draft: EventDraft) {
    controller.handleEvent({ ...draft, seq: seq++ } as SessionEvent);
  }
  return {
    controller,
    recognizer,
    started,
    statuses,
    onListenerReady,
    lastStatus: () => statuses[statuses.length - 1],
    recId: () => recId,
    tick: (ms: number) => {
      t += ms;
      jest.advanceTimersByTime(ms);
    },
    fire: (kind: 'rec.started' | 'rec.ended', id = recId) =>
      send({ kind, recId: id, t }),
    error: (code: string) => send({ kind: 'rec.error', recId, code, t }),
    result: (text: string) =>
      send({ kind: 'rec.result', recId, text, isFinal: true, t }),
  };
}

describe('listeningController', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('asks the browser for several guesses', () => {
    const { controller, started } = setup(false);
    controller.start();
    expect(started[0]).toMatchObject({ continuous: false, maxAlternatives: 5 });
  });

  it('reports ready when the recognizer starts', () => {
    const { controller, fire, onListenerReady, lastStatus } = setup(false);
    controller.start();
    expect(onListenerReady).not.toHaveBeenCalled();
    fire('rec.started');
    expect(onListenerReady).toHaveBeenCalledTimes(1);
    expect(lastStatus().isListening).toBe(true);
  });

  describe('one recognizer for the session', () => {
    it('restarts at once when it ends on its own', () => {
      const { controller, fire, recognizer, started } = setup(true);
      controller.start();
      fire('rec.started');
      fire('rec.ended');
      expect(recognizer.start).toHaveBeenCalledTimes(2);
      expect(started[1].continuous).toBe(true);
    });
  });

  describe('a new recognizer per card', () => {
    it('stops the old one and starts the next as soon as it ends', () => {
      const { controller, fire, recognizer } = setup(false);
      controller.start();
      fire('rec.started');
      controller.readyForNextCard();
      expect(recognizer.stop).toHaveBeenCalledTimes(1);
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      fire('rec.ended');
      expect(recognizer.start).toHaveBeenCalledTimes(2);
      expect(recognizer.abort).not.toHaveBeenCalled();
    });

    it('aborts a recognizer that does not end, then starts anyway', () => {
      const { controller, fire, recognizer, tick } = setup(false);
      controller.start();
      fire('rec.started');
      controller.readyForNextCard();
      tick(STOP_WAIT_MS);
      expect(recognizer.abort).toHaveBeenCalledTimes(1);
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      tick(STOP_WAIT_MS);
      expect(recognizer.start).toHaveBeenCalledTimes(2);
    });

    it('starts at once if the old one has already ended', () => {
      const { controller, fire, recognizer, tick } = setup(false);
      controller.start();
      fire('rec.started');
      fire('rec.ended');
      controller.readyForNextCard();
      expect(recognizer.stop).not.toHaveBeenCalled();
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      tick(RETRY_DELAY_MS);
      expect(recognizer.start).toHaveBeenCalledTimes(2);
    });

    it('retries after a short gap when one ends with nothing', () => {
      const { controller, fire, error, recognizer, tick, lastStatus } = setup(false);
      controller.start();
      fire('rec.started');
      error('no-speech');
      expect(lastStatus().statusLabel).toBe('Retrying…');
      fire('rec.ended');
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      tick(RETRY_DELAY_MS);
      expect(recognizer.start).toHaveBeenCalledTimes(2);
    });

    it('keeps the minimum gap of the delay switch', () => {
      const { controller, fire, recognizer, tick } = setup(false, 1000);
      controller.start();
      fire('rec.started');
      controller.readyForNextCard();
      fire('rec.ended');
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      tick(1000);
      expect(recognizer.start).toHaveBeenCalledTimes(2);
    });

    it('ignores events from an old recognizer', () => {
      const { controller, fire, onListenerReady, recognizer, tick } = setup(false);
      controller.start();
      fire('rec.started');
      controller.readyForNextCard();
      tick(STOP_WAIT_MS * 2);
      expect(recognizer.start).toHaveBeenCalledTimes(2);
      onListenerReady.mockClear();
      fire('rec.started', 1);
      fire('rec.ended', 1);
      tick(RETRY_DELAY_MS);
      expect(onListenerReady).not.toHaveBeenCalled();
      expect(recognizer.start).toHaveBeenCalledTimes(2);
    });
  });

  describe('speech service lost', () => {
    it('shows a message and keeps retrying until the service answers', () => {
      const { controller, fire, error, result, recognizer, tick, lastStatus } =
        setup(false);
      controller.start();
      fire('rec.started');
      error('network');
      expect(lastStatus().statusLabel).toBe('Lost speech service');
      fire('rec.ended');
      tick(LOST_SERVICE_RETRY_MS - 1);
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      tick(1);
      expect(recognizer.start).toHaveBeenCalledTimes(2);

      fire('rec.started');
      expect(lastStatus().statusLabel).toBe('Listening…');
      error('network');
      fire('rec.ended');
      tick(LOST_SERVICE_RETRY_MS);
      expect(recognizer.start).toHaveBeenCalledTimes(3);

      fire('rec.started');
      result('eight');
      fire('rec.ended');
      tick(RETRY_DELAY_MS);
      expect(recognizer.start).toHaveBeenCalledTimes(4);
    });

    it('does not start a new recognizer early for the next card', () => {
      const { controller, fire, error, recognizer } = setup(false);
      controller.start();
      fire('rec.started');
      error('network');
      fire('rec.ended');
      controller.readyForNextCard();
      expect(recognizer.start).toHaveBeenCalledTimes(1);
    });

    it('works the same with one recognizer for the session', () => {
      const { controller, fire, error, recognizer, tick } = setup(true);
      controller.start();
      fire('rec.started');
      error('network');
      fire('rec.ended');
      expect(recognizer.start).toHaveBeenCalledTimes(1);
      tick(LOST_SERVICE_RETRY_MS);
      expect(recognizer.start).toHaveBeenCalledTimes(2);
    });
  });

  it.each([
    ['not-allowed', 'Permission needed'],
    ['service-not-allowed', 'Voice unavailable'],
    ['language-not-supported', 'Language unsupported'],
    ['audio-capture', 'Mic unavailable'],
  ])('stops for good on %s and says why', (code, message) => {
    const { controller, fire, error, recognizer, tick, lastStatus, onListenerReady } =
      setup(false);
    controller.start();
    fire('rec.started');
    onListenerReady.mockClear();
    error(code);
    expect(lastStatus().errorMessage).toBe(message);
    expect(onListenerReady).toHaveBeenCalledTimes(1);
    fire('rec.ended');
    tick(LOST_SERVICE_RETRY_MS);
    expect(recognizer.start).toHaveBeenCalledTimes(1);
  });

  it.each(['aborted', 'busy'])('ignores %s', code => {
    const { controller, fire, error, statuses } = setup(false);
    controller.start();
    fire('rec.started');
    const before = statuses.length;
    error(code);
    expect(statuses).toHaveLength(before);
  });

  it('says so when the recognizer cannot start', () => {
    const { controller, recognizer, lastStatus } = setup(false);
    recognizer.start.mockImplementation(() => {
      throw new Error('no');
    });
    controller.start();
    expect(lastStatus().errorMessage).toBe('Unable to start voice input');
  });

  it('stops cleanly: aborts and never restarts', () => {
    const { controller, fire, recognizer, tick } = setup(false);
    controller.start();
    fire('rec.started');
    controller.stop();
    expect(recognizer.abort).toHaveBeenCalledTimes(1);
    fire('rec.ended');
    tick(LOST_SERVICE_RETRY_MS);
    expect(recognizer.start).toHaveBeenCalledTimes(1);
  });
});
