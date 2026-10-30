// Converts the old voice debug logs (the .txt files from the Share button)
// into session records, so the scorer can be tested and run on real sessions
// from before the record existed (docs/timing-core-design.md, section 10).
//
// Old logs have 0.1 s resolution and are relative to the first line. They log
// the app's own decisions ("late result ignored", "empty try ...") as well as
// browser events; only browser events and the answer lines become record
// events, because the scorer re-derives the rest. Nothing is invented: lines
// the converter does not use are returned in `skipped`.

import {
  AcceptedVia,
  EventDraft,
  ProblemSpec,
  RecordEngine,
  SessionEvent,
  SessionRecord,
} from './sessionRecord';

export interface ConvertedLog {
  record: SessionRecord;
  /** Lines that were not turned into events, for transparency. */
  skipped: string[];
}

const IGNORED_LINE =
  /^(shouldListen |stop\(\)|abort\(\)|restart scheduled|audiostart|audioend|soundstart|soundend|mic held|mic released|late result ignored|result ignored|empty try|voice resumed|continuous: recognizer already running|advancing to next problem)/;
const ACCEPTED_VIA: readonly string[] = [
  'final',
  'stable',
  'speechend',
  'end',
];

function engineOf(header: Record<string, string>): RecordEngine {
  if (header.webkitSpeechEngine !== undefined) {
    return header.webkitSpeechEngine === 'true' ? 'webkit' : 'chrome';
  }
  const ua = header.userAgent ?? '';
  if (/iPhone|iPad/.test(ua)) return 'webkit';
  if (/Chrome\//.test(ua)) return 'chrome';
  return /Safari\//.test(ua) ? 'webkit' : 'unknown';
}

function deviceOf(ua: string): string {
  if (/iPhone|iPad/.test(ua)) return 'iPhone';
  if (/CrOS/.test(ua)) return 'Chromebook';
  return /Android/.test(ua) ? 'Android' : 'other';
}

function parseProblemSpec(rest: string): ProblemSpec {
  const missing = /missing=(left|right|result)/.exec(rest)?.[1];
  const answer = /answer=(\d+)/.exec(rest)?.[1];
  const spec: ProblemSpec = {};
  if (missing) spec.missing = missing as ProblemSpec['missing'];
  if (answer) spec.correct = Number(answer);
  return spec;
}

export function convertVoiceLog(text: string): ConvertedLog {
  const header: Record<string, string> = {};
  const lines = text.split('\n');
  const skipped: string[] = [];
  const events: SessionEvent[] = [];
  const pushed = (event: EventDraft): SessionEvent => {
    const full = { ...event, seq: events.length } as SessionEvent;
    events.push(full);
    return full;
  };

  let started = false;
  let recCounter = 0;
  let currentRec = 0;
  // Recognizers that have started and not ended, oldest first: a late `end`
  // belongs to the oldest one, not the newest.
  const unended: number[] = [];
  let lastResultSeq: number | undefined;
  let openProblem: { id: string } | null = null;
  let problemCount = 0;

  const startSession = () => {
    if (started) return;
    started = true;
    const ua = header.userAgent ?? '';
    const experiments = (header.experiments ?? 'none')
      .split(/\s+/)
      .filter(name => name && name !== 'none');
    pushed({
      t: 0,
      kind: 'session.started',
      device: deviceOf(ua),
      browser: /iPhone|iPad/.test(ua) ? 'Safari' : /Chrome\//.test(ua) ? 'Chrome' : 'other',
      engine: engineOf(header),
      build: header.build ?? 'unknown',
      experiments,
      inputMode: 'voice',
      pace: 'learning',
      settings: { convertedFromLog: true, resolutionMs: 100 },
    });
  };

  const closeProblem = (t: number, reason: 'answered' | 'ended') => {
    if (!openProblem) return;
    pushed({ t, kind: 'problem.left', problemId: openProblem.id, reason });
    openProblem = null;
  };

  for (const line of lines) {
    const match = /^\s*(\d+(?:\.\d+)?)s (.*?)(?: x(\d+))?$/.exec(line);
    if (!match) {
      const field = /^(\w+): (.*)$/.exec(line);
      if (field && !started) header[field[1]] = field[2];
      continue;
    }
    startSession();
    const t = Math.round(Number(match[1]) * 1000);
    const body = match[2];
    const repeat = match[3] ? Number(match[3]) : 1;

    const problem = /^problem (\S+)(.*)$/.exec(body);
    if (problem) {
      closeProblem(t, 'ended');
      if (problem[1] !== 'none') {
        problemCount += 1;
        openProblem = { id: problem[1] };
        pushed({
          t,
          kind: 'problem.shown',
          problemId: problem[1],
          index: problemCount,
          spec: parseProblemSpec(problem[2]),
        });
      }
    } else if (body === 'advancing to next problem') {
      closeProblem(t, 'answered');
    } else if (body === 'start()') {
      recCounter += 1;
      currentRec = recCounter;
      pushed({ t, kind: 'rec.requested', recId: currentRec });
    } else if (body === 'start') {
      unended.push(currentRec);
      pushed({ t, kind: 'rec.started', recId: currentRec });
    } else if (body === 'end') {
      const recId = unended.shift();
      if (recId !== undefined) pushed({ t, kind: 'rec.ended', recId });
    } else if (body === 'speechstart' || body === 'speechend') {
      pushed({
        t,
        kind: body === 'speechstart' ? 'rec.speechstart' : 'rec.speechend',
        recId: currentRec,
      });
    } else if (/^result (interim|final) /.test(body)) {
      const result = /^result (interim|final) "(.*)"$/.exec(body);
      if (!result) {
        skipped.push(line.trim());
        continue;
      }
      for (let i = 0; i < repeat; i += 1) {
        lastResultSeq = pushed({
          t,
          kind: 'rec.result',
          recId: currentRec,
          text: result[2],
          isFinal: result[1] === 'final',
        }).seq;
      }
    } else if (body.startsWith('error ')) {
      pushed({
        t,
        kind: 'rec.error',
        recId: currentRec,
        code: body.split(' ')[1],
      });
    } else if (body.startsWith('answer captured')) {
      const captured = /^answer captured "([^"]*)" via (\S+)/.exec(body);
      const value = captured ? Number(captured[1]) : NaN;
      if (
        !openProblem ||
        !captured ||
        !Number.isFinite(value) ||
        !ACCEPTED_VIA.includes(captured[2])
      ) {
        skipped.push(line.trim());
        continue;
      }
      pushed({
        t,
        kind: 'answer.accepted',
        problemId: openProblem.id,
        value,
        via: captured[2] as AcceptedVia,
        recId: currentRec,
        resultSeq: lastResultSeq,
      });
    } else if (body.startsWith('answer checked')) {
      const checked = /^answer checked "([^"]*)" (correct|wrong)$/.exec(body);
      if (!openProblem || !checked) {
        skipped.push(line.trim());
        continue;
      }
      pushed({
        t,
        kind: 'answer.checked',
        problemId: openProblem.id,
        value: Number(checked[1]),
        correct: checked[2] === 'correct',
      });
    } else if (!IGNORED_LINE.test(body)) {
      skipped.push(line.trim());
    }
  }

  return { record: { events }, skipped };
}
