import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AccepterInput,
  AccepterProblem,
  AccepterState,
  AcceptedAnswer,
  createAccepter,
  stepAccepter,
} from '../answerAccepter';
import { SessionEvent } from '../sessionRecord';
import { convertVoiceLog } from '../voiceLogToRecord';

const ANY_NUMBER = { min: 0, max: 99 };
const problem = (problemId = 'p1'): AccepterProblem => ({
  problemId,
  acceptedRange: ANY_NUMBER,
  answerRange: { min: 2, max: 18 },
});

// Runs inputs in order, firing a pending wait when `advance` passes it.
class Driver {
  state: AccepterState;
  now = 0;
  timerAt: number | null = null;
  accepted: (AcceptedAnswer & { at: number })[] = [];
  notices: string[] = [];
  seq = 0;

  constructor(stableMs: number | null) {
    this.state = createAccepter(stableMs);
  }

  send(input: AccepterInput) {
    const step = stepAccepter(this.state, input);
    this.state = step.state;
    if (step.timer !== undefined) {
      this.timerAt = step.timer ? this.now + step.timer.ms : null;
    }
    if (step.accepted) {
      this.accepted.push({ ...step.accepted, at: this.now });
    }
    if (step.notice) {
      this.notices.push(step.notice);
    }
  }

  advance(ms: number) {
    const target = this.now + ms;
    if (this.timerAt !== null && this.timerAt <= target) {
      this.now = this.timerAt;
      this.timerAt = null;
      this.send({ type: 'timer' });
    }
    this.now = target;
  }

  result(
    text: string,
    isFinal: boolean,
    extra: { recId?: number; resultIndex?: number; alternatives?: string[] } = {}
  ) {
    this.seq += 1;
    this.send({
      type: 'result',
      recId: extra.recId ?? 1,
      resultIndex: extra.resultIndex,
      text,
      alternatives: extra.alternatives,
      isFinal,
      seq: this.seq,
    });
  }

  values() {
    return this.accepted.map(answer => answer.value);
  }
}

const chrome = () => {
  const driver = new Driver(null);
  driver.send({ type: 'problem', problem: problem() });
  return driver;
};
const safari = () => {
  const driver = new Driver(500);
  driver.send({ type: 'problem', problem: problem() });
  return driver;
};

describe('answerAccepter carried-over rules', () => {
  it('Chrome accepts a final result at once', () => {
    const driver = chrome();
    driver.result('eight', true);
    expect(driver.accepted[0]).toMatchObject({ value: 8, via: 'final', at: 0 });
  });

  it('Chrome accepts the last interim 0.25 s after speechend', () => {
    const driver = chrome();
    driver.result('eighteen', false);
    driver.send({ type: 'speechend' });
    driver.advance(249);
    expect(driver.accepted).toHaveLength(0);
    driver.advance(1);
    expect(driver.accepted[0]).toMatchObject({ value: 18, via: 'speechend' });
  });

  it('Safari accepts an unchanged number after 0.5 s', () => {
    const driver = safari();
    driver.result('12', false);
    driver.advance(500);
    expect(driver.accepted[0]).toMatchObject({ value: 12, via: 'stable' });
  });

  it('Safari holds a number that could grow for 0.9 s', () => {
    const driver = safari();
    driver.result('four', false);
    driver.advance(899);
    expect(driver.accepted).toHaveLength(0);
    driver.advance(1);
    expect(driver.accepted[0]).toMatchObject({ value: 4, via: 'stable' });
  });

  it('a longer number replaces the one being held', () => {
    const driver = safari();
    driver.result('four', false);
    driver.advance(300);
    driver.result('fourteen', false);
    driver.advance(500);
    expect(driver.values()).toEqual([14]);
  });

  it('new speech or a non-number cancels the wait', () => {
    const started = safari();
    started.result('12', false);
    started.send({ type: 'speechstart' });
    started.advance(1000);
    expect(started.accepted).toHaveLength(0);

    const changed = safari();
    changed.result('12', false);
    changed.result('hello', false);
    changed.advance(1000);
    expect(changed.accepted).toHaveLength(0);
  });

  it('Safari takes the waiting number when the recognizer ends', () => {
    const driver = safari();
    driver.result('12', false);
    driver.send({ type: 'ended', recId: 1 });
    driver.advance(0);
    expect(driver.accepted[0]).toMatchObject({ value: 12, via: 'end' });
  });

  it('a final non-number asks for a number', () => {
    const driver = chrome();
    driver.result('hello', true);
    expect(driver.notices).toEqual(['number_only']);
    expect(driver.accepted).toHaveLength(0);
  });

  it('ignores everything while no card is up', () => {
    const driver = new Driver(null);
    driver.result('eight', true);
    expect(driver.accepted).toHaveLength(0);
  });
});

describe('answerAccepter several guesses', () => {
  it('takes the first valid guess and says which', () => {
    const driver = chrome();
    driver.result('ape', true, { alternatives: ['ape', 'hello', 'eight'] });
    expect(driver.accepted[0]).toMatchObject({ value: 8, alternative: 2 });
  });

  it('does not let another guess rescue a digit-by-digit answer', () => {
    const driver = chrome();
    driver.result('one five', true, { alternatives: ['one five', '15'] });
    expect(driver.accepted).toHaveLength(0);
    expect(driver.notices).toEqual(['whole_number']);
  });

  it('skips a digit-by-digit second guess', () => {
    const driver = chrome();
    driver.result('ape', true, { alternatives: ['ape', 'one five', 'eight'] });
    expect(driver.accepted[0]).toMatchObject({ value: 8, alternative: 2 });
  });

  it('drops a held number when the speech turns digit by digit', () => {
    const driver = safari();
    driver.result('seven', false);
    driver.result('seven eight', false);
    driver.send({ type: 'ended', recId: 1 });
    driver.advance(1000);
    expect(driver.accepted).toHaveLength(0);
  });
});

describe('answerAccepter split numbers', () => {
  it('joins "if" and "teen" into fifteen', () => {
    const driver = chrome();
    driver.result('if', true);
    driver.result('teen', true);
    expect(driver.accepted[0]).toMatchObject({
      value: 15,
      rawTranscript: 'if teen',
    });
  });

  it('does not join across a card', () => {
    const driver = chrome();
    driver.result('if', true);
    driver.send({ type: 'problem', problem: problem('p2') });
    driver.result('teen', true);
    expect(driver.accepted).toHaveLength(0);
  });

  it('asks for a number when pieces do not join', () => {
    const driver = chrome();
    driver.result('hello', true);
    driver.result('teen', true);
    expect(driver.notices).toEqual(['number_only', 'number_only']);
  });
});

describe('answerAccepter after an answer', () => {
  const safariAnswered = () => {
    const driver = safari();
    driver.result('Seven', false, { resultIndex: 0 });
    driver.advance(1000);
    driver.send({ type: 'problem', problem: problem('p2') });
    return driver;
  };

  it('ignores the late final of an answered stretch', () => {
    const driver = safariAnswered();
    driver.result('Seven', true, { resultIndex: 0 });
    expect(driver.values()).toEqual([7]);
    expect(driver.notices).toEqual([]);
  });

  it('ignores a late revision of an answered stretch', () => {
    const driver = safari();
    driver.result('six', false, { resultIndex: 0 });
    driver.advance(1000);
    driver.send({ type: 'problem', problem: problem('p2') });
    driver.result('sixteen', false, { resultIndex: 0 });
    driver.advance(1000);
    expect(driver.values()).toEqual([6]);
  });

  it('accepts new speech in a new stretch', () => {
    const driver = safariAnswered();
    driver.result('Eight', false, { resultIndex: 1 });
    driver.advance(900);
    expect(driver.accepted[1]).toMatchObject({ value: 8, problemId: 'p2' });
    expect(driver.accepted[1].onsetSeq).toBeUndefined();
  });

  it('takes only the new part when an answer runs on in words', () => {
    const driver = safariAnswered();
    driver.result('Seven eight', false, { resultIndex: 0 });
    driver.advance(900);
    expect(driver.accepted[1]).toMatchObject({
      value: 8,
      problemId: 'p2',
      onsetSeq: 2,
      resultSeq: 2,
    });
  });

  it('takes only the new part when an answer runs on in digits', () => {
    const driver = safari();
    driver.result('7', false, { resultIndex: 0 });
    driver.advance(1000);
    driver.send({ type: 'problem', problem: problem('p2') });
    driver.result('78', false, { resultIndex: 0 });
    driver.advance(900);
    expect(driver.accepted[1]).toMatchObject({ value: 8, problemId: 'p2' });
    driver.send({ type: 'problem', problem: problem('p3') });
    driver.result('789', false, { resultIndex: 0 });
    driver.advance(1000);
    expect(driver.accepted[2]).toMatchObject({ value: 9, problemId: 'p3' });
  });

  it('keeps the onset at the first run-on result', () => {
    const driver = safariAnswered();
    driver.result('Seven four', false, { resultIndex: 0 });
    driver.advance(200);
    driver.result('Seven fourteen', false, { resultIndex: 0 });
    driver.advance(500);
    expect(driver.accepted[1]).toMatchObject({
      value: 14,
      onsetSeq: 2,
      resultSeq: 3,
    });
  });

  it('accepts a run-on that arrives with the final result', () => {
    const driver = safariAnswered();
    driver.result('Seven eight', true, { resultIndex: 0 });
    expect(driver.accepted[1]).toMatchObject({ value: 8, via: 'final' });
  });

  it('treats text after the final as new speech if the index is reused', () => {
    const driver = safariAnswered();
    driver.result('Seven', true, { resultIndex: 0 });
    driver.result('Eight', true, { resultIndex: 0 });
    expect(driver.accepted[1]).toMatchObject({ value: 8, problemId: 'p2' });
  });

  it('a new recognizer starts clean', () => {
    const driver = safariAnswered();
    driver.send({ type: 'ended', recId: 1 });
    driver.result('Seven', false, { recId: 2, resultIndex: 0 });
    driver.advance(900);
    expect(driver.accepted[1]).toMatchObject({ value: 7, recId: 2 });
  });
});

// The rules must match the old code on real sessions: same numbers, same times.
describe('answerAccepter replaying real logs', () => {
  const fixture = (name: string) =>
    convertVoiceLog(
      readFileSync(join(__dirname, 'fixtures', name), 'utf8')
    ).record.events;

  function replay(events: SessionEvent[], stableMs: number | null) {
    const driver = new Driver(stableMs);
    let card: AccepterProblem | null = null;
    for (const event of events) {
      driver.advance(Math.max(0, event.t - driver.now));
      driver.seq = event.seq;
      switch (event.kind) {
        case 'problem.shown':
          card = problem(event.problemId);
          driver.send({ type: 'problem', problem: card });
          break;
        case 'rec.speechstart':
          driver.send({ type: 'speechstart' });
          break;
        case 'rec.speechend':
          driver.send({ type: 'speechend' });
          break;
        case 'rec.ended':
          driver.send({ type: 'ended', recId: event.recId });
          break;
        case 'rec.result': {
          driver.send({
            type: 'result',
            recId: event.recId,
            resultIndex: event.resultIndex,
            text: event.text,
            isFinal: event.isFinal,
            seq: event.seq,
          });
          break;
        }
        default:
          break;
      }
    }
    driver.advance(5000);
    return driver.accepted;
  }

  const oldAnswers = (events: SessionEvent[]) =>
    events.filter(event => event.kind === 'answer.accepted');

  it.each([
    ['chromebook-chrome-1533-fast500.txt', 500],
    ['iphone-safari-1521-fast500.txt', 500],
  ])('%s gives the same answers at the same times', (name, stableMs) => {
    const events = fixture(name);
    const before = oldAnswers(events);
    const after = replay(events, stableMs);
    expect(after.map(answer => answer.value)).toEqual(
      before.map(answer => (answer as { value: number }).value)
    );
    after.forEach((answer, index) => {
      expect(Math.abs(answer.at - before[index].t)).toBeLessThanOrEqual(150);
    });
  });

  it('plain Chrome differs only where split numbers now join', () => {
    const events = fixture('chromebook-chrome-1655-plain.txt');
    const before = oldAnswers(events).map(
      answer => (answer as { value: number }).value
    );
    const after = replay(events, null).map(answer => answer.value);
    // "if" + "teen" now answers problem 6; the owner's repeated "15" was the
    // old answer. The replay keeps the card up, so it is accepted as well.
    expect(after).toEqual([...before, 15]);
  });

  it('the continuous iPhone log no longer loses answers', () => {
    const events = fixture('iphone-safari-1336-continuous.txt');
    const after = replay(events, null);
    expect(after.length).toBeGreaterThanOrEqual(oldAnswers(events).length);
  });
});
