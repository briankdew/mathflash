const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const app = express();
const upload = multer({ dest: 'tmp_uploads/' });
app.use(express.json({ limit: '5mb' }));

const WHISPER_CPP_BIN = process.env.WHISPER_CPP_BIN || path.join(__dirname, 'whisper.cpp', 'build', 'bin', 'whisper-cli');
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(__dirname, 'whisper.cpp', 'models', 'ggml-tiny.en.bin');
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';
const WHISPER_TIMEOUT_MS = Number(process.env.WHISPER_TIMEOUT_MS || 20000);
const STT_DEBUG_ENABLED = process.env.STT_DEBUG !== '0';
const CLIENT_TEST_LOGS_DIR = process.env.CLIENT_TEST_LOGS_DIR || path.join(__dirname, 'docs', 'speechCapture', 'sc-session-logs');
const ANALYZER_SCRIPT_PATH = path.join(__dirname, 'docs', 'speechCapture', 'analyze-voice-metrics.js');

function makeShortStamp(date = new Date()) {
  const y = String(date.getFullYear()).slice(-1);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${mm}${dd}.${hh}${min}.${ss}`;
}

const STT_DEBUG_LOG_PATH = process.env.STT_DEBUG_LOG_PATH || path.join(
  __dirname,
  'docs',
  'speechCapture',
  'sc-session-logs',
  `sc_log_svr-${makeShortStamp()}.jsonl`
);

// Serve your current frontend
app.use(express.static(path.join(__dirname, 'docs/speechCapture')));

function normalizeTranscript(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNullableString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function sanitizeFilePart(value, fallback = 'run') {
  const raw = toNullableString(value) || fallback;
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return safe || fallback;
}

function readJsonlLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function toEngineToken(engine) {
  const e = sanitizeFilePart(String(engine || '').toLowerCase(), 'unknown');
  if (e === 'webspeech') return 'wbsp';
  if (e === 'whisper') return 'wspc';
  if (e === 'vosk') return 'vosk';
  return 'unkn';
}

function toChunkToken(chunkMode) {
  const c = sanitizeFilePart(String(chunkMode || '').toLowerCase(), 'unknown');
  if (c === 'periodic' || c === 'fixed' || c === 'fxd') return 'fxd';
  if (c === 'utterance' || c === 'vad') return 'vad';
  return 'unk';
}

function pickDescriptor(values, mixedToken, unknownToken) {
  const set = new Set(values.filter(Boolean));
  if (!set.size) return unknownToken;
  if (set.size === 1) return [...set][0];
  return mixedToken;
}

function parseRunIdParts(runId) {
  const raw = String(runId || '');
  const match = /^run_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_([a-z0-9]{2,})$/i.exec(raw);
  if (match) {
    const y = match[1].slice(-1);
    const mm = match[2];
    const dd = match[3];
    const hh = match[4];
    const min = match[5];
    const ss = match[6];
    const uid = sanitizeFilePart(match[7], 'run').slice(0, 4).padEnd(4, '0');
    return { stamp: `${y}${mm}${dd}.${hh}${min}.${ss}`, uid };
  }
  return {
    stamp: makeShortStamp(),
    uid: sanitizeFilePart(raw, 'run').slice(-4).padStart(4, '0')
  };
}

function deriveRunSummary(events) {
  const sessionIds = new Set();
  const observedProblemIndexesBySession = new Map();
  const selectedProblemCountBySession = new Map();
  const engineTokens = [];
  const chunkTokens = [];
  const sourceTokens = [];

  for (const event of events) {
    const sid = toNullableString(event?.session_id);
    if (sid) sessionIds.add(sid);

    if (event?.event_type === 'problem_shown' && event?.problem_index != null) {
      const sidKey = sid || 'unknown';
      if (!observedProblemIndexesBySession.has(sidKey)) {
        observedProblemIndexesBySession.set(sidKey, new Set());
      }
      observedProblemIndexesBySession.get(sidKey).add(String(event.problem_index));
    }

    if (event?.event_type === 'session_start') {
      const selected = Number(event?.selected_problem_count);
      if (sid && Number.isFinite(selected) && selected > 0) {
        selectedProblemCountBySession.set(sid, selected);
      }
    }

    engineTokens.push(toEngineToken(event?.engine));

    if (event?.event_type === 'stt_capture_start') {
      chunkTokens.push(toChunkToken(event?.chunk_mode));
    }

    const srcRaw = sanitizeFilePart(String(event?.source || event?.audio_source || 'mic').toLowerCase(), 'mic');
    if (srcRaw === 'mic' || srcRaw === 'voice') {
      sourceTokens.push('mic');
    } else if (srcRaw === 'rec' || srcRaw === 'recording' || srcRaw === 'file') {
      sourceTokens.push('rec');
    } else {
      sourceTokens.push('unk');
    }
  }

  const sessions = sessionIds.size;
  let problems = 0;
  if (sessions > 0) {
    for (const sid of sessionIds) {
      if (selectedProblemCountBySession.has(sid)) {
        problems += selectedProblemCountBySession.get(sid);
      } else {
        const observed = observedProblemIndexesBySession.get(sid);
        problems += observed ? observed.size : 0;
      }
    }
  } else {
    for (const indexes of observedProblemIndexesBySession.values()) {
      problems += indexes.size;
    }
  }
  const engine = pickDescriptor(engineTokens, 'mixd', 'unkn');
  const chunk = pickDescriptor(chunkTokens, 'mxd', 'unk');
  const source = pickDescriptor(sourceTokens, 'mxd', 'unk');
  return { sessions, problems, engine, chunk, source };
}

function parseRequestContext(req) {
  const b = req.body || {};
  return {
    session_id: toNullableString(b.session_id),
    problem_id: toNullableString(b.problem_id),
    segment_id: toNullableString(b.segment_id),
    chunk_id: toNullableString(b.chunk_id),
    engine: toNullableString(b.engine) || 'whisper',
    client_ts_ms: toNullableString(b.client_ts_ms)
  };
}

function isRecoverableAudioInputError(errorMessage) {
  const msg = String(errorMessage || '').toLowerCase();
  return (
    msg.includes('invalid data found when processing input') ||
    msg.includes('error reading header') ||
    msg.includes('could not find codec parameters') ||
    msg.includes('end of file')
  );
}

function sanitizeLogFilename(name) {
  const file = path.basename(String(name || '').trim());
  if (!file || file === '.' || file === '..') return null;
  if (/[\\/]/.test(file)) return null;
  return file;
}

function decodeShortStamp(stamp) {
  const m = /^(\d)(\d{2})(\d{2})\.(\d{2})(\d{2})(?:\.(\d{2}))?$/.exec(String(stamp || ''));
  if (!m) return null;
  const yDigit = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] || '0');
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const nowYear = new Date().getFullYear();
  let year = Math.floor(nowYear / 10) * 10 + yDigit;
  if (year - nowYear > 5) year -= 10;
  if (nowYear - year > 5) year += 10;
  const dt = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatDisplayDate(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(dateObj);
}

function parseScFileMeta(filename) {
  const ext = path.extname(filename).slice(1).toUpperCase();
  const scopeMatch = /^sc_[^_]+_([a-z]{3})-/.exec(filename);
  const scopeKey = scopeMatch ? scopeMatch[1].toLowerCase() : 'unknown';
  const scopeMap = { ses: 'Session', run: 'Run', bat: 'Batch', svr: 'Server' };
  const scope = scopeMap[scopeKey] || 'Unknown';
  const stampMatch = /-(\d{5}\.\d{4}(?:\.\d{2})?)/.exec(filename);
  const stamp = stampMatch ? stampMatch[1] : null;
  const dt = stamp ? decodeShortStamp(stamp) : null;
  const analyzeAllowed = (scopeKey === 'ses' || scopeKey === 'run') && ext === 'JSONL';
  return {
    filename,
    scope_key: scopeKey,
    scope,
    scope_stamp: stamp,
    scope_date_time: dt ? formatDisplayDate(dt) : (stamp || 'Unknown'),
    file_type: ext || 'UNKNOWN',
    analyze_allowed: analyzeAllowed
  };
}

async function listSessionLogFiles() {
  await fs.mkdir(CLIENT_TEST_LOGS_DIR, { recursive: true });
  const entries = await fs.readdir(CLIENT_TEST_LOGS_DIR, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(CLIENT_TEST_LOGS_DIR, entry.name);
    const stat = await fs.stat(fullPath).catch(() => null);
    if (!stat) continue;
    const meta = parseScFileMeta(entry.name);
    files.push({
      ...meta,
      size_bytes: stat.size,
      modified_ts_ms: stat.mtimeMs
    });
  }
  files.sort((a, b) => b.modified_ts_ms - a.modified_ts_ms);
  return files;
}

function inferArchiveFolderName(filename) {
  const stampMatch = /-(\d{5})\./.exec(filename);
  const prefix = stampMatch ? stampMatch[1] : 'misc';
  return `sc_log_and_rpt_archive_${prefix}`;
}

async function ensureUniquePath(targetPath) {
  let candidate = targetPath;
  let n = 1;
  while (true) {
    try {
      await fs.access(candidate);
      const dir = path.dirname(targetPath);
      const ext = path.extname(targetPath);
      const base = path.basename(targetPath, ext);
      candidate = path.join(dir, `${base}_${String(n).padStart(2, '0')}${ext}`);
      n += 1;
    } catch {
      return candidate;
    }
  }
}

async function moveFileSafe(srcPath, dstPath) {
  try {
    await fs.rename(srcPath, dstPath);
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      await fs.copyFile(srcPath, dstPath);
      await fs.unlink(srcPath).catch(() => {});
      return;
    }
    throw err;
  }
}

async function appendServerEvent(eventType, payload = {}) {
  if (!STT_DEBUG_ENABLED) return;
  const event = {
    ts_ms: Date.now(),
    ts_iso: new Date().toISOString(),
    event_type: eventType,
    ...payload
  };

  try {
    await fs.mkdir(path.dirname(STT_DEBUG_LOG_PATH), { recursive: true });
    await fs.appendFile(STT_DEBUG_LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');
  } catch (err) {
    console.error('Failed writing STT debug log:', err && err.message ? err.message : err);
  }
}

async function appendClientTestEvents(runId, events) {
  const parts = parseRunIdParts(runId);
  await fs.mkdir(CLIENT_TEST_LOGS_DIR, { recursive: true });

  const prefix = `sc_log_run-${parts.stamp}-${parts.uid}_`;
  const dirFiles = await fs.readdir(CLIENT_TEST_LOGS_DIR).catch(() => []);
  const priorFile = dirFiles
    .filter((name) => name.startsWith(prefix) && name.endsWith('.jsonl'))
    .sort()
    .at(-1);

  let priorEvents = [];
  let priorPath = null;
  if (priorFile) {
    priorPath = path.join(CLIENT_TEST_LOGS_DIR, priorFile);
    const priorText = await fs.readFile(priorPath, 'utf8').catch(() => '');
    priorEvents = readJsonlLines(priorText);
  }

  const lines = events.map((event) => JSON.stringify({
    ingest_ts_ms: Date.now(),
    ingest_ts_iso: new Date().toISOString(),
    ...event
  }));
  const newEvents = lines.map((line) => JSON.parse(line));
  const summary = deriveRunSummary([...priorEvents, ...newEvents]);
  const targetName =
    `sc_log_run-${parts.stamp}-${parts.uid}` +
    `_s${summary.sessions}_p${summary.problems}_${summary.engine}_${summary.chunk}_${summary.source}.jsonl`;
  const targetPath = path.join(CLIENT_TEST_LOGS_DIR, targetName);

  if (priorPath && priorPath !== targetPath) {
    await fs.rename(priorPath, targetPath).catch(async () => {
      const text = await fs.readFile(priorPath, 'utf8').catch(() => '');
      await fs.writeFile(targetPath, text, 'utf8');
      await fs.unlink(priorPath).catch(() => {});
    });
  }

  if (!lines.length) {
    return targetPath;
  }

  await fs.appendFile(targetPath, `${lines.join('\n')}\n`, 'utf8');
  return targetPath;
}

async function convertToWav(inputPath, outputPath, context) {
  const start = Date.now();
  await appendServerEvent('ffmpeg_start', {
    ...context,
    input_path: inputPath,
    output_path: outputPath,
    timeout_ms: WHISPER_TIMEOUT_MS
  });

  try {
    await execFileAsync(FFMPEG_BIN, [
      '-y',
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      outputPath
    ], { timeout: WHISPER_TIMEOUT_MS });

    await appendServerEvent('ffmpeg_end', {
      ...context,
      status: 'ok',
      elapsed_ms: Date.now() - start
    });
  } catch (err) {
    await appendServerEvent('ffmpeg_end', {
      ...context,
      status: 'error',
      elapsed_ms: Date.now() - start,
      error_message: err && err.message ? err.message : String(err)
    });
    throw err;
  }
}

async function runWhisperCpp(wavPath, outputBase, context) {
  const args = [
    '-m', WHISPER_MODEL,
    '-f', wavPath,
    '-l', 'en',
    '-nt',
    '-np',
    '-of', outputBase,
    '-otxt'
  ];

  const start = Date.now();
  await appendServerEvent('whisper_start', {
    ...context,
    wav_path: wavPath,
    output_base: outputBase,
    args
  });

  let rawText = '';

  try {
    const { stdout } = await execFileAsync(WHISPER_CPP_BIN, args, { timeout: WHISPER_TIMEOUT_MS });

    const txtPath = `${outputBase}.txt`;
    try {
      rawText = await fs.readFile(txtPath, 'utf8');
    } catch {
      rawText = stdout || '';
    }

    const normalizedText = normalizeTranscript(rawText);
    await appendServerEvent('whisper_end', {
      ...context,
      status: 'ok',
      elapsed_ms: Date.now() - start,
      transcript_raw: rawText,
      transcript_normalized: normalizedText
    });

    return { rawText, normalizedText };
  } catch (err) {
    await appendServerEvent('whisper_end', {
      ...context,
      status: 'error',
      elapsed_ms: Date.now() - start,
      error_message: err && err.message ? err.message : String(err)
    });
    throw err;
  }
}

async function transcribeWithWhisper(filePath, context) {
  const wavPath = `${filePath}.wav`;
  const outputBase = `${filePath}.whisper`;
  const txtPath = `${outputBase}.txt`;

  try {
    await convertToWav(filePath, wavPath, context);
    return await runWhisperCpp(wavPath, outputBase, context);
  } finally {
    await fs.unlink(wavPath).catch(() => {});
    await fs.unlink(txtPath).catch(() => {});
  }
}

app.post('/api/stt/whisper', upload.single('file'), async (req, res) => {
  const context = parseRequestContext(req);
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const requestStart = Date.now();

  try {
    if (!req.file) {
      await appendServerEvent('request_rejected', {
        request_id: requestId,
        ...context,
        reason: 'missing_file'
      });
      return res.status(400).json({ error: 'Missing file field' });
    }

    const requestContext = {
      request_id: requestId,
      ...context,
      file_size_bytes: req.file.size,
      file_mime_type: req.file.mimetype
    };

    await appendServerEvent('request_received', requestContext);

    if (Number(req.file.size || 0) < 1024) {
      await appendServerEvent('response_sent', {
        ...requestContext,
        status_code: 200,
        elapsed_ms: Date.now() - requestStart,
        transcript_raw: '',
        transcript_normalized: '',
        skipped_reason: 'tiny_upload'
      });
      return res.json({ text: '' });
    }

    const { rawText, normalizedText } = await transcribeWithWhisper(req.file.path, requestContext);

    await appendServerEvent('response_sent', {
      ...requestContext,
      status_code: 200,
      elapsed_ms: Date.now() - requestStart,
      transcript_raw: rawText,
      transcript_normalized: normalizedText
    });

    res.json({ text: String(normalizedText || '').trim() });
  } catch (err) {
    const errorMessage = err && err.message ? err.message : String(err);
    if (isRecoverableAudioInputError(errorMessage)) {
      await appendServerEvent('response_sent', {
        request_id: requestId,
        ...context,
        status_code: 200,
        elapsed_ms: Date.now() - requestStart,
        transcript_raw: '',
        transcript_normalized: '',
        skipped_reason: 'recoverable_audio_input_error',
        error_message: errorMessage
      });
      console.warn('Recoverable audio input error (returning empty transcript):', errorMessage);
      return res.json({ text: '' });
    }

    await appendServerEvent('response_sent', {
      request_id: requestId,
      ...context,
      status_code: 500,
      elapsed_ms: Date.now() - requestStart,
      error_message: errorMessage
    });
    console.error('Transcription failed:', errorMessage);
    res.status(500).json({ error: 'Transcription failed' });
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
});

app.post('/api/logs/client-events', async (req, res) => {
  try {
    const body = req.body || {};

    const runId = toNullableString(body.run_id);
    const payload = body.events != null ? body.events : body.event;
    const events = Array.isArray(payload) ? payload : (payload ? [payload] : []);
    if (!events.length) {
      return res.status(400).json({ error: 'Missing events payload' });
    }

    const normalizedEvents = events.map((event) => ({
      ...event,
      run_id: toNullableString(event?.run_id) || runId
    }));

    const filePath = await appendClientTestEvents(runId || normalizedEvents[0]?.run_id, normalizedEvents);
    return res.json({
      ok: true,
      events_written: normalizedEvents.length,
      file: filePath
    });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('Client event log write failed:', message);
    return res.status(500).json({ error: 'Client event log write failed' });
  }
});

app.get('/api/logs/sessions', async (_req, res) => {
  try {
    const files = await listSessionLogFiles();
    return res.json({ ok: true, files });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('List session logs failed:', message);
    return res.status(500).json({ error: 'List session logs failed' });
  }
});

app.get('/api/logs/file', async (req, res) => {
  try {
    const file = sanitizeLogFilename(req.query?.name);
    if (!file) return res.status(400).json({ error: 'Missing or invalid filename' });
    const fullPath = path.join(CLIENT_TEST_LOGS_DIR, file);
    const data = await fs.readFile(fullPath, 'utf8');
    const ext = path.extname(file).toLowerCase();
    if (ext === '.json') {
      try {
        const parsed = JSON.parse(data);
        return res.json({ ok: true, filename: file, text: JSON.stringify(parsed, null, 2) });
      } catch {
        return res.json({ ok: true, filename: file, text: data });
      }
    }
    return res.json({ ok: true, filename: file, text: data });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('Read session log file failed:', message);
    return res.status(500).json({ error: 'Read session log file failed' });
  }
});

app.post('/api/logs/analyze', async (req, res) => {
  let tempDir = null;
  try {
    const body = req.body || {};
    const filenamesRaw = Array.isArray(body.filenames) ? body.filenames : [];
    const filenames = filenamesRaw.map(sanitizeLogFilename).filter(Boolean);
    if (!filenames.length) {
      return res.status(400).json({ error: 'Missing filenames payload' });
    }

    const eligible = filenames.filter((name) => {
      const meta = parseScFileMeta(name);
      return meta.analyze_allowed;
    });
    if (!eligible.length) {
      return res.status(400).json({ error: 'No analyzable ses/run files selected' });
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-analyze-'));
    for (const file of eligible) {
      const src = path.join(CLIENT_TEST_LOGS_DIR, file);
      const dst = path.join(tempDir, file);
      await fs.copyFile(src, dst);
    }

    await execFileAsync(
      process.execPath,
      [ANALYZER_SCRIPT_PATH, tempDir, '', 'auto'],
      { timeout: WHISPER_TIMEOUT_MS * 6 }
    );

    const tempFiles = await fs.readdir(tempDir);
    const outputs = tempFiles.filter((name) => /^sc_rpt_bat-.*\.(json|csv)$/.test(name)).sort();
    const moved = [];
    for (const output of outputs) {
      const src = path.join(tempDir, output);
      const dstBase = path.join(CLIENT_TEST_LOGS_DIR, output);
      const dst = await ensureUniquePath(dstBase);
      await moveFileSafe(src, dst);
      moved.push(path.basename(dst));
    }

    return res.json({
      ok: true,
      analyzed_files: eligible,
      output_files: moved
    });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('Analyze selected files failed:', message);
    return res.status(500).json({ error: 'Analyze selected files failed' });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
});

app.post('/api/logs/archive', async (req, res) => {
  try {
    const body = req.body || {};
    const filenamesRaw = Array.isArray(body.filenames) ? body.filenames : [];
    const filenames = filenamesRaw.map(sanitizeLogFilename).filter(Boolean);
    if (!filenames.length) {
      return res.status(400).json({ error: 'Missing filenames payload' });
    }

    const moved = [];
    for (const file of filenames) {
      const src = path.join(CLIENT_TEST_LOGS_DIR, file);
      const archiveFolder = path.join(CLIENT_TEST_LOGS_DIR, inferArchiveFolderName(file));
      await fs.mkdir(archiveFolder, { recursive: true });
      const dstBase = path.join(archiveFolder, file);
      const dst = await ensureUniquePath(dstBase);
      await moveFileSafe(src, dst);
      moved.push({
        filename: file,
        archived_to: dst
      });
    }

    return res.json({ ok: true, archived: moved });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('Archive selected files failed:', message);
    return res.status(500).json({ error: 'Archive selected files failed' });
  }
});

app.listen(8001, () => {
  console.log('Server running on http://localhost:8001');
  console.log(`WHISPER_CPP_BIN=${WHISPER_CPP_BIN}`);
  console.log(`WHISPER_MODEL=${WHISPER_MODEL}`);
  console.log(`STT_DEBUG_ENABLED=${STT_DEBUG_ENABLED}`);
  console.log(`STT_DEBUG_LOG_PATH=${STT_DEBUG_LOG_PATH}`);
  console.log(`CLIENT_TEST_LOGS_DIR=${CLIENT_TEST_LOGS_DIR}`);
});
