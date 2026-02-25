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

function toNumberOrNull(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(Number(value).toFixed(digits));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function makeShortStamp(date = new Date()) {
  const y = String(date.getFullYear()).slice(-1);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${mm}${dd}.${hh}${min}.${ss}`;
}

function randomUid() {
  return Math.random().toString(36).slice(2, 6);
}

function pickDescriptor(values, mixedToken, unknownToken) {
  const set = new Set((values || []).filter(Boolean));
  if (!set.size) return unknownToken;
  if (set.size === 1) return [...set][0];
  return mixedToken;
}

function toEngineToken(engine) {
  const e = String(engine || '').toLowerCase();
  if (e === 'webspeech') return 'wbsp';
  if (e === 'whisper') return 'wspc';
  if (e === 'vosk') return 'vosk';
  return 'unkn';
}

function toChunkToken(chunkMode) {
  const c = String(chunkMode || '').toLowerCase();
  if (c === 'periodic' || c === 'fixed' || c === 'fxd') return 'fxd';
  if (c === 'utterance' || c === 'vad') return 'vad';
  return 'unk';
}

function normalizeChunkMode(chunkMode) {
  const c = String(chunkMode || '').toLowerCase();
  if (c === 'periodic' || c === 'fixed' || c === 'fxd') return 'fixed';
  if (c === 'utterance' || c === 'vad') return 'vad';
  return 'unknown';
}

function toSourceToken(source) {
  const s = String(source || '').toLowerCase();
  if (s === 'voice' || s === 'mic' || s === 'microphone') return 'mic';
  if (s === 'rec' || s === 'recording' || s === 'file') return 'rec';
  return 'unk';
}

function parseCliArgs(argv) {
  const positional = [];
  let runIdFilter = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--run-id') {
      runIdFilter = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--run-id=')) {
      runIdFilter = String(arg.slice('--run-id='.length) || '').trim();
      continue;
    }
    positional.push(arg);
  }

  return {
    logsDir: positional[0] || 'sc-session-logs',
    filter: String(positional[1] || '').trim(),
    outPrefixRaw: String(positional[2] || '').trim(),
    runIdFilter
  };
}

function main() {
  const { logsDir, filter, outPrefixRaw, runIdFilter } = parseCliArgs(process.argv.slice(2));
  const autoOut = outPrefixRaw.toLowerCase() === 'auto';
  const outPrefix = autoOut ? '' : outPrefixRaw;
  if (!fs.existsSync(logsDir)) {
    console.error(`Logs directory not found: ${logsDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(logsDir);
  const eventFiles = allFiles
    .filter((name) =>
      /^speechCapture_events_.*\.jsonl$/.test(name) ||
      /^sc_log_(?:ses|run)-.*\.jsonl$/.test(name)
    )
    .filter((name) => (filter ? name.includes(filter) : true))
    .sort();
  const serverFiles = allFiles
    .filter((name) =>
      /^stt-server-events(?: \(\d+\))?\.jsonl$/.test(name) ||
      /^sc_log_svr-\d{5}\.\d{4}\.\d{2}\.jsonl$/.test(name)
    )
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
    const fileEvents = readJsonl(path.join(logsDir, ef)).sort((a, b) => (a.ts_ms || 0) - (b.ts_ms || 0));
    const eventsBySession = new Map();
    for (const e of fileEvents) {
      const sid = e.session_id ? String(e.session_id) : '__unknown__';
      if (!eventsBySession.has(sid)) eventsBySession.set(sid, []);
      eventsBySession.get(sid).push(e);
    }

    const sessionGroups = [...eventsBySession.entries()].sort((a, b) => {
      const aTs = Number(a[1]?.[0]?.ts_ms || 0);
      const bTs = Number(b[1]?.[0]?.ts_ms || 0);
      return aTs - bTs;
    });

    for (const [sidKey, events] of sessionGroups) {
      const runIds = [...new Set(events.map((e) => String(e.run_id || '').trim()).filter(Boolean))];
      if (runIdFilter && !runIds.includes(runIdFilter)) {
        continue;
      }

      const sessionStart = events.find((e) => e.event_type === 'session_start') || {};
      const sessionId = sessionStart.session_id || (sidKey === '__unknown__' ? 'unknown_session' : sidKey);
      const runId = runIds.length === 1 ? runIds[0] : (runIds.length ? 'mixd' : null);
      const selectedProblemCountRaw = Number(sessionStart.selected_problem_count);
      const selectedProblemCount = (Number.isFinite(selectedProblemCountRaw) && selectedProblemCountRaw > 0)
        ? selectedProblemCountRaw
        : null;
      const captureStart = events.find((e) => e.event_type === 'stt_capture_start') || {};
      const chunkModeRaw = captureStart.chunk_mode || 'periodic';
      const chunkMode = normalizeChunkMode(chunkModeRaw);
      const engineToken = pickDescriptor(events.map((e) => toEngineToken(e.engine)), 'mixd', 'unkn');
      const sourceValues = events
        .map((e) => e.source || e.audio_source || null)
        .filter((v) => v != null && String(v).trim() !== '');
      const sourceToken = pickDescriptor(
        sourceValues.map((v) => toSourceToken(v)),
        'mxd',
        'unk'
      );

      const expectedByProblem = new Map();
      const firstSubmitByProblem = new Map();
      const shownTsByProblem = new Map();
      const submitTsByProblem = new Map();

      let totalFinals = 0;
      let activeProblemFinals = 0;
      let falseBeginCount = 0;
      let beginWindowFinals = 0;
      let beginWindowNonBeginFinals = 0;
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
          } else {
            beginWindowFinals += 1;
            if (!/\bbegin\b/.test(cleaned)) beginWindowNonBeginFinals += 1;
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
      const accuracySubmitted = submitted > 0 ? (100 * correct) / submitted : 0;
      const falseBeginRate = activeProblemFinals > 0 ? (100 * falseBeginCount) / activeProblemFinals : 0;
      const emptyFinalRate = totalFinals > 0 ? (100 * emptyFinalCount) / totalFinals : 0;
      const staleWrongRate = wrong > 0 ? (100 * staleWrong) / wrong : 0;
      const numericWerProxy = expectedChars > 0 ? editDistanceSum / expectedChars : 0;
      const beginGateFailCount = problems === 0 ? 1 : 0;

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
        runId,
        selectedProblemCount,
        chunkModeRaw,
        chunkMode,
        engineToken,
        sourceToken,
        problems,
        submitted,
        correct,
        wrong,
        accuracy,
        accuracySubmitted,
        falseBeginRate,
        emptyFinalRate,
        staleWrongRate,
        numericWerProxy,
        beginGateFailCount,
        beginWindowFinals,
        beginWindowNonBeginFinals,
        staleIgnored,
        staleFinalIgnored,
        uploads: uploadLatencies.length,
        uploadP50: median(uploadLatencies),
        uploadP90: p90(uploadLatencies),
        uploadMax: uploadLatencies.length ? uploadLatencies[uploadLatencies.length - 1] : null,
        server
      });
    }
  }

  if (!sessions.length) {
    console.log('No sessions matched the current filter criteria.');
    return;
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
  if (runIdFilter) console.log(`Run-id filter: ${runIdFilter}`);
  console.log('');

  for (const s of sessions) {
    console.log(`[${s.chunkMode}] ${s.file}`);
    console.log(
      `  problems=${s.problems} submitted=${s.submitted} correct=${s.correct} wrong=${s.wrong} ` +
      `acc_shown=${toFixedOrNA(s.accuracy)}% acc_submitted=${toFixedOrNA(s.accuracySubmitted)}%`
    );
    console.log(
      `  false_begin_rate=${toFixedOrNA(s.falseBeginRate)}% empty_final_rate=${toFixedOrNA(s.emptyFinalRate)}% stale_wrong_rate=${toFixedOrNA(s.staleWrongRate)}%`
    );
    console.log(
      `  numeric_wer_proxy=${toFixedOrNA(s.numericWerProxy, 3)} stale_ignored=${s.staleIgnored} stale_final_ignored=${s.staleFinalIgnored}`
    );
    console.log(
      `  begin_gate_fail=${s.beginGateFailCount} begin_window_finals=${s.beginWindowFinals} begin_window_non_begin_finals=${s.beginWindowNonBeginFinals}`
    );
    console.log(
      `  uploads=${s.uploads} upload_ms(p50/p90/max)=${s.uploadP50 ?? 'n/a'}/${s.uploadP90 ?? 'n/a'}/${s.uploadMax ?? 'n/a'}`
    );
    console.log(
      `  server(req/resp/ffmpeg_err/whisper_err/http_err)=${s.server.requests}/${s.server.responses}/${s.server.ffmpegErrors}/${s.server.whisperErrors}/${s.server.httpErrors}`
    );
  }

  const byModeSummary = [];
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
      acc.beginGateFail += s.beginGateFailCount;
      acc.beginWindowFinals += s.beginWindowFinals;
      acc.beginWindowNonBeginFinals += s.beginWindowNonBeginFinals;
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
      beginGateFail: 0,
      beginWindowFinals: 0,
      beginWindowNonBeginFinals: 0,
      uploads: 0,
      uploadP50: [],
      uploadP90: [],
      uploadMax: [],
      ffmpegErr: 0,
      whisperErr: 0,
      httpErr: 0
    });

    const acc = totals.problems > 0 ? (100 * totals.correct) / totals.problems : 0;
    const accSubmitted = totals.submitted > 0 ? (100 * totals.correct) / totals.submitted : 0;
    const avg = (arr) => arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : null;
    const modeSummary = {
      chunk_mode: mode,
      sessions: totals.sessions,
      problems: totals.problems,
      submitted: totals.submitted,
      correct: totals.correct,
      wrong: totals.wrong,
      accuracy_pct: toNumberOrNull(acc, 3),
      accuracy_submitted_pct: toNumberOrNull(accSubmitted, 3),
      avg_false_begin_rate_pct: toNumberOrNull(totals.falseBeginSum / totals.sessions, 3),
      avg_empty_final_rate_pct: toNumberOrNull(totals.emptyFinalSum / totals.sessions, 3),
      avg_stale_wrong_rate_pct: toNumberOrNull(totals.staleWrongSum / totals.sessions, 3),
      avg_numeric_wer_proxy: toNumberOrNull(totals.werSum / totals.sessions, 6),
      begin_gate_fail_count: totals.beginGateFail,
      begin_gate_fail_rate_pct: toNumberOrNull((100 * totals.beginGateFail) / totals.sessions, 3),
      begin_window_finals: totals.beginWindowFinals,
      begin_window_non_begin_finals: totals.beginWindowNonBeginFinals,
      avg_uploads_per_session: toNumberOrNull(totals.uploads / totals.sessions, 3),
      avg_upload_p50_ms: avg(totals.uploadP50),
      avg_upload_p90_ms: avg(totals.uploadP90),
      avg_upload_max_ms: avg(totals.uploadMax),
      server_ffmpeg_errors: totals.ffmpegErr,
      server_whisper_errors: totals.whisperErr,
      server_http_errors: totals.httpErr
    };
    byModeSummary.push(modeSummary);
    console.log(
      `  ${mode}: sessions=${totals.sessions} acc_shown=${toFixedOrNA(acc)}% acc_submitted=${toFixedOrNA(accSubmitted)}% ` +
      `avg_false_begin=${toFixedOrNA(totals.falseBeginSum / totals.sessions)}% ` +
      `avg_empty_final=${toFixedOrNA(totals.emptyFinalSum / totals.sessions)}% ` +
      `avg_stale_wrong=${toFixedOrNA(totals.staleWrongSum / totals.sessions)}% ` +
      `avg_wer_proxy=${toFixedOrNA(totals.werSum / totals.sessions, 3)} ` +
      `begin_gate_fail_rate=${toFixedOrNA((100 * totals.beginGateFail) / totals.sessions)}% ` +
      `avg_uploads=${toFixedOrNA(totals.uploads / totals.sessions)} ` +
      `avg_upload_ms(p50/p90/max)=${avg(totals.uploadP50) ?? 'n/a'}/${avg(totals.uploadP90) ?? 'n/a'}/${avg(totals.uploadMax) ?? 'n/a'} ` +
      `server_err(ffmpeg/whisper/http)=${totals.ffmpegErr}/${totals.whisperErr}/${totals.httpErr}`
    );
  }

  const byRun = new Map();
  for (const s of sessions) {
    const key = s.runId || 'none';
    if (!byRun.has(key)) byRun.set(key, []);
    byRun.get(key).push(s);
  }

  const byRunSummary = [];
  console.log('\nBy run_id:');
  for (const [runId, list] of byRun.entries()) {
    const totals = list.reduce((acc, s) => {
      acc.sessions += 1;
      acc.problems += s.problems;
      acc.submitted += s.submitted;
      acc.correct += s.correct;
      acc.uploads += s.uploads;
      if (s.uploadP50 != null) acc.uploadP50.push(s.uploadP50);
      if (s.uploadP90 != null) acc.uploadP90.push(s.uploadP90);
      if (s.uploadMax != null) acc.uploadMax.push(s.uploadMax);
      return acc;
    }, { sessions: 0, problems: 0, submitted: 0, correct: 0, uploads: 0, uploadP50: [], uploadP90: [], uploadMax: [] });
    const accShown = totals.problems > 0 ? (100 * totals.correct) / totals.problems : 0;
    const accSubmitted = totals.submitted > 0 ? (100 * totals.correct) / totals.submitted : 0;
    const avg = (arr) => arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : null;
    const row = {
      run_id: runId,
      sessions: totals.sessions,
      problems: totals.problems,
      submitted: totals.submitted,
      correct: totals.correct,
      accuracy_pct: toNumberOrNull(accShown, 3),
      accuracy_submitted_pct: toNumberOrNull(accSubmitted, 3),
      avg_uploads_per_session: toNumberOrNull(totals.uploads / totals.sessions, 3),
      avg_upload_p50_ms: avg(totals.uploadP50),
      avg_upload_p90_ms: avg(totals.uploadP90),
      avg_upload_max_ms: avg(totals.uploadMax)
    };
    byRunSummary.push(row);
    console.log(
      `  ${runId}: sessions=${row.sessions} problems=${row.problems} submitted=${row.submitted} ` +
      `acc_shown=${toFixedOrNA(accShown)}% acc_submitted=${toFixedOrNA(accSubmitted)}% ` +
      `avg_upload_ms(p50/p90/max)=${row.avg_upload_p50_ms ?? 'n/a'}/${row.avg_upload_p90_ms ?? 'n/a'}/${row.avg_upload_max_ms ?? 'n/a'}`
    );
  }

  const derivedOutPrefix = (() => {
    if (!autoOut) return outPrefix;
    const stamp = makeShortStamp();
    const uid = randomUid();
    const totalSessions = sessions.length;
    const totalProblems = sessions.reduce((sum, s) => (
      sum + (s.selectedProblemCount != null ? s.selectedProblemCount : (s.problems || 0))
    ), 0);
    const batchEngine = pickDescriptor(sessions.map((s) => s.engineToken), 'mixd', 'unkn');
    const batchChunk = pickDescriptor(sessions.map((s) => toChunkToken(s.chunkMode)), 'mxd', 'unk');
    const batchSource = pickDescriptor(sessions.map((s) => s.sourceToken || 'mic'), 'mxd', 'unk');
    return path.join(logsDir, `sc_rpt_bat-${stamp}-${uid}_s${totalSessions}_p${totalProblems}_${batchEngine}_${batchChunk}_${batchSource}`);
  })();

  if (derivedOutPrefix) {
    const now = new Date().toISOString();
    const sessionRows = sessions.map((s) => ({
      file: s.file,
      session_id: s.sessionId,
      run_id: s.runId,
      selected_problem_count: s.selectedProblemCount,
      source: s.sourceToken,
      chunk_mode_raw: s.chunkModeRaw,
      chunk_mode: s.chunkMode,
      problems: s.problems,
      submitted: s.submitted,
      correct: s.correct,
      wrong: s.wrong,
      accuracy_pct: toNumberOrNull(s.accuracy, 3),
      accuracy_submitted_pct: toNumberOrNull(s.accuracySubmitted, 3),
      false_begin_rate_pct: toNumberOrNull(s.falseBeginRate, 3),
      empty_final_rate_pct: toNumberOrNull(s.emptyFinalRate, 3),
      stale_wrong_rate_pct: toNumberOrNull(s.staleWrongRate, 3),
      numeric_wer_proxy: toNumberOrNull(s.numericWerProxy, 6),
      begin_gate_fail_count: s.beginGateFailCount,
      begin_window_finals: s.beginWindowFinals,
      begin_window_non_begin_finals: s.beginWindowNonBeginFinals,
      stale_ignored: s.staleIgnored,
      stale_final_ignored: s.staleFinalIgnored,
      uploads: s.uploads,
      upload_p50_ms: s.uploadP50,
      upload_p90_ms: s.uploadP90,
      upload_max_ms: s.uploadMax,
      server_requests: s.server.requests,
      server_responses: s.server.responses,
      server_ffmpeg_errors: s.server.ffmpegErrors,
      server_whisper_errors: s.server.whisperErrors,
      server_http_errors: s.server.httpErrors
    }));

    const jsonPayload = {
      generated_at_iso: now,
      logs_dir: logsDir,
      filter,
      run_id_filter: runIdFilter || null,
      sessions: sessionRows,
      by_chunk_mode: byModeSummary,
      by_run_id: byRunSummary
    };

    const jsonPath = `${derivedOutPrefix}.json`;
    fs.writeFileSync(jsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`, 'utf8');

    const headers = [
      'file',
      'session_id',
      'run_id',
      'selected_problem_count',
      'source',
      'chunk_mode_raw',
      'chunk_mode',
      'problems',
      'submitted',
      'correct',
      'wrong',
      'accuracy_pct',
      'accuracy_submitted_pct',
      'false_begin_rate_pct',
      'empty_final_rate_pct',
      'stale_wrong_rate_pct',
      'numeric_wer_proxy',
      'begin_gate_fail_count',
      'begin_window_finals',
      'begin_window_non_begin_finals',
      'stale_ignored',
      'stale_final_ignored',
      'uploads',
      'upload_p50_ms',
      'upload_p90_ms',
      'upload_max_ms',
      'server_requests',
      'server_responses',
      'server_ffmpeg_errors',
      'server_whisper_errors',
      'server_http_errors'
    ];
    const csvRows = [
      headers.join(','),
      ...sessionRows.map((row) => headers.map((h) => csvCell(row[h])).join(','))
    ];
    const csvPath = `${derivedOutPrefix}.csv`;
    fs.writeFileSync(csvPath, `${csvRows.join('\n')}\n`, 'utf8');
    console.log(`\nWrote summary files:\n  ${jsonPath}\n  ${csvPath}`);
  }
}

main();
