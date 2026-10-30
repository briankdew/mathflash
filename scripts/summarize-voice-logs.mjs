#!/usr/bin/env node
// Summarizes mathflash voice debug logs (the .txt files saved by the Share
// button) so sessions and devices can be compared without reading each log.
//
//   node scripts/summarize-voice-logs.mjs [folder] [--all] [--csv]
//
// folder  defaults to the ClaudeCode folder on Google Drive
// --all   also read subfolders (e.g. archive-2026-10-28)
// --csv   print one row per problem instead of the summary
//
// Log timestamps have 0.1 s resolution, so every time here is good to about
// +/- 0.1 s; times are printed in seconds. Nothing is guessed: a problem with no recognized text is reported
// as Unrecognized, never as something the user said.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_DIR = '/mnt/chromeos/GoogleDrive/MyDrive/ClaudeCode';
const args = process.argv.slice(2);
const flags = new Set(args.filter(arg => arg.startsWith('--')));
const dir = args.find(arg => !arg.startsWith('--')) ?? DEFAULT_DIR;

function listLogs(folder) {
  const files = [];
  for (const name of readdirSync(folder).sort()) {
    const path = join(folder, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      if (flags.has('--all')) files.push(...listLogs(path));
    } else if (name.endsWith('.txt')) {
      files.push(path);
    }
  }
  return files;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

// Times are kept in milliseconds in the code and shown in seconds to 0.1.
const sec = value => (value === null ? '-' : (value / 1000).toFixed(1));
const spread = values =>
  values.length < 2 ? null : quantile(values, 0.75) - quantile(values, 0.25);

function parseLog(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  const header = {};
  const events = [];
  for (const line of lines) {
    const event = /^\s*(\d+(?:\.\d+)?)s (.*?)(?: x(\d+))?$/.exec(line);
    if (event) {
      events.push({ t: Number(event[1]), text: event[2] });
      continue;
    }
    const field = /^(\w+): (.*)$/.exec(line);
    if (field && events.length === 0) header[field[1]] = field[2];
  }

  const ua = header.userAgent ?? '';
  const device = /iPhone|iPad/.test(ua)
    ? 'iPhone'
    : /CrOS/.test(ua)
      ? 'Chromebook'
      : /Android/.test(ua)
        ? 'Android'
        : 'other';

  const problems = [];
  let current = null;
  let lastSpeechStart = null;
  let pendingAttempt = null;

  for (const { t, text: body } of events) {
    const problem = /^problem (\S+)(?: missing=(\S+) answer=(\S+))?/.exec(body);
    if (problem) {
      if (problem[1] === 'none') {
        current = null;
      } else {
        current = {
          id: problem[1],
          shownAt: t,
          answer: problem[3],
          speechStarts: 0,
          firstSpeech: null,
          unrecognizedTries: 0,
          retries: 0,
          attempts: [],
        };
        problems.push(current);
      }
      lastSpeechStart = null;
      pendingAttempt = null;
      continue;
    }
    if (!current) continue;

    if (body === 'speechstart') {
      current.speechStarts += 1;
      lastSpeechStart = t;
      if (current.firstSpeech === null) current.firstSpeech = t;
    } else if (body.startsWith('empty try')) {
      current.unrecognizedTries += 1;
    } else if (body.startsWith('restart scheduled retry')) {
      current.retries += 1;
    } else if (body.startsWith('answer captured')) {
      const m =
        /^answer captured "([^"]*)" via (\S+)(?: empty-tries (\d+)ms)? onset-to-answer (\S+?)ms engine-ready-lag (\S+?)ms/.exec(
          body
        );
      // Logs from builds before the timing lines were added only say what was
      // captured; they count as answers but carry no timing.
      const old = m ? null : /^answer captured "([^"]*)" via (\S+)/.exec(body);
      if (m || old) {
        pendingAttempt = {
          value: (m ?? old)[1],
          via: (m ?? old)[2],
          emptyMs: m && m[3] !== undefined ? Number(m[3]) : 0,
          captureLagMs: m && m[4] !== '?' ? Number(m[4]) : null,
          readyLagMs: m && m[5] !== '?' ? Number(m[5]) : null,
          speechStart: m ? lastSpeechStart : null,
          result: null,
        };
        current.attempts.push(pendingAttempt);
      }
    } else if (body.startsWith('answer checked') && pendingAttempt) {
      pendingAttempt.result = body.endsWith('correct') ? 'correct' : 'wrong';
      pendingAttempt = null;
    }
  }

  const rows = problems.map(p => {
    const correct = p.attempts.find(a => a.result === 'correct');
    const recorded =
      correct && correct.speechStart !== null
        ? (correct.speechStart - p.shownAt) * 1000 - correct.emptyMs
        : null;
    const firstSpeechMs =
      p.firstSpeech === null ? null : (p.firstSpeech - p.shownAt) * 1000;
    return {
      file: path.split('/').pop(),
      device,
      id: p.id,
      answer: p.answer,
      attempts: p.attempts.length,
      outcome: !correct ? (p.attempts.length ? 'wrong_only' : 'no_answer') : p.attempts[0] === correct ? 'correct_first_try' : 'wrong_then_correct',
      recordedMs: recorded,
      firstSpeechMs,
      captureLagMs: correct?.captureLagMs ?? null,
      readyLagMs: correct?.readyLagMs ?? null,
      emptyMs: correct?.emptyMs ?? 0,
      unrecognizedTries: p.unrecognizedTries,
      speechStarts: p.speechStarts,
      retries: p.retries,
    };
  });

  return { path, header, device, rows };
}

const logs = listLogs(dir).map(parseLog).filter(log => log.rows.length > 0);

if (logs.length === 0) {
  console.log(`No logs with problems found in ${dir}`);
  process.exit(0);
}

if (flags.has('--csv')) {
  console.log(
    'file,device,problem,outcome,attempts,recorded_s,first_speech_s,capture_lag_s,ready_lag_s,unrecognized_tries,speech_starts,retries'
  );
  for (const log of logs) {
    for (const r of log.rows) {
      console.log(
        [r.file, r.device, r.id, r.outcome, r.attempts, sec(r.recordedMs), sec(r.firstSpeechMs), sec(r.captureLagMs), sec(r.readyLagMs), r.unrecognizedTries, r.speechStarts, r.retries].join(',')
      );
    }
  }
  process.exit(0);
}

function summarize(rows) {
  const recorded = rows.map(r => r.recordedMs).filter(v => v !== null);
  const capture = rows.map(r => r.captureLagMs).filter(v => v !== null);
  const ready = rows.filter(r => r.unrecognizedTries === 0).map(r => r.readyLagMs).filter(v => v !== null);
  return {
    problems: rows.length,
    answered: rows.filter(r => r.outcome.startsWith('correct') || r.outcome === 'wrong_then_correct').length,
    cleanFirst: rows.filter(r => r.outcome === 'correct_first_try').length,
    withUnrecognized: rows.filter(r => r.unrecognizedTries > 0).length,
    recorded,
    capture,
    ready,
  };
}

function line(label, rows) {
  const s = summarize(rows);
  return [
    label.padEnd(44),
    String(s.problems).padStart(4),
    String(s.answered).padStart(5),
    String(s.withUnrecognized).padStart(5),
    sec(median(s.recorded)).padStart(8),
    sec(spread(s.recorded)).padStart(7),
    sec(median(s.capture)).padStart(8),
    sec(spread(s.capture)).padStart(7),
    sec(median(s.ready)).padStart(7),
  ].join(' ');
}

const head = [
  'log'.padEnd(44),
  'prob'.padStart(4),
  'ansd'.padStart(5),
  'unrec'.padStart(5),
  'resp med'.padStart(8),
  'resp IQR'.padStart(7),
  'lag med'.padStart(8),
  'lag IQR'.padStart(7),
  'rdy med'.padStart(7),
].join(' ');

console.log('Times in seconds (0.1 s is the finest the logs and the app report).');
console.log('prob = problems shown, ansd = answered correctly, unrec = problems with');
console.log('Unrecognized tries (speech reported, no text). resp = time to the start of');
console.log('the accepted answer as the app records it (after taking Unrecognized time off).');
console.log('lag = engine delay from speech start to answer captured (the engine\'s share).');
console.log('rdy = recognizer startup delay, problems without Unrecognized tries only.');
console.log('IQR = spread (middle half of the values): smaller means more consistent.\n');

for (const device of [...new Set(logs.map(log => log.device))]) {
  const deviceLogs = logs.filter(log => log.device === device);
  console.log(`== ${device} ==`);
  console.log(head);
  for (const log of deviceLogs) {
    const name = `${log.path.split('/').pop().replace('mathflash-voice-log-', '')} [${log.header.experiments?.replace('experiments: ', '') ?? ''}]`;
    console.log(line(name.slice(0, 44), log.rows));
  }
  console.log(line(`ALL ${device} logs`, deviceLogs.flatMap(log => log.rows)));
  console.log('');
}
