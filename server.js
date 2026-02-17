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
const STT_DEBUG_LOG_PATH = process.env.STT_DEBUG_LOG_PATH || path.join(__dirname, 'logs', 'stt-server-events.jsonl');
const CLIENT_TEST_LOGS_DIR = process.env.CLIENT_TEST_LOGS_DIR || path.join(__dirname, 'docs', 'speechCapture', 'speechcapture-session-logs');

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
  const safeRunId = sanitizeFilePart(runId, 'run');
  const filePath = path.join(CLIENT_TEST_LOGS_DIR, `speechCapture_events_run_${safeRunId}.jsonl`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const lines = events.map((event) => JSON.stringify({
    ingest_ts_ms: Date.now(),
    ingest_ts_iso: new Date().toISOString(),
    ...event
  }));

  if (!lines.length) {
    return filePath;
  }

  await fs.appendFile(filePath, `${lines.join('\n')}\n`, 'utf8');
  return filePath;
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
