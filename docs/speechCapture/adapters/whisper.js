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
    let queue = [];
    let processing = false;

    const endpoint = DEFAULT_ENDPOINT;
    const timesliceMs = DEFAULT_TIMESLICE_MS;

    function abortAndReset() {
      stop();
    }

    function clearState() {
      queue = [];
      processing = false;
      chunkSeq = 0;
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
        const { blob, seq } = item;
        const form = new FormData();
        form.append('file', blob, `whisper-chunk-${seq}.webm`);

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            body: form
          });

          if (!res.ok) {
            deps.logLine('STT_ERR', `Whisper HTTP ${res.status} for chunk ${seq}`);
            continue;
          }

          const body = await res.json();
          const transcript = String(body?.text || body?.transcript || '').trim();
          if (!transcript) continue;

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
      queue.push({ blob, seq: chunkSeq });
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
      started = true;
      recorder.start(timesliceMs);
      deps.logLine('STT_INFO', `Whisper adapter active (endpoint=${endpoint}, chunk_ms=${timesliceMs}).`);
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
