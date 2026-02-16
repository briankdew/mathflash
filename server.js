const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const app = express();
const upload = multer({ dest: 'tmp_uploads/' });

const WHISPER_CPP_BIN = process.env.WHISPER_CPP_BIN || path.join(__dirname, 'whisper.cpp', 'build', 'bin', 'whisper-cli');
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(__dirname, 'whisper.cpp', 'models', 'ggml-tiny.en.bin');
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';
const WHISPER_TIMEOUT_MS = Number(process.env.WHISPER_TIMEOUT_MS || 20000);
const STT_DEBUG_ENABLED = process.env.STT_DEBUG !== '0';
const STT_DEBUG_LOG_PATH = process.env.STT_DEBUG_LOG_PATH || path.join(__dirname, 'logs', 'stt-server-events.jsonl');

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

app.listen(8001, () => {
  console.log('Server running on http://localhost:8001');
  console.log(`WHISPER_CPP_BIN=${WHISPER_CPP_BIN}`);
  console.log(`WHISPER_MODEL=${WHISPER_MODEL}`);
  console.log(`STT_DEBUG_ENABLED=${STT_DEBUG_ENABLED}`);
  console.log(`STT_DEBUG_LOG_PATH=${STT_DEBUG_LOG_PATH}`);
});
