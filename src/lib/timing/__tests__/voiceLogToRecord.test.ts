import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertVoiceLog } from '../voiceLogToRecord';

const fixture = (name: string) =>
  convertVoiceLog(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));

describe('convertVoiceLog', () => {
  const { record, skipped } = fixture('chromebook-chrome-1655-plain.txt');
  const kinds = (kind: string) => record.events.filter(e => e.kind === kind);

  it('reads the header into session.started', () => {
    const first = record.events[0];
    expect(first).toMatchObject({
      kind: 'session.started',
      device: 'Chromebook',
      engine: 'chrome',
      inputMode: 'voice',
      experiments: [],
    });
  });

  it('numbers events in order with non-decreasing times', () => {
    record.events.forEach((event, i) => {
      expect(event.seq).toBe(i);
      if (i > 0) expect(event.t).toBeGreaterThanOrEqual(record.events[i - 1].t);
    });
  });

  it('turns problem lines into shown/left pairs', () => {
    expect(kinds('problem.shown')).toHaveLength(7);
    expect(kinds('problem.left')).toHaveLength(7);
    expect(kinds('problem.shown')[1]).toMatchObject({
      t: 125000,
      spec: { missing: 'result', correct: 16 },
    });
  });

  it('gives every recognizer start a new recId, matching its request', () => {
    const requested = kinds('rec.requested');
    const startedIds = kinds('rec.started').map(e => (e as { recId: number }).recId);
    expect(startedIds).toEqual(requested.map(e => (e as { recId: number }).recId));
    expect(new Set(startedIds).size).toBe(startedIds.length);
  });

  it('keeps the text the engine returned, nothing more', () => {
    const texts = kinds('rec.result').map(e => (e as { text: string }).text);
    expect(texts).toEqual(
      expect.arrayContaining(['16', '14', 'eight', 'nine', 'if', 'teen', '15'])
    );
  });

  it('expands "x2" repeats and links answers to their result', () => {
    const fifteens = kinds('rec.result').filter(
      e => (e as { text: string }).text === '15' && e.t === 166300
    );
    expect(fifteens).toHaveLength(2);
    const accepted = kinds('answer.accepted').pop() as { resultSeq: number };
    const result = record.events[accepted.resultSeq];
    expect(result).toMatchObject({ kind: 'rec.result', text: '15', isFinal: true });
  });

  it('skips only lines it cannot use', () => {
    expect(skipped).toEqual([]);
  });

  it('marks Safari logs as the webkit engine', () => {
    const iphone = fixture('iphone-safari-1521-fast500.txt');
    expect(iphone.record.events[0]).toMatchObject({
      device: 'iPhone',
      engine: 'webkit',
      experiments: ['fast=500'],
    });
  });

  it('handles old log wording ("via final processing 0ms")', () => {
    const old = fixture('iphone-safari-1336-continuous.txt');
    const accepted = old.record.events.filter(e => e.kind === 'answer.accepted');
    expect(accepted).toHaveLength(5);
  });
});
