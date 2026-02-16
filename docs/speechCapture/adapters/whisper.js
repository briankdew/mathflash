(() => {
  const DEFAULT_ENDPOINT = '/api/stt/whisper';
  const DEFAULT_TIMESLICE_MS = 1200;
  const RESULT_SETTLE_MS = 700;
  const WINDOW_TIMEOUT_MS = 5000;

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
    let recorderMimeType = 'audio/webm';
    let chunkSeq = 0;
    let segmentId = 0;
    let activeProblemId = null;
    let activeWindowId = 0;
    let windowActive = false;
    let acceptingChunks = false;
    let queue = [];
    let recordedChunks = [];
    let lastTranscript = '';
    let processing = false;
    let restartingRecorder = false;
    let pendingFinalResult = null;
    let settleTimerId = 0;
    let windowTimeoutTimerId = 0;
    let voiceIsOn = false;

    const endpoint = DEFAULT_ENDPOINT;
    const timesliceMs = DEFAULT_TIMESLICE_MS;

    function abortAndReset() {
      stop();
    }

    function clearState() {
      if (settleTimerId) {
        clearTimeout(settleTimerId);
        settleTimerId = 0;
      }
      if (windowTimeoutTimerId) {
        clearTimeout(windowTimeoutTimerId);
        windowTimeoutTimerId = 0;
      }
      queue = [];
      recordedChunks = [];
      lastTranscript = '';
      processing = false;
      chunkSeq = 0;
      activeProblemId = null;
      activeWindowId = 0;
      windowActive = false;
      acceptingChunks = false;
      restartingRecorder = false;
      pendingFinalResult = null;
      voiceIsOn = false;
    }

    function normalizeProblemId(value) {
      if (value == null) return null;
      const s = String(value).trim();
      return s === '' ? null : s;
    }

    function startNewSegment(problemId, reason) {
      segmentId += 1;
      chunkSeq = 0;
      queue = [];
      recordedChunks = [];
      lastTranscript = '';
      activeProblemId = normalizeProblemId(problemId);
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_segment_open', {
          segment_id: segmentId,
          problem_id: activeProblemId,
          reason
        });
      }
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

    function clearSettleTimer() {
      if (!settleTimerId) return;
      clearTimeout(settleTimerId);
      settleTimerId = 0;
    }

    function clearWindowTimeoutTimer() {
      if (!windowTimeoutTimerId) return;
      clearTimeout(windowTimeoutTimerId);
      windowTimeoutTimerId = 0;
    }

    function resetWindowResultState() {
      pendingFinalResult = null;
      clearSettleTimer();
      clearWindowTimeoutTimer();
    }

    function emitFinalToApp(result, reason) {
      deps.logLine('REC_RES', `i=${result.index} final=true conf=n/a txt="${result.transcript}"`);
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_result_dispatch', {
          segment_id: result.source_segment_id,
          chunk_id: result.source_chunk_id,
          reason
        });
      }
      deps.onFinalResult({
        index: result.index,
        transcript: result.transcript,
        confidence: null,
        abortAndReset,
        source_problem_id: result.source_problem_id,
        source_segment_id: result.source_segment_id,
        source_chunk_id: result.source_chunk_id
      });
    }

    function dispatchPendingResult(reason, expectedWindowId = null) {
      if (!windowActive) return false;
      if (expectedWindowId != null && expectedWindowId !== activeWindowId) return false;
      if (activeProblemId == null) return false;
      if (!pendingFinalResult) return false;
      if (pendingFinalResult.windowId !== activeWindowId) return false;

      const result = pendingFinalResult;
      pendingFinalResult = null;
      emitFinalToApp(result, reason);
      return true;
    }

    function dispatchTimeoutFallback(expectedWindowId) {
      if (!windowActive) return;
      if (expectedWindowId !== activeWindowId) return;
      if (activeProblemId == null) return;

      if (dispatchPendingResult('timeout_with_buffered_result', expectedWindowId)) {
        return;
      }

      const emptyResult = {
        index: 0,
        transcript: '',
        source_problem_id: activeProblemId,
        source_segment_id: segmentId,
        source_chunk_id: null
      };
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_result_timeout_fallback', {
          segment_id: segmentId,
          window_id: activeWindowId,
          reason: 'timeout_no_result'
        });
      }
      emitFinalToApp(emptyResult, 'timeout_no_result');
    }

    function scheduleSettleFlush(reason) {
      if (activeProblemId == null || !windowActive) return;
      clearSettleTimer();
      const expectedWindowId = activeWindowId;
      settleTimerId = setTimeout(() => {
        settleTimerId = 0;
        if (!dispatchPendingResult(`voice_off_settle:${reason}`, expectedWindowId)) {
          if (typeof deps.emitEvent === 'function') {
            deps.emitEvent('stt_result_settle_waiting', {
              segment_id: segmentId,
              window_id: expectedWindowId,
              reason
            });
          }
        }
      }, RESULT_SETTLE_MS);
    }

    function armWindowTimeout() {
      if (activeProblemId == null || !windowActive) return;
      clearWindowTimeoutTimer();
      const expectedWindowId = activeWindowId;
      windowTimeoutTimerId = setTimeout(() => {
        windowTimeoutTimerId = 0;
        dispatchTimeoutFallback(expectedWindowId);
      }, WINDOW_TIMEOUT_MS);
    }

    function waitForRecorderStop(targetRecorder) {
      return new Promise((resolve) => {
        if (!targetRecorder || targetRecorder.state === 'inactive') {
          resolve();
          return;
        }
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        targetRecorder.addEventListener('stop', finish, { once: true });
        setTimeout(finish, 600);
        try {
          targetRecorder.stop();
        } catch {
          finish();
        }
      });
    }

    function attachRecorderHandlers(nextRecorder) {
      nextRecorder.onstart = () => {
        deps.logLine('REC', 'onstart');
        deps.logLine('REC', 'onaudiostart');
        deps.onAudioStart();
      };

      nextRecorder.onerror = (event) => {
        const msg = event && event.error && event.error.message ? event.error.message : 'unknown recorder error';
        deps.logLine('STT_ERR', `Whisper recorder error: ${msg}`);
      };

      nextRecorder.ondataavailable = (event) => {
        enqueueChunk(event.data);
      };

      nextRecorder.onstop = () => {
        deps.logLine('REC', 'onaudioend');
        deps.logLine('REC', 'onend');
      };
    }

    function createRecorderInstance() {
      const nextRecorder = recorderMimeType
        ? new MediaRecorder(stream, { mimeType: recorderMimeType })
        : new MediaRecorder(stream);
      attachRecorderHandlers(nextRecorder);
      return nextRecorder;
    }

    async function restartRecorderForWindow() {
      if (!started || !stream) return;
      if (restartingRecorder) return;
      restartingRecorder = true;
      acceptingChunks = false;

      const oldRecorder = recorder;
      await waitForRecorderStop(oldRecorder);
      if (oldRecorder === recorder) {
        recorder = null;
      }

      if (!started || !stream) {
        restartingRecorder = false;
        return;
      }

      try {
        recorder = createRecorderInstance();
        recorder.start(timesliceMs);
        acceptingChunks = windowActive;
      } catch (err) {
        deps.logLine('STT_ERR', `Whisper recorder restart failed: ${err && err.message ? err.message : String(err)}`);
      } finally {
        restartingRecorder = false;
      }
    }

    function closeProblemWindow(reason, extra = {}, expectedWindowId = null) {
      if (!windowActive) return;
      if (expectedWindowId != null && expectedWindowId !== activeWindowId) return;
      windowActive = false;
      acceptingChunks = false;
      resetWindowResultState();
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_problem_window_close', {
          problem_id: activeProblemId,
          segment_id: segmentId,
          window_id: activeWindowId,
          reason,
          ...extra
        });
      }
    }

    function openProblemWindow(problemId, reason) {
      closeProblemWindow('replaced_by_next_problem');
      activeWindowId += 1;
      startNewSegment(problemId, reason);
      windowActive = true;
      acceptingChunks = false;
      voiceIsOn = false;
      resetWindowResultState();
      armWindowTimeout();
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_problem_window_open', {
          problem_id: activeProblemId,
          segment_id: segmentId,
          window_id: activeWindowId,
          reason
        });
      }
      void restartRecorderForWindow();
    }

    function openInitialWindowForBegin(reason) {
      activeWindowId += 1;
      startNewSegment(null, reason);
      windowActive = true;
      acceptingChunks = true;
      voiceIsOn = false;
      resetWindowResultState();
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_problem_window_open', {
          problem_id: activeProblemId,
          segment_id: segmentId,
          window_id: activeWindowId,
          reason
        });
      }
    }

    async function processQueue() {
      if (processing) return;
      processing = true;

      while (started && queue.length > 0) {
        const item = queue.shift();
        const { blob, seq, mimeType, segmentId: itemSegmentId, context, windowId } = item;
        if (windowId !== activeWindowId || !windowActive) {
          if (typeof deps.emitEvent === 'function') {
            deps.emitEvent('stt_chunk_ignored_stale_window', {
              segment_id: itemSegmentId,
              chunk_id: seq,
              window_id: windowId,
              current_window_id: activeWindowId
            });
          }
          continue;
        }
        const uploadStart = Date.now();
        const form = new FormData();
        form.append('file', blob, `whisper-chunk-${seq}.webm`);
        form.append('session_id', String(context.session_id || ''));
        form.append('problem_id', String(context.problem_id ?? ''));
        form.append('segment_id', String(context.segment_id ?? itemSegmentId));
        form.append('chunk_id', String(context.chunk_id ?? seq));
        form.append('engine', String(context.engine || 'whisper'));
        form.append('client_ts_ms', String(context.client_ts_ms || Date.now()));

        if (typeof deps.emitEvent === 'function') {
          deps.emitEvent('stt_chunk_upload_start', {
            segment_id: itemSegmentId,
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
              segment_id: itemSegmentId,
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
              segment_id: itemSegmentId,
              chunk_id: seq,
              transcript_full: fullTranscript
            });
          }
          if (itemSegmentId !== segmentId) {
            if (typeof deps.emitEvent === 'function') {
              deps.emitEvent('stt_result_ignored_stale_segment', {
                segment_id: itemSegmentId,
                current_segment_id: segmentId,
                chunk_id: seq,
                transcript_full: fullTranscript
              });
            }
            continue;
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
              segment_id: itemSegmentId,
              chunk_id: seq,
              transcript_delta: transcript
            });
          }

          if (activeProblemId == null) {
            emitFinalToApp({
              index: seq,
              transcript,
              source_problem_id: context.problem_id,
              source_segment_id: itemSegmentId,
              source_chunk_id: seq
            }, 'begin_window_immediate');
            continue;
          }

          if (!windowActive || windowId !== activeWindowId) {
            if (typeof deps.emitEvent === 'function') {
              deps.emitEvent('stt_result_ignored_stale_window', {
                segment_id: itemSegmentId,
                chunk_id: seq,
                window_id: windowId,
                current_window_id: activeWindowId
              });
            }
            continue;
          }

          pendingFinalResult = {
            index: seq,
            transcript,
            source_problem_id: context.problem_id,
            source_segment_id: itemSegmentId,
            source_chunk_id: seq,
            windowId
          };
          if (typeof deps.emitEvent === 'function') {
            deps.emitEvent('stt_result_buffered', {
              segment_id: itemSegmentId,
              chunk_id: seq,
              window_id: windowId
            });
          }
          if (!voiceIsOn) {
            scheduleSettleFlush('buffered_while_voice_off');
          }
        } catch (err) {
          deps.logLine('STT_ERR', `Whisper request failed for chunk ${seq}: ${err && err.message ? err.message : String(err)}`);
        }
      }

      processing = false;
    }

    function enqueueChunk(blob) {
      if (!started || !windowActive || !acceptingChunks || !blob || blob.size === 0) return;
      const context = typeof deps.getEventContext === 'function'
        ? deps.getEventContext()
        : {};

      chunkSeq += 1;
      recordedChunks.push(blob);
      const mimeType = (recorder && recorder.mimeType) ? recorder.mimeType : recorderMimeType;
      const cumulativeBlob = new Blob(recordedChunks, {
        type: mimeType
      });
      queue.push({
        blob: cumulativeBlob,
        seq: chunkSeq,
        mimeType,
        segmentId,
        windowId: activeWindowId,
        context: {
          ...context,
          problem_id: activeProblemId,
          segment_id: segmentId,
          chunk_id: chunkSeq
        }
      });
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

      recorderMimeType = pickMimeType() || '';

      try {
        recorder = createRecorderInstance();
      } catch (err) {
        deps.logLine('STT_ERR', `Whisper MediaRecorder init failed: ${err && err.message ? err.message : String(err)}`);
        cleanupMedia();
        return;
      }

      clearState();
      started = true;
      recorder.start(timesliceMs);
      openInitialWindowForBegin('await_begin');
      deps.logLine('STT_INFO', `Whisper adapter active (endpoint=${endpoint}, chunk_ms=${timesliceMs}).`);
      if (typeof deps.emitEvent === 'function') {
        deps.emitEvent('stt_capture_start', {
          segment_id: segmentId,
          problem_id: activeProblemId,
          endpoint,
          chunk_ms: timesliceMs
        });
      }
    }

    function stop() {
      if (!started && !recorder && !stream) return;
      started = false;
      closeProblemWindow('capture_stop');

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

    function onNotify(eventName, payload) {
      if (!started) return;
      if (eventName === 'problem_changed') {
        const nextProblemId = normalizeProblemId(payload && payload.problem_id);
        openProblemWindow(nextProblemId, 'problem_changed_notify');
        return;
      }
      if (eventName === 'voice_boundary') {
        if (activeProblemId == null || !windowActive) return;
        const state = payload && payload.state;
        if (state === 'on') {
          voiceIsOn = true;
          clearSettleTimer();
        } else if (state === 'off') {
          voiceIsOn = false;
          scheduleSettleFlush('voice_off');
        }
      }
    }

    return {
      start,
      stop,
      reset,
      onNotify,
      isRecognizing: () => started
    };
  }

  window.createWhisperAdapter = createWhisperAdapter;
  window.getWhisperAdapterCapability = getWhisperCapability;
})();
