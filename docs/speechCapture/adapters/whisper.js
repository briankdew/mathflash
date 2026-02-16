(() => {
  const DEFAULT_ENDPOINT = '/api/stt/whisper';
  const DEFAULT_TIMESLICE_MS = 1200;

  function isWhisperBrowserSupported() {
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined' &&
      typeof FormData !== 'undefined' &&
      typeof fetch === 'function'
    );
  }

  function getWhisperCapability() {
    const supported = isWhisperBrowserSupported();
    return {
      available: supported,
      reason: supported
        ? 'Browser supports MediaRecorder. Requires a backend STT endpoint at /api/stt/whisper.'
        : 'MediaRecorder or getUserMedia is unavailable in this browser.'
    };
  }

  function pickMimeType() {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }

    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }

    return '';
  }

  function createWhisperAdapter(deps) {
    let started = false;
    let stream = null;
    let recorder = null;
    let chunkSeq = 0;
    let segmentId = 0;
    let queue = [];
    let recordedChunks = [];
    let lastTranscript = '';
    let processing = false;

    const endpoint = DEFAULT_ENDPOINT;
    const timesliceMs = DEFAULT_TIMESLICE_MS;

    function abortAndReset() {
      stop();
    }

    function clearState() {
      queue = [];
      recordedChunks = [];
      lastTranscript = '';
      processing = false;
      chunkSeq = 0;
    }

    function cleanTranscript(raw) {
      return String(raw || '')
        .replace(/\[BLANK_AUDIO\]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function getTranscriptDelta(previous, current) {
      if (!current) return '';
      if (!previous) return current;
      if (current === previous) return '';
      if (current.startsWith(previous)) {
        return current.slice(previous.length).trim();
      }

      const prevTokens = previous.toLowerCase().split(/\s+/).filter(Boolean);
      const currTokens = current.split(/\s+/).filter(Boolean);
      const currLower = currTokens.map((t) => t.toLowerCase());
      const maxOverlap = Math.min(prevTokens.length, currLower.length);

      let overlap = 0;
      for (let k = maxOverlap; k > 0; k--) {
        const prevSuffix = prevTokens.slice(prevTokens.length - k).join(' ');
        const currPrefix = currLower.slice(0, k).join(' ');
        if (prevSuffix === currPrefix) {
          overlap = k;
          break;
        }
      }

      if (overlap > 0) {
        return currTokens.slice(overlap).join(' ').trim();
      }

      return current;
    }

    function cleanupMedia() {
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstart = null;
        recorder.onstop = null;
        recorder = null;
      }

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    }

    async function processQueue() {
      if (processing) return;
      processing = true;

      while (started && queue.length > 0) {
        const item = queue.shift();
        const { blob, seq, mimeType } = item;
        const uploadStart = Date.now();
        const context = typeof deps.getEventContext === 'function'
          ? deps.getEventContext({ segment_id: segmentId, chunk_id: seq, chunk_size_bytes: blob.size })
          : {};
        const form = new FormData();
        form.append('file', blob, `whisper-chunk-${seq}.webm`);
        form.append('session_id', String(context.session_id || ''));
        form.append('problem_id', String(context.problem_id ?? ''));
        form.append('segment_id', String(context.segment_id ?? segmentId));
        form.append('chunk_id', String(context.chunk_id ?? seq));
        form.append('engine', String(context.engine || 'whisper'));
        form.append('client_ts_ms', String(context.client_ts_ms || Date.now()));

        if (typeof deps.emitEvent === 'function') {
          deps.emitEvent('stt_chunk_upload_start', {
            segment_id: segmentId,
            chunk_id: seq,
            chunk_size_bytes: blob.size,
            chunk_mime_type: mimeType || (recorder ? recorder.mimeType : '')
          });
        }

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            body: form
          });

          if (typeof deps.emitEvent === 'function') {
            deps.emitEvent('stt_chunk_upload_end', {
              segment_id: segmentId,
              chunk_id: seq,
              http_status: res.status,
              elapsed_ms: Date.now() - uploadStart
            });
          }

          if (!res.ok) {
            deps.logLine('STT_ERR', `Whisper HTTP ${res.status} for chunk ${seq}`);
            continue;
          }

          const body = await res.json();
          const fullTranscript = cleanTranscript(body?.text || body?.transcript || '');
          if (typeof deps.emitEvent === 'function') {
            deps.emitEvent('stt_result_raw', {
              segment_id: segmentId,
              chunk_id: seq,
              transcript_full: fullTranscript
            });
          }
          if (!fullTranscript) {
            lastTranscript = '';
            continue;
          }

          const transcript = getTranscriptDelta(lastTranscript, fullTranscript);
          lastTranscript = fullTranscript;
          if (!transcript) continue;

          if (typeof deps.emitEvent === 'function') {
            deps.emitEvent('stt_result_delta', {
              segment_id: segmentId,
              chunk_id: seq,
              transcript_delta: transcript
            });
          }

          deps.logLine('REC_RES', `i=${seq} final=true conf=n/a txt="${transcript}"`);
          deps.onFinalResult({
            index: seq,
            transcript,
            confidence: null,
            abortAndReset
          });
        } catch (err) {
          deps.logLine('STT_ERR', `Whisper request failed for chunk ${seq}: ${err && err.message ? err.message : String(err)}`);
        }
      }

      processing = false;
    }

    function enqueueChunk(blob) {
      if (!started || !blob || blob.size === 0) return;
      chunkSeq += 1;
      recordedChunks.push(blob);
      const mimeType = (recorder && recorder.mimeType) ? recorder.mimeType : 'audio/webm';
      const cumulativeBlob = new Blob(recordedChunks, {
        type: mimeType
      });
      queue.push({ blob: cumulativeBlob, seq: chunkSeq, mimeType });
      void processQueue();
    }

    async function start() {
      if (started) return;
      if (!isWhisperBrowserSupported()) {
        deps.logLine('STT_ERR', 'Whisper adapter unavailable: MediaRecorder/getUserMedia not supported.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        deps.logLine('STT_ERR', `Whisper getUserMedia failed: ${err && err.message ? err.message : String(err)}`);
        cleanupMedia();
        return;
      }

      const mimeType = pickMimeType();

      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (err) {
        deps.logLine('STT_ERR', `Whisper MediaRecorder init failed: ${err && err.message ? err.message : String(err)}`);
        cleanupMedia();
        return;
      }

      recorder.onstart = () => {
        deps.logLine('REC', 'onstart');
        deps.logLine('REC', 'onaudiostart');
        deps.onAudioStart();
      };

      recorder.onerror = (event) => {
        const msg = event && event.error && event.error.message ? event.error.message : 'unknown recorder error';
        deps.logLine('STT_ERR', `Whisper recorder error: ${msg}`);
      };

      recorder.ondataavailable = (event) => {
        enqueueChunk(event.data);
      };

      recorder.onstop = () => {
        deps.logLine('REC', 'onaudioend');
        deps.logLine('REC', 'onend');
      };

      clearState();
      segmentId += 1;
      started = true;
      recorder.start(timesliceMs);
      deps.logLine('STT_INFO', `Whisper adapter active (endpoint=${endpoint}, chunk_ms=${timesliceMs}).`);
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_capture_start', {
          segment_id: segmentId,
          endpoint,
          chunk_ms: timesliceMs
        });
      }
    }

    function stop() {
      if (!started && !recorder && !stream) return;
      started = false;

      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // ignore stop errors
        }
      }

      cleanupMedia();
      clearState();
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_capture_stop');
      }
    }

    function reset() {
      stop();
    }

    return {
      start,
      stop,
      reset,
      isRecognizing: () => started
    };
  }

  window.createWhisperAdapter = createWhisperAdapter;
  window.getWhisperAdapterCapability = getWhisperCapability;
})();
