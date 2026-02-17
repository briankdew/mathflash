#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function median(sorted) {
  if (!sorted.length) return null;
  return sorted[Math.floor((sorted.length - 1) * 0.5)];
}

function p90(sorted) {
  if (!sorted.length) return null;
  return sorted[Math.floor((sorted.length - 1) * 0.9)];
}

function levenshtein(a, b) {
  const s = String(a ?? '');
  const t = String(b ?? '');
  const m = s.length;
  const n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function toFixedOrNA(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  return Number(value).toFixed(digits);
}

function main() {
  const logsDir = process.argv[2] || 'whisper session logs';
  const filter = (process.argv[3] || '').trim();
  if (!fs.existsSync(logsDir)) {
    console.error(`Logs directory not found: ${logsDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(logsDir);
  const eventFiles = allFiles
    .filter((name) => /^speechCapture_events_.*\.jsonl$/.test(name))
    .filter((name) => (filter ? name.includes(filter) : true))
    .sort();
  const serverFiles = allFiles
    .filter((name) => /^stt-server-events(?: \(\d+\))?\.jsonl$/.test(name))
    .sort();

  if (!eventFiles.length) {
    console.log('No client event JSONL files matched.');
    return;
  }

  const serverBySession = new Map();
  for (const sf of serverFiles) {
    const rows = readJsonl(path.join(logsDir, sf));
    for (const row of rows) {
      const sid = row.session_id;
      if (!sid) continue;
      if (!serverBySession.has(sid)) {
        serverBySession.set(sid, {
          requests: 0,
          responses: 0,
          ffmpegErrors: 0,
          whisperErrors: 0,
          httpErrors: 0
        });
      }
      const agg = serverBySession.get(sid);
      if (row.event_type === 'request_received') agg.requests += 1;
      if (row.event_type === 'response_sent') {
        agg.responses += 1;
        if (Number(row.status_code) >= 400) agg.httpErrors += 1;
      }
      if (row.event_type === 'ffmpeg_end' && row.status === 'error') agg.ffmpegErrors += 1;
      if (row.event_type === 'whisper_end' && row.status === 'error') agg.whisperErrors += 1;
    }
  }

  const sessions = [];
  for (const ef of eventFiles) {
    const events = readJsonl(path.join(logsDir, ef)).sort((a, b) => (a.ts_ms || 0) - (b.ts_ms || 0));
    const sessionStart = events.find((e) => e.event_type === 'session_start') || {};
    const sessionId = sessionStart.session_id || 'unknown_session';
    const captureStart = events.find((e) => e.event_type === 'stt_capture_start') || {};
    const chunkMode = captureStart.chunk_mode || 'periodic';

    const expectedByProblem = new Map();
    const firstSubmitByProblem = new Map();
    const shownTsByProblem = new Map();
    const submitTsByProblem = new Map();

    let totalFinals = 0;
    let activeProblemFinals = 0;
    let falseBeginCount = 0;
    let emptyFinalCount = 0;
    let staleIgnored = 0;
    let staleFinalIgnored = 0;

    const uploadLatencies = [];
    const staleEventTs = [];

    for (const e of events) {
      if (e.event_type === 'problem_shown') {
        const idx = String(e.problem_index);
        expectedByProblem.set(idx, String(e.expected_answer));
        shownTsByProblem.set(idx, Number(e.ts_ms || 0));
      }
      if (e.event_type === 'answer_submitted') {
        const idx = String(e.problem_index);
        if (!firstSubmitByProblem.has(idx)) {
          firstSubmitByProblem.set(idx, String(e.submitted_value));
          submitTsByProblem.set(idx, Number(e.ts_ms || 0));
        }
      }

      if (e.event_type === 'stt_final_result') {
        totalFinals += 1;
        const cleaned = String(e.transcript_cleaned || '').trim().toLowerCase();
        if (cleaned.length === 0) emptyFinalCount += 1;
        if (e.problem_id != null) {
          activeProblemFinals += 1;
          if (/\bbegin\b/.test(cleaned)) falseBeginCount += 1;
        }
      }

      if (e.event_type === 'stt_final_ignored_stale') {
        staleFinalIgnored += 1;
        staleEventTs.push(Number(e.ts_ms || 0));
      }
      if (e.event_type === 'stt_result_ignored_stale_segment' || e.event_type === 'stt_result_ignored_stale_window') {
        staleIgnored += 1;
        staleEventTs.push(Number(e.ts_ms || 0));
      }

      if (e.event_type === 'stt_chunk_upload_end' && typeof e.elapsed_ms === 'number') {
        uploadLatencies.push(e.elapsed_ms);
      }
    }

    uploadLatencies.sort((a, b) => a - b);

    let correct = 0;
    let wrong = 0;
    let staleWrong = 0;
    let editDistanceSum = 0;
    let expectedChars = 0;
    for (const [idx, exp] of expectedByProblem.entries()) {
      const sub = firstSubmitByProblem.get(idx);
      if (sub == null) continue;
      if (sub === exp) {
        correct += 1;
      } else {
        wrong += 1;
      }
      editDistanceSum += levenshtein(exp, sub);
      expectedChars += String(exp).length;

      if (sub !== exp) {
        const start = shownTsByProblem.get(idx) || 0;
        const end = submitTsByProblem.get(idx) || Number.MAX_SAFE_INTEGER;
        const hasStaleDuringProblem = staleEventTs.some((ts) => ts >= start && ts <= end);
        if (hasStaleDuringProblem) staleWrong += 1;
      }
    }

    const submitted = firstSubmitByProblem.size;
    const problems = expectedByProblem.size;
    const accuracy = problems > 0 ? (100 * correct) / problems : 0;
    const falseBeginRate = activeProblemFinals > 0 ? (100 * falseBeginCount) / activeProblemFinals : 0;
    const emptyFinalRate = totalFinals > 0 ? (100 * emptyFinalCount) / totalFinals : 0;
    const staleWrongRate = wrong > 0 ? (100 * staleWrong) / wrong : 0;
    const numericWerProxy = expectedChars > 0 ? editDistanceSum / expectedChars : 0;

    const server = serverBySession.get(sessionId) || {
      requests: 0,
      responses: 0,
      ffmpegErrors: 0,
      whisperErrors: 0,
      httpErrors: 0
    };

    sessions.push({
      file: ef,
      sessionId,
      chunkMode,
      problems,
      submitted,
      correct,
      wrong,
      accuracy,
      falseBeginRate,
      emptyFinalRate,
      staleWrongRate,
      numericWerProxy,
      staleIgnored,
      staleFinalIgnored,
      uploads: uploadLatencies.length,
      uploadP50: median(uploadLatencies),
      uploadP90: p90(uploadLatencies),
      uploadMax: uploadLatencies.length ? uploadLatencies[uploadLatencies.length - 1] : null,
      server
    });
  }

  const byMode = new Map();
  for (const s of sessions) {
    if (!byMode.has(s.chunkMode)) {
      byMode.set(s.chunkMode, []);
    }
    byMode.get(s.chunkMode).push(s);
  }

  console.log(`Analyzed ${sessions.length} session(s) from: ${logsDir}`);
  if (filter) console.log(`File filter: ${filter}`);
  console.log('');

  for (const s of sessions) {
    console.log(`[${s.chunkMode}] ${s.file}`);
    console.log(
      `  problems=${s.problems} submitted=${s.submitted} correct=${s.correct} wrong=${s.wrong} acc=${toFixedOrNA(s.accuracy)}%`
    );
    console.log(
      `  false_begin_rate=${toFixedOrNA(s.falseBeginRate)}% empty_final_rate=${toFixedOrNA(s.emptyFinalRate)}% stale_wrong_rate=${toFixedOrNA(s.staleWrongRate)}%`
    );
    console.log(
      `  numeric_wer_proxy=${toFixedOrNA(s.numericWerProxy, 3)} stale_ignored=${s.staleIgnored} stale_final_ignored=${s.staleFinalIgnored}`
    );
    console.log(
      `  uploads=${s.uploads} upload_ms(p50/p90/max)=${s.uploadP50 ?? 'n/a'}/${s.uploadP90 ?? 'n/a'}/${s.uploadMax ?? 'n/a'}`
    );
    console.log(
      `  server(req/resp/ffmpeg_err/whisper_err/http_err)=${s.server.requests}/${s.server.responses}/${s.server.ffmpegErrors}/${s.server.whisperErrors}/${s.server.httpErrors}`
    );
  }

  console.log('\nBy chunk mode:');
  for (const [mode, list] of byMode.entries()) {
    const totals = list.reduce((acc, s) => {
      acc.sessions += 1;
      acc.problems += s.problems;
      acc.submitted += s.submitted;
      acc.correct += s.correct;
      acc.wrong += s.wrong;
      acc.falseBeginSum += s.falseBeginRate;
      acc.emptyFinalSum += s.emptyFinalRate;
      acc.staleWrongSum += s.staleWrongRate;
      acc.werSum += s.numericWerProxy;
      acc.uploads += s.uploads;
      if (s.uploadP50 != null) acc.uploadP50.push(s.uploadP50);
      if (s.uploadP90 != null) acc.uploadP90.push(s.uploadP90);
      if (s.uploadMax != null) acc.uploadMax.push(s.uploadMax);
      acc.ffmpegErr += s.server.ffmpegErrors;
      acc.whisperErr += s.server.whisperErrors;
      acc.httpErr += s.server.httpErrors;
      return acc;
    }, {
      sessions: 0,
      problems: 0,
      submitted: 0,
      correct: 0,
      wrong: 0,
      falseBeginSum: 0,
      emptyFinalSum: 0,
      staleWrongSum: 0,
      werSum: 0,
      uploads: 0,
      uploadP50: [],
      uploadP90: [],
      uploadMax: [],
      ffmpegErr: 0,
      whisperErr: 0,
      httpErr: 0
    });

    const acc = totals.problems > 0 ? (100 * totals.correct) / totals.problems : 0;
    const avg = (arr) => arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : null;
    console.log(
      `  ${mode}: sessions=${totals.sessions} acc=${toFixedOrNA(acc)}% ` +
      `avg_false_begin=${toFixedOrNA(totals.falseBeginSum / totals.sessions)}% ` +
      `avg_empty_final=${toFixedOrNA(totals.emptyFinalSum / totals.sessions)}% ` +
      `avg_stale_wrong=${toFixedOrNA(totals.staleWrongSum / totals.sessions)}% ` +
      `avg_wer_proxy=${toFixedOrNA(totals.werSum / totals.sessions, 3)} ` +
      `avg_uploads=${toFixedOrNA(totals.uploads / totals.sessions)} ` +
      `avg_upload_ms(p50/p90/max)=${avg(totals.uploadP50) ?? 'n/a'}/${avg(totals.uploadP90) ?? 'n/a'}/${avg(totals.uploadMax) ?? 'n/a'} ` +
      `server_err(ffmpeg/whisper/http)=${totals.ffmpegErr}/${totals.whisperErr}/${totals.httpErr}`
    );
  }
}

main();
