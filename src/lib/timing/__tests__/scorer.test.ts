import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertVoiceLog } from '../voiceLogToRecord';
import { ProblemRow, score, SCORER_VERSION, spreadStats } from '../scorer';
import { EventDraft, SessionEvent, SessionRecord } from '../sessionRecord';

const fixture = (name: string) =>
  convertVoiceLog(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
const scoreFixture = (name: string) => score(fixture(name).record);
const seconds = (ms: number | null) => (ms === null ? null : ms / 1000);

// Builds a record from events written without `seq`.
type Draft = EventDraft;
const recordOf = (drafts: Draft[]): SessionRecord => ({
  events: drafts.map((draft, seq) => ({ ...draft, seq }) as SessionEvent),
});
const session = (engine: 'chrome' | 'webkit', inputMode: 'voice' | 'keypad') =>
  ({
    t: 0,
    kind: 'session.started',
    device: 'test',
    browser: 'test',
    engine,
    build: 'test',
    experiments: [],
    inputMode,
  }) as Draft;
const shown = (t: number, problemId = 'p1', index = 1) =>
  ({ t, kind: 'problem.shown', problemId, index, spec: { correct: 8 } }) as Draft;

describe('scorer on real logs', () => {
  describe('Chromebook 16:55 (plain Chrome)', () => {
    const scored = scoreFixture('chromebook-chrome-1655-plain.txt');
    // rows[0] is a card shown with nobody listening; the log's problems 1-6 follow.
    const row = (index: number): ProblemRow => scored.rows[index];

    it('uses speechstart as the onset source', () => {
      expect(scored.engine).toBe('chrome');
      expect(scored.onsetSource).toBe('speechstart');
      expect(scored.rows).toHaveLength(7);
      expect(scored.rows[0].outcome).toBe('no_answer');
      expect(row(1).scorerVersion).toBe(SCORER_VERSION);
    });

    it('times a normal answer from speechstart, with the engine lag apart', () => {
      expect(row(1).outcome).toBe('correct_first_try');
      expect(seconds(row(1).firstResponseMs)).toBe(1.7);
      expect(seconds(row(1).captureLagMs)).toBe(1.6);
      expect(row(1).flags).toEqual([]);
    });

    it('problem 3: three Unrecognized tries then "eight" start at the first try (D1)', () => {
      expect(row(3).unrecognized).toBe(3);
      expect(row(3).attempts).toHaveLength(1);
      expect(row(3).attempts[0].joinedTries).toBe(3);
      expect(seconds(row(3).firstResponseMs)).toBe(1.3);
      expect(seconds(row(3).captureLagMs)).toBe(1.1);
      expect(row(3).restarts).toBe(3);
      expect(row(3).flags).toEqual(['tries_before_answer']);
    });

    it('problem 6: "if" and "teen" fragments start the response, "15" answers (D1)', () => {
      expect(row(6).fragments).toBe(2);
      expect(row(6).unrecognized).toBe(0);
      expect(row(6).attempts[0].value).toBe(15);
      expect(row(6).attempts[0].joinedTries).toBe(2);
      expect(seconds(row(6).firstResponseMs)).toBe(2.8);
      expect(seconds(row(6).captureLagMs)).toBe(2);
    });

    it('measures each engine delay once', () => {
      expect(seconds(row(1).startupLagMs)).toBe(0.1);
      expect(row(3).restarts).toBe(3);
      expect(row(2).restarts).toBe(0);
    });
  });

  describe('Chromebook 15:33 (wrong answers, late results)', () => {
    const scored = scoreFixture('chromebook-chrome-1533-fast500.txt');

    it('scores every shown problem once', () => {
      expect(scored.rows).toHaveLength(10);
      expect(new Set(scored.rows.map(row => row.problemId)).size).toBe(10);
    });

    it('keeps a wrong first answer and the later correct one as two attempts', () => {
      const wrong = scored.rows.find(row => row.outcome === 'wrong_then_correct');
      expect(wrong).toBeDefined();
      expect(wrong!.attempts[0].correct).toBe(false);
      expect(wrong!.attempts[wrong!.attempts.length - 1].correct).toBe(true);
      expect(wrong!.firstResponseMs).toBeLessThan(wrong!.correctResponseMs!);
    });

    it('does not let a late result for answer N create an extra attempt', () => {
      for (const row of scored.rows) {
        expect(row.attempts.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('iPhone 15:21 (Safari, first text is the onset)', () => {
    const scored = scoreFixture('iphone-safari-1521-fast500.txt');

    it('uses first text as the onset source', () => {
      expect(scored.engine).toBe('webkit');
      expect(scored.onsetSource).toBe('first_text');
      expect(scored.rows.every(row => row.onsetSource === 'first_text')).toBe(
        true
      );
    });

    it('has a response and a capture lag for each answered problem', () => {
      const answered = scored.rows.filter(row => row.attempts.length > 0);
      expect(answered.length).toBeGreaterThan(5);
      for (const row of answered) {
        expect(row.firstResponseMs).not.toBeNull();
        expect(row.captureLagMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('summarizes the session', () => {
      expect(scored.summary.problems).toBe(scored.rows.length);
      expect(scored.summary.response.medianMs).not.toBeNull();
      expect(scored.summary.response.count).toBeGreaterThan(5);
    });
  });

  describe('iPhone 13:36 (old continuous run that ignored answers)', () => {
    const scored = scoreFixture('iphone-safari-1336-continuous.txt');

    it('flags a spoken number that nothing accepted instead of hiding it', () => {
      const problem2 = scored.rows[1];
      expect(problem2.flags).toContain('unaccepted_number');
      expect(problem2.attempts).toHaveLength(1);
    });
  });
});

describe('scorer rules on small records', () => {
  const chromeProblem = (extra: Draft[]) =>
    recordOf([
      session('chrome', 'voice'),
      shown(1000),
      { t: 1000, kind: 'rec.requested', recId: 1 },
      { t: 1100, kind: 'rec.started', recId: 1 },
      ...extra,
    ]);

  it('a different complete number is a separate wrong attempt, never merged', () => {
    const scored = score(
      chromeProblem([
        { t: 2000, kind: 'rec.speechstart', recId: 1 },
        { t: 2400, kind: 'rec.result', recId: 1, text: '7', isFinal: true },
        { t: 2400, kind: 'answer.accepted', problemId: 'p1', value: 7, via: 'final', recId: 1, resultSeq: 5 },
        { t: 2400, kind: 'answer.checked', problemId: 'p1', value: 7, correct: false },
        { t: 3500, kind: 'rec.speechstart', recId: 1 },
        { t: 3900, kind: 'rec.result', recId: 1, text: '8', isFinal: true },
        { t: 3900, kind: 'answer.accepted', problemId: 'p1', value: 8, via: 'final', recId: 1, resultSeq: 8 },
        { t: 3900, kind: 'answer.checked', problemId: 'p1', value: 8, correct: true },
      ])
    );
    const row = scored.rows[0];
    expect(row.outcome).toBe('wrong_then_correct');
    expect(row.attempts.map(a => a.joinedTries)).toEqual([0, 0]);
    expect(row.firstResponseMs).toBe(1000);
    expect(row.correctResponseMs).toBe(2500);
  });

  it('an empty try before a wrong answer joins the wrong answer, not the next one', () => {
    const scored = score(
      chromeProblem([
        { t: 1500, kind: 'rec.speechstart', recId: 1 },
        { t: 1900, kind: 'rec.speechend', recId: 1 },
        { t: 2000, kind: 'rec.speechstart', recId: 1 },
        { t: 2400, kind: 'rec.result', recId: 1, text: '7', isFinal: true },
        { t: 2400, kind: 'answer.accepted', problemId: 'p1', value: 7, via: 'final', recId: 1, resultSeq: 6 },
        { t: 2400, kind: 'answer.checked', problemId: 'p1', value: 7, correct: false },
        { t: 3500, kind: 'rec.speechstart', recId: 1 },
        { t: 3900, kind: 'rec.result', recId: 1, text: '8', isFinal: true },
        { t: 3900, kind: 'answer.accepted', problemId: 'p1', value: 8, via: 'final', recId: 1, resultSeq: 9 },
        { t: 3900, kind: 'answer.checked', problemId: 'p1', value: 8, correct: true },
      ])
    );
    const [first, second] = scored.rows[0].attempts;
    expect(first.joinedTries).toBe(1);
    expect(first.responseMs).toBe(500);
    expect(second.joinedTries).toBe(0);
    expect(second.responseMs).toBe(2500);
  });

  it('a late result for problem 1 never answers problem 2', () => {
    const scored = score(
      recordOf([
        session('chrome', 'voice'),
        shown(1000, 'p1', 1),
        { t: 1100, kind: 'rec.started', recId: 1 },
        { t: 1500, kind: 'rec.speechstart', recId: 1 },
        { t: 1900, kind: 'rec.result', recId: 1, text: '8', isFinal: false },
        { t: 1900, kind: 'answer.accepted', problemId: 'p1', value: 8, via: 'stable', recId: 1, resultSeq: 4 },
        { t: 1900, kind: 'answer.checked', problemId: 'p1', value: 8, correct: true },
        { t: 2000, kind: 'problem.left', problemId: 'p1', reason: 'answered' },
        shown(2500, 'p2', 2),
        { t: 2600, kind: 'rec.result', recId: 1, text: '8', isFinal: true },
      ])
    );
    expect(scored.rows[1].utterances).toBe(0);
    expect(scored.rows[1].outcome).toBe('no_answer');
    expect(scored.rows[1].firstResponseMs).toBeNull();
    expect(scored.rows[0].utterances).toBe(1);
  });

  it('a keypad session is timed from the first digit', () => {
    const scored = score(
      recordOf([
        session('chrome', 'keypad'),
        shown(1000),
        { t: 1800, kind: 'key.digit', digit: '8' },
        { t: 2200, kind: 'key.submit' },
        { t: 2200, kind: 'answer.accepted', problemId: 'p1', value: 8, via: 'keypad' },
        { t: 2200, kind: 'answer.checked', problemId: 'p1', value: 8, correct: true },
      ])
    );
    expect(scored.onsetSource).toBe('keypad');
    expect(scored.rows[0].firstResponseMs).toBe(800);
    expect(scored.rows[0].captureLagMs).toBeNull();
  });

  it('computes median and spread of the middle half', () => {
    expect(spreadStats([])).toEqual({ count: 0, medianMs: null, spreadMs: null });
    expect(spreadStats([1000, 3000, 2000, 4000, 5000])).toEqual({
      count: 5,
      medianMs: 3000,
      spreadMs: 2000,
    });
  });
});
