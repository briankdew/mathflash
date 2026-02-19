const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
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
    const isTestRun = body.test_run === true || String(body.test_run).toLowerCase() === 'true';
    if (!isTestRun) {
      return res.status(400).json({ error: 'test_run must be true' });
    }

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

app.listen(8001, () => {
  console.log('Server running on http://localhost:8001');
  console.log(`WHISPER_CPP_BIN=${WHISPER_CPP_BIN}`);
  console.log(`WHISPER_MODEL=${WHISPER_MODEL}`);
  console.log(`STT_DEBUG_ENABLED=${STT_DEBUG_ENABLED}`);
  console.log(`STT_DEBUG_LOG_PATH=${STT_DEBUG_LOG_PATH}`);
  console.log(`CLIENT_TEST_LOGS_DIR=${CLIENT_TEST_LOGS_DIR}`);
});
