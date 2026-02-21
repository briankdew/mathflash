(() => {
  // -----------------------------
  // State
  // -----------------------------
  let sessionActive = false;
  let micOn = true;

  let sttAdapterManager = null;
  let lastFinalTranscript = '';
  let lastLogTimestamp = '';
  let logLineCount = 0;
  let eventSeq = 0;
  let currentSessionId = null;
  let currentProblemId = null;
  let testRunEnabled = false;
  let testRunId = null;
  let testRunSessionCount = 0;
  let currentSessionRunIndex = null;
  const structuredEventLog = [];
  const sessionEventLog = [];
  const TEST_RUN_LOG_ENDPOINT = '/api/logs/client-events';
  const LOGS_LIST_ENDPOINT = '/api/logs/sessions';
  const LOGS_FILE_ENDPOINT = '/api/logs/file';
  const LOGS_ANALYZE_ENDPOINT = '/api/logs/analyze';
  const LOGS_ARCHIVE_ENDPOINT = '/api/logs/archive';

  const urlParams = new URLSearchParams(window.location.search);
  const ENABLE_MIC_METER = urlParams.get('micmeter') !== '0';
  const MIC_METER_INTERVAL_MS = 50;
  const MIC_RMS_THRESHOLD = 0.02;
  const MIC_HANGOVER_MS = 250;
  const MIC_RMS_LOG_EVERY_MS = 50;
  const MIC_RMS_LOG_THRESHOLD = 0.005;

  const MODE_LEARN = 'learn';
  const MODE_EVAL = 'eval';
  const MODE_CHALLENGE = 'challenge';
  let mode = MODE_LEARN;
  let operation = 'add';
  let missingValue = 'result';
  let onErrorMode = 'new';

  const startEndBtn = document.getElementById('startEndBtn');
  const micToggleBtn = document.getElementById('micToggleBtn');
  const answerInput = document.getElementById('answerInput');
  const feed = document.getElementById('feed');
  const downloadLogBtn = document.getElementById('downloadLogBtn');
  const vaaLoadBtn = document.getElementById('vaaLoadBtn');
  const vaaProcessBtn = document.getElementById('vaaProcessBtn');
  const vaaPanel = document.getElementById('vaaPanel');
  const vaaTableBody = document.getElementById('vaaTableBody');
  const vaaViewPane = document.getElementById('vaaViewPane');
  const vaaStatus = document.getElementById('vaaStatus');
  const blinkDot = document.getElementById('blinkDot');
  const blinkRateInput = document.getElementById('blinkRateInput');
  const problemCounter = document.getElementById('problemCounter');
  const modeSelect = document.getElementById('modeSelect');
  const sttEngineSelect = document.getElementById('sttEngineSelect');
  const sttStatus = document.getElementById('sttStatus');
  const blinkToggleSelect = document.getElementById('blinkToggleSelect');
  const problemCountInput = document.getElementById('problemCountInput');
  const operationSelect = document.getElementById('operationSelect');
  const missingValueSelect = document.getElementById('missingValueSelect');
  const onErrorSelect = document.getElementById('onErrorSelect');
  const testRunToggle = document.getElementById('testRunToggle');
  const leftOperandValue = document.getElementById('leftOperandValue');
  const rightOperandValue = document.getElementById('rightOperandValue');
  const operatorBox = document.getElementById('operatorBox');
  const resultValue = document.getElementById('resultValue');
  const beginPrompt = document.getElementById('beginPrompt');
  const speechProcessing = window.SpeechProcessing;

  if (!speechProcessing) {
    throw new Error('speech-processing.js must be loaded before app-state-and-ui.js');
  }
  if (!window.createSttAdapterManager) {
    throw new Error('adapters/stt-adapter-manager.js must be loaded before app-state-and-ui.js');
  }
  if (!window.createVoskAdapter) {
    throw new Error('adapters/vosk.js must be loaded before app-state-and-ui.js');
  }
  if (!window.createWhisperAdapter) {
    throw new Error('adapters/whisper.js must be loaded before app-state-and-ui.js');
  }

  // -----------------------------
  // Utilities
  // -----------------------------
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildFacts() {
    const facts = [];
    for (let a = 1; a <= 9; a++) {
      for (let b = a; b <= 9; b++) {
        facts.push({ a, b, op: operation });
      }
    }
    return facts;
  }

  function getSttCapabilities() {
    const webSpeechSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const whisperCapability = (typeof window.getWhisperAdapterCapability === 'function')
      ? window.getWhisperAdapterCapability()
      : { available: false, reason: 'Whisper capability probe unavailable.' };
    return {
      webspeech: {
        label: 'Web Speech',
        available: webSpeechSupported,
        reason: webSpeechSupported
          ? 'Available in this browser.'
          : 'Web Speech SpeechRecognition API is unavailable in this browser.'
      },
      vosk: {
        label: 'Vosk',
        available: false,
        reason: 'Adapter scaffold exists, but runtime integration is not implemented yet.'
      },
      whisper: {
        label: 'Whisper',
        available: Boolean(whisperCapability.available),
        reason: whisperCapability.reason
      }
    };
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function makeRunId() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    return `run_${stamp}_${Math.random().toString(36).slice(2, 6)}`;
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

  function sanitizeToken(value, fallback = 'unk') {
    const token = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return token || fallback;
  }

  function toEngineToken(engine) {
    const e = sanitizeToken(engine, 'unknown');
    if (e === 'webspeech') return 'wbsp';
    if (e === 'whisper') return 'wspc';
    if (e === 'vosk') return 'vosk';
    if (e === 'unknown') return 'unkn';
    return 'unkn';
  }

  function toChunkToken(chunkMode) {
    const c = sanitizeToken(chunkMode, 'unknown');
    if (c === 'periodic' || c === 'fixed' || c === 'fxd') return 'fxd';
    if (c === 'utterance' || c === 'vad') return 'vad';
    if (c === 'unknown') return 'unk';
    return 'unk';
  }

  function pickDescriptor(values, mixedToken, unknownToken) {
    const set = new Set(values.filter(Boolean));
    if (!set.size) return unknownToken;
    if (set.size === 1) return [...set][0];
    return mixedToken;
  }

  function deriveSessionProblemCount(events) {
    const keys = new Set();
    for (const event of events) {
      if (event.event_type !== 'problem_shown') continue;
      const idx = event.problem_index;
      if (idx == null) continue;
      keys.add(String(idx));
    }
    return keys.size;
  }

  function deriveSessionSelectedProblemCount(events) {
    const sessionStart = events.find((e) => e.event_type === 'session_start') || {};
    const selected = parseInt(sessionStart.selected_problem_count, 10);
    if (Number.isFinite(selected) && selected > 0) return selected;
    return deriveSessionProblemCount(events);
  }

  function deriveSessionChunkToken(events) {
    const chunkTokens = events
      .filter((e) => e.event_type === 'stt_capture_start')
      .map((e) => toChunkToken(e.chunk_mode));
    return pickDescriptor(chunkTokens, 'mxd', 'unk');
  }

  function toSourceToken(source) {
    const s = sanitizeToken(source, 'unknown');
    if (s === 'voice' || s === 'mic' || s === 'microphone') return 'mic';
    if (s === 'rec' || s === 'recording' || s === 'file') return 'rec';
    return 'unk';
  }

  function deriveSessionSourceToken(events) {
    const sourceTokens = events
      .map((e) => e.source || e.audio_source || null)
      .filter((v) => v != null && String(v).trim() !== '')
      .map((v) => toSourceToken(v));
    return pickDescriptor(sourceTokens, 'mxd', 'unk');
  }

  function deriveSessionEngineToken(events) {
    const engineTokens = events.map((e) => toEngineToken(e.engine));
    return pickDescriptor(engineTokens, 'mixd', 'unkn');
  }

  function deriveSessionUid(sessionId) {
    const tail = String(sessionId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toLowerCase();
    if (tail.length === 4) return tail;
    return Math.random().toString(36).slice(2, 6);
  }

  function getCurrentEngineId() {
    if (sttAdapterManager) return sttAdapterManager.getCurrentAdapterId();
    if (sttEngineSelect && sttEngineSelect.value) return sttEngineSelect.value;
    return 'unknown';
  }

  function emitEvent(eventType, payload = {}) {
    const event = {
      ts_ms: Date.now(),
      ts_iso: new Date().toISOString(),
      event_seq: eventSeq,
      event_type: eventType,
      session_id: currentSessionId,
      problem_id: currentProblemId,
      segment_id: null,
      chunk_id: null,
      engine: getCurrentEngineId(),
      test_run: testRunEnabled,
      run_id: testRunEnabled ? testRunId : null,
      session_index_in_run: testRunEnabled ? currentSessionRunIndex : null,
      ...payload
    };
    eventSeq += 1;
    structuredEventLog.push(event);
    sessionEventLog.push(event);
  }

  function getAdapterEventContext(overrides = {}) {
    return {
      session_id: currentSessionId,
      problem_id: currentProblemId,
      segment_id: null,
      chunk_id: null,
      engine: getCurrentEngineId(),
      client_ts_ms: Date.now(),
      test_run: testRunEnabled,
      run_id: testRunEnabled ? testRunId : null,
      session_index_in_run: testRunEnabled ? currentSessionRunIndex : null,
      ...overrides
    };
  }

  function postSessionEventsToTestRunLog() {
    if (!testRunEnabled || !testRunId || !sessionEventLog.length) return;
    const events = sessionEventLog.slice();
    const runId = testRunId;
    const sessionId = currentSessionId;
    const sessionIndex = currentSessionRunIndex;
    void fetch(TEST_RUN_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_run: true,
        run_id: runId,
        session_id: sessionId,
        session_index_in_run: sessionIndex,
        events
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          let body = '';
          try {
            body = await res.text();
          } catch {
            body = '';
          }
          throw new Error(`HTTP ${res.status}${body ? ` ${body}` : ''}`);
        }
        return res.json().catch(() => ({}));
      })
      .then((body) => {
        const file = body?.file ? ` -> ${body.file}` : '';
        logLine('TEST_RUN', `Session events appended (${events.length})${file}`);
      })
      .catch((err) => {
        logLine('TEST_RUN', `Failed to append session events: ${err && err.message ? err.message : String(err)}`);
      });
  }

  function notifySttAdapter(eventName, payload = {}) {
    if (!sttAdapterManager) return;
    if (typeof sttAdapterManager.notify === 'function') {
      sttAdapterManager.notify(eventName, payload);
    }
  }

  let factQueue = [];
  let factIndex = 0;
  let spaceCount = 0;
  let answeredCount = 0;
  let blinkTimerId = 0;
  let blinkHideTimerId = 0;
  let learnBlinkTimerId = 0;
  let blinkOn = false;
  let currentAnswer = null;
  let currentFact = null;
  let interimDuplicateValue = null;
  let skippedCount = 0;
  let spacebarMarkCount = 0;
  let spacebarMarkArmed = false;
  let awaitingSubmission = false;
  let hasRenderedFirstProblem = false;
  let operandFadeTimerId = 0;
  let waitingForBegin = false;
  let currentProblemStartMs = 0;
  let voiceOnMs = 0;
  let voiceTimingLogged = false;
  let pendingTProcess = null;
  let pendingTSpeak = null;
  let micStream = null;
  let audioCtx = null;
  let analyser = null;
  let meterTimerId = 0;
  let voiceActive = false;
  let lastVoiceTs = 0;
  let lastRmsLogTs = 0;
  let micMeterErrorLogged = false;
  let vaaFiles = [];
  const vaaSelection = new Map();
  let vaaStatusTimer = null;

  function resetFacts() {
    factQueue = shuffle(buildFacts());
    factIndex = 0;
  }

  function applyMissingDisplay() {
    if (!currentFact) return;
    if (!leftOperandValue || !rightOperandValue || !resultValue) return;

    const hideOperands = (missingValue === 'operands') && sessionActive;
    const hideResult = (missingValue === 'result') && sessionActive;

    leftOperandValue.textContent = hideOperands ? '' : String(currentFact.left);
    rightOperandValue.textContent = hideOperands ? '' : String(currentFact.right);
    resultValue.textContent = hideResult ? '' : String(currentFact.answer);
  }

  function showNextFact() {
    if (waitingForBegin) return false;
    if (!leftOperandValue || !rightOperandValue || !operatorBox || !resultValue || !sessionActive) return false;
    if (awaitingSubmission) return false;
    if (factQueue.length === 0 || factIndex >= factQueue.length) resetFacts();

    const fact = factQueue[factIndex++];
    const swap = Math.random() < 0.5;
    const left = swap ? fact.b : fact.a;
    const right = swap ? fact.a : fact.b;
    currentAnswer = (fact.op === 'add') ? (fact.a + fact.b) : (fact.a * fact.b);
    currentFact = { left, right, answer: currentAnswer };
    interimDuplicateValue = null;
    if (operandFadeTimerId) {
      clearTimeout(operandFadeTimerId);
      operandFadeTimerId = 0;
    }
    if (!hasRenderedFirstProblem) {
      applyMissingDisplay();
      hasRenderedFirstProblem = true;
    } else {
      leftOperandValue.classList.add('operand-blink-off');
      rightOperandValue.classList.add('operand-blink-off');
      operandFadeTimerId = setTimeout(() => {
        applyMissingDisplay();
        leftOperandValue.classList.remove('operand-blink-off');
        rightOperandValue.classList.remove('operand-blink-off');
        operandFadeTimerId = 0;
      }, 40);
    }
    lastFinalTranscript = '';
    awaitingSubmission = true;
    currentProblemStartMs = Date.now();
    voiceOnMs = 0;
    voiceTimingLogged = false;
    pendingTProcess = null;
    pendingTSpeak = null;
    if (mode === MODE_LEARN && blinkToggleSelect?.value === 'on') {
      scheduleLearnBlink(parseFloat(blinkRateInput?.value) || 1.0);
    }
    return true;
  }

  function maybeEndSessionAfterSkip() {
    const totalProblems = parseInt(problemCountInput?.value, 10);
    if (Number.isFinite(totalProblems) && totalProblems > 0) {
      if (onErrorMode === 'skip' && (answeredCount + skippedCount) >= totalProblems) {
        logLine('AUTO-END', `Session ended after ${answeredCount} answered, ${skippedCount} skipped`);
        setTimeout(() => endSession(), 0);
        return true;
      }
    }
    return false;
  }

  function handleSkipAdvance(restartRecognition) {
    voiceTimingLogged = true;
    currentProblemStartMs = 0;
    voiceOnMs = 0;
    pendingTProcess = null;
    pendingTSpeak = null;
    if (onErrorMode === 'skip') {
      skippedCount += 1;
      if (maybeEndSessionAfterSkip()) return;
    }
    if (restartRecognition && sessionActive && micOn) {
      setTimeout(() => startRecognition(), 0);
    }
    setTimeout(() => advanceProblem(false), 250);
  }

  function advanceProblem(logAuto) {
    if (!showNextFact()) return false;
    spaceCount += 1;
    if (problemCounter) problemCounter.textContent = String(spaceCount);
    const logIndex = spaceCount - 1;
    currentProblemId = logIndex;
    emitEvent('problem_shown', {
      problem_index: logIndex,
      operation,
      left: currentFact ? currentFact.left : null,
      right: currentFact ? currentFact.right : null,
      expected_answer: currentFact ? currentFact.answer : null,
      auto_advanced: Boolean(logAuto)
    });
    notifySttAdapter('problem_changed', {
      problem_id: currentProblemId,
      problem_index: logIndex
    });
    if (logAuto) {
      logLine('AUTO-NEXT', `Problem ${logIndex} (Ans: ${currentAnswer})`);
    } else if (mode === MODE_LEARN && currentFact) {
      const opSymbol = (operation === 'add') ? '+' : '×';
      logLine('CURR_PROB', `Problem ${logIndex} (${currentFact.left} ${opSymbol} ${currentFact.right} = ${currentFact.answer})`);
    }
    spacebarMarkArmed = true;
    return true;
  }

  function startBlinkTimer(seconds) {
    if (!blinkDot) return;
    if (blinkTimerId) clearInterval(blinkTimerId);
    if (blinkHideTimerId) clearTimeout(blinkHideTimerId);
    blinkOn = false;
    blinkDot.style.opacity = '0';

    const ms = Math.max(100, Math.min(5000, Math.round(seconds * 1000)));
    const show = () => {
      blinkOn = true;
      blinkDot.style.opacity = '1';
      if (sessionActive && mode === MODE_EVAL) {
        advanceProblem(true);
      }
      if (blinkHideTimerId) clearTimeout(blinkHideTimerId);
      blinkHideTimerId = setTimeout(() => {
        blinkOn = false;
        blinkDot.style.opacity = '0';
      }, 500);
    };

    show();
    blinkTimerId = setInterval(show, ms);
  }

  function scheduleLearnBlink(seconds) {
    if (!blinkDot) return;
    if (learnBlinkTimerId) clearTimeout(learnBlinkTimerId);
    if (blinkHideTimerId) clearTimeout(blinkHideTimerId);
    blinkDot.style.opacity = '0';
    const ms = Math.max(100, Math.min(5000, Math.round(seconds * 1000)));
    learnBlinkTimerId = setTimeout(() => {
      blinkDot.style.opacity = '1';
      if (blinkHideTimerId) clearTimeout(blinkHideTimerId);
      blinkHideTimerId = setTimeout(() => {
        blinkDot.style.opacity = '0';
      }, 500);
      learnBlinkTimerId = 0;
    }, ms);
  }

  function stopBlinkTimer() {
    if (blinkTimerId) clearInterval(blinkTimerId);
    if (blinkHideTimerId) clearTimeout(blinkHideTimerId);
    if (learnBlinkTimerId) clearTimeout(learnBlinkTimerId);
    blinkTimerId = 0;
    blinkHideTimerId = 0;
    learnBlinkTimerId = 0;
    blinkOn = false;
    if (blinkDot) blinkDot.style.opacity = '0';
  }

  function ts() {
    const d = new Date();
    return d.toLocaleTimeString(undefined, { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function logLine(kind, text) {
    lastLogTimestamp = ts();
    const lineNo = String(logLineCount).padStart(3, '0');
    feed.textContent += `${lineNo} [${lastLogTimestamp}] ${kind}: ${text}\n`;
    logLineCount += 1;
    feed.scrollTop = feed.scrollHeight;
  }

  function setAnswerBoxEnabled(enabled) {
    answerInput.disabled = !enabled;
    if (enabled) answerInput.focus();
    if (!enabled) answerInput.value = '';
  }

  function setTypedModeUI() {
    micToggleBtn.textContent = micOn ? 'Speak' : 'Type';
    micToggleBtn.setAttribute('aria-pressed', String(micOn));

    if (micOn) {
      micToggleBtn.style.borderColor = '#c33';
      // When Mic On, typed input is not allowed:
      answerInput.readOnly = true;
    } else {
      micToggleBtn.style.borderColor = '#2b7';
      answerInput.readOnly = false;
    }
  }

  async function startMicMeter() {
    if (!ENABLE_MIC_METER) return;
    if (meterTimerId || audioCtx || micStream) return;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      voiceActive = false;
      lastVoiceTs = 0;
      lastRmsLogTs = 0;
      micMeterErrorLogged = false;
      logLine('MIC_METER', `start (threshold=${MIC_RMS_THRESHOLD} hangover_ms=${MIC_HANGOVER_MS} interval_ms=${MIC_METER_INTERVAL_MS})`);
      emitEvent('mic_meter_start', {
        threshold: MIC_RMS_THRESHOLD,
        hangover_ms: MIC_HANGOVER_MS,
        interval_ms: MIC_METER_INTERVAL_MS
      });
      meterTimerId = setInterval(() => {
        try {
          if (!analyser) return;
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const v = buffer[i];
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buffer.length);
          const now = Date.now();
          if (rms >= MIC_RMS_THRESHOLD) {
            lastVoiceTs = now;
            if (!voiceActive) {
              voiceActive = true;
              logLine('MIC_VOICE', `on rms=${rms.toFixed(3)}`);
              emitEvent('mic_voice_on', { rms });
              notifySttAdapter('voice_boundary', { state: 'on', rms, ts_ms: now });
              if (!voiceTimingLogged && currentProblemStartMs) {
                voiceOnMs = now;
                const tProcess = (voiceOnMs - currentProblemStartMs) / 1000;
                const logIndex = spaceCount - 1;
                pendingTProcess = `Problem ${logIndex} (${tProcess.toFixed(3)}s)`;
              }
            }
          } else if (voiceActive && (now - lastVoiceTs) > MIC_HANGOVER_MS) {
            voiceActive = false;
            logLine('MIC_VOICE', `off rms=${rms.toFixed(3)}`);
            emitEvent('mic_voice_off', { rms });
            notifySttAdapter('voice_boundary', { state: 'off', rms, ts_ms: now });
            if (!voiceTimingLogged && currentProblemStartMs && voiceOnMs) {
              const tSpeak = (Math.max(0, now - MIC_HANGOVER_MS) - voiceOnMs) / 1000;
              const logIndex = spaceCount - 1;
              pendingTSpeak = `Problem ${logIndex} (${tSpeak.toFixed(3)}s)`;
              voiceTimingLogged = true;
            }
          }
          if (rms > MIC_RMS_LOG_THRESHOLD && (now - lastRmsLogTs) >= MIC_RMS_LOG_EVERY_MS) {
            lastRmsLogTs = now;
            logLine('MIC_RMS', `rms=${rms.toFixed(3)} voiceActive=${voiceActive}`);
          }
        } catch (err) {
          if (!micMeterErrorLogged) {
            micMeterErrorLogged = true;
            logLine('MIC_METER', `error ${err && err.message ? err.message : String(err)}`);
          }
        }
      }, MIC_METER_INTERVAL_MS);
    } catch (err) {
      logLine('MIC_METER', `gum_error name=${err && err.name ? err.name : 'unknown'} message=${err && err.message ? err.message : ''}`);
      emitEvent('mic_meter_error', {
        error_name: err && err.name ? err.name : 'unknown',
        error_message: err && err.message ? err.message : ''
      });
      await stopMicMeter();
    }
  }

  async function stopMicMeter() {
    if (meterTimerId) {
      clearInterval(meterTimerId);
      meterTimerId = 0;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (audioCtx) {
      try {
        await audioCtx.close();
      } catch {
        // ignore close errors
      }
      audioCtx = null;
    }
    analyser = null;
    voiceActive = false;
    lastVoiceTs = 0;
    lastRmsLogTs = 0;
    micMeterErrorLogged = false;
    if (ENABLE_MIC_METER) {
      logLine('MIC_METER', 'stop');
      emitEvent('mic_meter_stop');
    }
  }

  function detectPlatformInfo() {
    let browser = 'Unknown';
    let os = 'Unknown';
    if (navigator.userAgentData) {
      const brands = navigator.userAgentData.brands || [];
      const brandNames = brands.map((b) => b.brand);
      if (brandNames.some((b) => /Microsoft Edge/i.test(b))) browser = 'Edge';
      else if (brandNames.some((b) => /Google Chrome/i.test(b))) browser = 'Chrome';
      else if (brandNames.some((b) => /Chromium/i.test(b))) browser = 'Chrome';
      const plat = navigator.userAgentData.platform || '';
      if (/Windows/i.test(plat)) os = 'Windows';
      else if (/Mac/i.test(plat)) os = 'macOS';
      else if (/Linux/i.test(plat)) os = 'Linux';
      else if (/Android/i.test(plat)) os = 'Android';
      else if (/iOS/i.test(plat)) os = 'iOS';
      else if (/CrOS|Chrome OS/i.test(plat)) os = 'ChromeOS';
    } else {
      const ua = navigator.userAgent || '';
      if (/\bEdgiOS\b/.test(ua)) browser = 'Edge';
      else if (/\bCriOS\b/.test(ua)) browser = 'Chrome';
      else if (/\bFxiOS\b/.test(ua)) browser = 'Firefox';
      else if ((/iPhone|iPad/i.test(ua)) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) browser = 'Safari';
      else if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) browser = 'Safari';
      else if (/Edg/i.test(ua)) browser = 'Edge';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';
      else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
      if (/iPhone|iPad/i.test(ua)) os = 'iOS';
      else if (/Windows NT/i.test(ua)) os = 'Windows';
      else if (/Mac OS X/i.test(ua)) os = 'macOS';
      else if (/Android/i.test(ua)) os = 'Android';
      else if (/CrOS/i.test(ua)) os = 'ChromeOS';
      else if (/Linux/i.test(ua)) os = 'Linux';
    }
    return { browser, os };
  }

  function submitDigit(digit) {
    if (!sessionActive) return;

    // Replace value (never append)
    answerInput.value = digit;

    if (pendingTProcess) {
      logLine('T_PROCESS', pendingTProcess);
      pendingTProcess = null;
    }
    if (pendingTSpeak) {
      logLine('T_SPEAK', pendingTSpeak);
      pendingTSpeak = null;
    }
    // Auto-submit immediately
    const logIndex = spaceCount - 1;
    logLine('SUBMIT', `Problem ${logIndex} (${digit})`);
    emitEvent('answer_submitted', {
      problem_index: logIndex,
      submitted_value: String(digit)
    });
    awaitingSubmission = false;
    answeredCount += 1;

    const totalProblems = parseInt(problemCountInput?.value, 10);
    if (Number.isFinite(totalProblems) && totalProblems > 0 && answeredCount >= totalProblems) {
      logLine('AUTO-END', `Session ended after ${answeredCount} answered, ${skippedCount} skipped`);
      setTimeout(() => endSession(), 0);
      // Clear quickly so you can see if duplicates happen later
      answerInput.value = '';
      if (!micOn) answerInput.focus();
      return;
    }

    if (mode === MODE_LEARN) {
      advanceProblem(false);
    }

    // Clear quickly so you can see if duplicates happen later
    answerInput.value = '';
    if (!micOn) answerInput.focus();
  }

  function skipProblemFromRecognition(reasonText, abortAndReset) {
    const logIndex = spaceCount - 1;
    logLine('PROB_SKIP', `Problem ${logIndex} (${reasonText})`);
    emitEvent('problem_skipped', {
      problem_index: logIndex,
      reason: reasonText
    });
    abortAndReset();
    logLine('REC_RESET', 'after PROB_SKIP');
    awaitingSubmission = false;
    handleSkipAdvance(true);
  }

  function handleRecognitionAudioStart() {
    if (
      sessionActive &&
      !waitingForBegin &&
      mode === MODE_LEARN &&
      !awaitingSubmission &&
      !leftOperandValue.textContent
    ) {
      advanceProblem(false);
    }
  }

  function handleRecognitionInterimResult({ transcript }) {
    emitEvent('stt_interim_result', {
      transcript_raw: String(transcript || '')
    });
    const interimCheck = speechProcessing.detectDuplicateOrMixedTokens(transcript);
    if (interimCheck?.type === 'duplicate') {
      interimDuplicateValue = interimCheck.value;
    }
  }

  function handleRecognitionFinalResult({
    transcript,
    abortAndReset,
    source_problem_id = null,
    source_segment_id = null,
    source_chunk_id = null
  }) {
    const cleaned = transcript.trim().toLowerCase();
    if (
      source_problem_id != null &&
      currentProblemId != null &&
      String(source_problem_id) !== String(currentProblemId)
    ) {
      emitEvent('stt_final_ignored_stale', {
        transcript_raw: String(transcript || ''),
        source_problem_id,
        source_segment_id,
        source_chunk_id
      });
      return;
    }
    emitEvent('stt_final_result', {
      transcript_raw: String(transcript || ''),
      transcript_cleaned: cleaned,
      source_problem_id,
      source_segment_id,
      source_chunk_id
    });

    if (
      interimDuplicateValue != null &&
      /^\d+$/.test(cleaned) &&
      cleaned.length > 1 &&
      cleaned.split('').every((ch) => ch === cleaned[0]) &&
      parseInt(cleaned[0], 10) === interimDuplicateValue &&
      awaitingSubmission
    ) {
      const stitched = speechProcessing.stitchTokenDigits(cleaned);
      if (stitched != null) {
        const logIndex = spaceCount - 1;
        logLine('FLAGGED', `Problem ${logIndex} (Stitched="${stitched}" from "${cleaned}")`);
        submitDigit(stitched);
      }
      return;
    }

    if (cleaned === '' && awaitingSubmission) {
      skipProblemFromRecognition('Empty final=true detected', abortAndReset);
      return;
    }

    if (awaitingSubmission && /[:/]/.test(cleaned)) {
      skipProblemFromRecognition('Non-numeric symbol detected', abortAndReset);
      return;
    }

    const tokenCheck = speechProcessing.detectDuplicateOrMixedTokens(cleaned);
    if (tokenCheck?.type === 'mixed' && awaitingSubmission) {
      const stitched = speechProcessing.stitchTokenDigits(cleaned);
      if (stitched != null) {
        const logIndex = spaceCount - 1;
        logLine('FLAGGED', `Problem ${logIndex} (Stitched="${stitched}" from "${cleaned}")`);
        submitDigit(stitched);
      }
      return;
    }

    if (tokenCheck?.type === 'duplicate') {
      submitDigit(String(tokenCheck.value));
      return;
    }

    if (cleaned && cleaned === lastFinalTranscript) return;
    lastFinalTranscript = cleaned;

    if (waitingForBegin && /\bbegin\b/.test(cleaned)) {
      waitingForBegin = false;
      if (beginPrompt) beginPrompt.classList.add('is-hidden');
      logLine('BEGIN', 'Begin detected');
      advanceProblem(false);
      return;
    }

    if (!awaitingSubmission) {
      emitEvent('stt_final_ignored_no_active_problem', {
        transcript_raw: String(transcript || ''),
        source_problem_id,
        source_segment_id,
        source_chunk_id
      });
      return;
    }

    let val = null;
    if (getCurrentEngineId() === 'whisper') {
      const whisperParseInput = cleaned.replace(/\bbegin\b/g, ' ').replace(/\s+/g, ' ').trim();
      const candidates = speechProcessing.extractNumberCandidates(whisperParseInput);
      if (candidates.length > 0) {
        val = candidates[candidates.length - 1];
      }
      emitEvent('stt_number_candidates', {
        transcript_parse_input: whisperParseInput,
        number_candidates: candidates,
        selected_value: val
      });
    } else {
      val = speechProcessing.normalizeToNumber(transcript);
    }

    if (val != null) {
      const expectedVal = (currentAnswer == null) ? null : String(currentAnswer);
      if (
        getCurrentEngineId() === 'whisper' &&
        expectedVal != null &&
        ((expectedVal === '15' && val === '50') || (expectedVal === '16' && val === '60'))
      ) {
        emitEvent('stt_suspected_teens_tens_confusion', {
          expected_value: expectedVal,
          recognized_value: val,
          transcript_cleaned: cleaned
        });
      }
      submitDigit(val);
    }
  }

  // -----------------------------
  // Speech Recognition Setup
  // -----------------------------
  function ensureSttAdapterManager() {
    if (sttAdapterManager) return sttAdapterManager;
    if (!window.createWebSpeechAdapter) {
      throw new Error('adapters/webspeech.js must be loaded before app-state-and-ui.js');
    }

    const adapterDeps = {
      logLine,
      emitEvent,
      getEventContext: getAdapterEventContext,
      getSessionActive: () => sessionActive,
      getMicOn: () => micOn,
      onAudioStart: handleRecognitionAudioStart,
      onInterimResult: handleRecognitionInterimResult,
      onFinalResult: handleRecognitionFinalResult
    };

    sttAdapterManager = window.createSttAdapterManager({
      factories: {
        webspeech: () => window.createWebSpeechAdapter(adapterDeps),
        vosk: () => window.createVoskAdapter(adapterDeps),
        whisper: () => window.createWhisperAdapter(adapterDeps)
      },
      defaultAdapterId: 'whisper',
      logLine
    });

    return sttAdapterManager;
  }

  function startRecognition() {
    ensureSttAdapterManager().start();
  }

  function stopRecognition() {
    if (!sttAdapterManager) return;
    sttAdapterManager.stop();
  }

  function setVaaStatus(text, options = {}) {
    if (!vaaStatus) return;
    const message = String(text || '');
    const type = options.type === 'warning' ? 'warning' : 'info';
    const duration = options.duration === 'persistent' ? 'persistent' : 'temporary';

    if (vaaStatusTimer) {
      clearTimeout(vaaStatusTimer);
      vaaStatusTimer = null;
    }

    vaaStatus.classList.remove('is-warning', 'is-info', 'is-fading');
    vaaStatus.classList.add(type === 'warning' ? 'is-warning' : 'is-info');
    vaaStatus.textContent = message;

    if (!message || duration === 'persistent') return;

    vaaStatusTimer = setTimeout(() => {
      vaaStatus.classList.add('is-fading');
      window.setTimeout(() => {
        if (!vaaStatus.classList.contains('is-fading')) return;
        vaaStatus.textContent = '';
        vaaStatus.classList.remove('is-fading', 'is-warning', 'is-info');
      }, 280);
    }, 10000);
  }

  function getVaaSelection(filename) {
    if (!vaaSelection.has(filename)) {
      vaaSelection.set(filename, { view: false, analyze: false, archive: false });
    }
    return vaaSelection.get(filename);
  }

  function makeSafeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getVaaScopeRank(scopeKey) {
    const key = String(scopeKey || '').toLowerCase();
    if (key === 'ses' || key === 'run') return 0;
    if (key === 'bat') return 1;
    if (key === 'svr') return 2;
    return 9;
  }

  function getVaaScopeLabel(scopeKey) {
    const key = String(scopeKey || '').toLowerCase();
    if (key === 'ses') return 'SES';
    if (key === 'run') return 'RUN';
    if (key === 'bat') return 'BAT';
    if (key === 'svr') return 'SVR';
    return String(scopeKey || '').toUpperCase();
  }

  function sortVaaFiles(files) {
    return [...files].sort((a, b) => {
      const scopeDiff = getVaaScopeRank(a.scope_key) - getVaaScopeRank(b.scope_key);
      if (scopeDiff !== 0) return scopeDiff;
      const aTs = Number(a.modified_ts_ms || 0);
      const bTs = Number(b.modified_ts_ms || 0);
      if (aTs !== bTs) return bTs - aTs;
      return String(a.filename || '').localeCompare(String(b.filename || ''));
    });
  }

  async function loadVaaFiles() {
    try {
      setVaaStatus('Loading files...', { type: 'info', duration: 'temporary' });
      const res = await fetch(LOGS_LIST_ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      vaaFiles = sortVaaFiles(Array.isArray(body.files) ? body.files : []);
      const keep = new Set(vaaFiles.map((f) => f.filename));
      for (const key of [...vaaSelection.keys()]) {
        if (!keep.has(key)) vaaSelection.delete(key);
      }
      renderVaaTable();
      await refreshVaaViewPane();
      setVaaStatus(`Loaded ${vaaFiles.length} file(s).`, { type: 'info', duration: 'temporary' });
    } catch (err) {
      setVaaStatus(`Load failed: ${err && err.message ? err.message : String(err)}`, { type: 'warning', duration: 'temporary' });
    }
  }

  function renderVaaTable() {
    if (!vaaTableBody) return;
    if (!vaaFiles.length) {
      vaaTableBody.innerHTML = '<tr><td colspan="7">No files found.</td></tr>';
      return;
    }
    vaaTableBody.innerHTML = vaaFiles.map((file, idx) => {
      const s = getVaaSelection(file.filename);
      const canAnalyze = Boolean(file.analyze_allowed);
      const arrow = (s.analyze && s.archive) ? '<span class="vaa-chain-indicator" title="Analyze then Archive">&#9654;</span>' : '';
      const rowClasses = [
        s.analyze ? 'vaa-row-analyze' : '',
        s.archive ? 'vaa-row-archive' : ''
      ].filter(Boolean).join(' ');
      return `
        <tr data-idx="${idx}" class="${rowClasses}">
          <td><input type="checkbox" class="vaa-view" ${s.view ? 'checked' : ''}></td>
          <td>${makeSafeHtml(file.filename)}</td>
          <td>${makeSafeHtml(getVaaScopeLabel(file.scope_key || file.scope))}</td>
          <td>${makeSafeHtml(file.scope_date_time)}</td>
          <td>${makeSafeHtml(file.file_type)}</td>
          <td>
            <span class="vaa-analyze-archive-cell">
              <input type="checkbox" class="vaa-analyze" ${s.analyze ? 'checked' : ''} ${canAnalyze ? '' : 'disabled'}>
              ${arrow}
            </span>
          </td>
          <td><input type="checkbox" class="vaa-archive" ${s.archive ? 'checked' : ''}></td>
        </tr>
      `;
    }).join('');
  }

  async function refreshVaaViewPane() {
    if (!vaaViewPane) return;
    const selected = vaaFiles
      .filter((f) => getVaaSelection(f.filename).view)
      .map((f) => f.filename);
    if (!selected.length) {
      vaaViewPane.textContent = 'No files selected to view.';
      return;
    }

    vaaViewPane.textContent = 'Loading selected file(s)...';
    const blocks = [];
    for (const filename of selected) {
      try {
        const res = await fetch(`${LOGS_FILE_ENDPOINT}?name=${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const text = String(body.text || '').trim();
        blocks.push(`===== ${filename} =====\n${text || '[empty]'}`);
      } catch (err) {
        blocks.push(`===== ${filename} =====\n[load failed] ${err && err.message ? err.message : String(err)}`);
      }
    }
    vaaViewPane.textContent = blocks.join('\n\n');
  }

  async function processVaaSelection() {
    const analyzeTargets = [];
    const archiveTargets = [];
    let blockedArchiveWhileView = 0;
    for (const file of vaaFiles) {
      const s = getVaaSelection(file.filename);
      if (s.analyze && file.analyze_allowed) analyzeTargets.push(file.filename);
      if (s.archive) {
        if (s.view) {
          blockedArchiveWhileView += 1;
        } else {
          archiveTargets.push(file.filename);
        }
      }
    }
    if (!analyzeTargets.length && !archiveTargets.length) {
      setVaaStatus('No Analyze/Archive selections to process.', { type: 'warning', duration: 'temporary' });
      return;
    }
    if (archiveTargets.length) {
      const ok = window.confirm(`Archive ${archiveTargets.length} selected file(s)?`);
      if (!ok) {
        setVaaStatus('Archive canceled.', { type: 'info', duration: 'temporary' });
        return;
      }
    }

    const newlyGenerated = [];
    try {
      setVaaStatus('Processing selections...', { type: 'info', duration: 'temporary' });
      if (analyzeTargets.length) {
        const resAnalyze = await fetch(LOGS_ANALYZE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: analyzeTargets })
        });
        const bodyAnalyze = await resAnalyze.json().catch(() => ({}));
        if (!resAnalyze.ok) throw new Error(bodyAnalyze.error || `Analyze failed (HTTP ${resAnalyze.status})`);
        if (Array.isArray(bodyAnalyze.output_files)) {
          newlyGenerated.push(...bodyAnalyze.output_files);
        }
      }

      if (archiveTargets.length) {
        const resArchive = await fetch(LOGS_ARCHIVE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: archiveTargets })
        });
        const bodyArchive = await resArchive.json().catch(() => ({}));
        if (!resArchive.ok) throw new Error(bodyArchive.error || `Archive failed (HTTP ${resArchive.status})`);
      }

      for (const sel of vaaSelection.values()) {
        sel.analyze = false;
        sel.archive = false;
      }

      await loadVaaFiles();
      for (const filename of newlyGenerated) {
        const sel = getVaaSelection(filename);
        sel.view = true;
      }
      renderVaaTable();
      await refreshVaaViewPane();
      const blockedNote = blockedArchiveWhileView > 0 ? ` blocked_archive_view=${blockedArchiveWhileView}` : '';
      setVaaStatus(`Items processed: Analyze=${analyzeTargets.length}, Archive=${archiveTargets.length}${blockedNote ? ` (${blockedNote.trim()})` : ''}`, { type: 'info', duration: 'temporary' });
      logLine('VAA', `Process complete (analyze=${analyzeTargets.length}, archive=${archiveTargets.length}${blockedNote})`);
    } catch (err) {
      setVaaStatus(`Process failed: ${err && err.message ? err.message : String(err)}`, { type: 'warning', duration: 'temporary' });
    }
  }

  function bindVaaEvents() {
    if (vaaLoadBtn) {
      vaaLoadBtn.addEventListener('click', async () => {
        vaaSelection.clear();
        await loadVaaFiles();
        await refreshVaaViewPane();
      });
    }
    if (vaaProcessBtn) {
      vaaProcessBtn.addEventListener('click', () => {
        void processVaaSelection();
      });
    }
    if (vaaTableBody) {
      vaaTableBody.addEventListener('change', (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLInputElement)) return;
        const row = target.closest('tr');
        if (!row) return;
        const idx = Number(row.getAttribute('data-idx'));
        const file = vaaFiles[idx];
        if (!file) return;
        const sel = getVaaSelection(file.filename);
        if (target.classList.contains('vaa-view')) {
          sel.view = target.checked;
          if (target.checked) {
            if (sel.archive) {
              sel.archive = false;
              setVaaStatus("'Archive' de-selected to view file. To archive, reselect after viewing.", { type: 'warning', duration: 'temporary' });
            }
          }
          void refreshVaaViewPane();
        } else if (target.classList.contains('vaa-analyze')) {
          sel.analyze = target.checked;
        } else if (target.classList.contains('vaa-archive')) {
          if (target.checked && sel.view) {
            target.checked = false;
            sel.archive = false;
            setVaaStatus("You must de-select 'View' before you can select 'Archive.'", { type: 'warning', duration: 'temporary' });
            renderVaaTable();
            return;
          }
          sel.archive = target.checked;
        }
        renderVaaTable();
      });
    }
  }

  // -----------------------------
  // UI Events
  // -----------------------------
  function startSession() {
    sessionActive = true;
    currentSessionId = makeId('sess');
    currentProblemId = null;
    if (testRunToggle) testRunToggle.disabled = true;
    if (testRunEnabled) {
      if (!testRunId) testRunId = makeRunId();
      testRunSessionCount += 1;
      currentSessionRunIndex = testRunSessionCount;
    } else {
      currentSessionRunIndex = null;
    }
    sessionEventLog.length = 0;
    startEndBtn.textContent = 'End';
    setAnswerBoxEnabled(true);
    feed.textContent = '';
    const equationRow = document.querySelector('.equation-row');
    if (equationRow) {
      const top = equationRow.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 5) });
    } else {
      window.scrollBy(0, -195);
    }
    logLineCount = 0;
    const env = detectPlatformInfo();
    const sourceLabel = micOn ? 'Voice' : 'Typed';
    const sttEngine = ensureSttAdapterManager().getCurrentAdapterId();
    const selectedProblemCount = parseInt(problemCountInput?.value, 10);
    logLine('ENV', `Browser=${env.browser} OS=${env.os} Source=${sourceLabel} STT=${sttEngine}`);
    emitEvent('session_start', {
      browser: env.browser,
      os: env.os,
      source: sourceLabel,
      selected_problem_count: (Number.isFinite(selectedProblemCount) && selectedProblemCount > 0)
        ? selectedProblemCount
        : null,
      mode,
      operation,
      missing_value: missingValue,
      on_error: onErrorMode,
      stt_engine: sttEngine
    });
    if (ENABLE_MIC_METER) startMicMeter();
    spaceCount = 0;
    answeredCount = 0;
    skippedCount = 0;
    spacebarMarkCount = 0;
    spacebarMarkArmed = false;
    hasRenderedFirstProblem = false;
    if (operandFadeTimerId) {
      clearTimeout(operandFadeTimerId);
      operandFadeTimerId = 0;
    }
    waitingForBegin = micOn;
    if (beginPrompt) beginPrompt.classList.toggle('is-hidden', !waitingForBegin);
    if (problemCounter) problemCounter.textContent = String(spaceCount);
    if (leftOperandValue) leftOperandValue.textContent = '';
    if (operatorBox) operatorBox.textContent = (operation === 'add') ? '+' : '×';
    if (rightOperandValue) rightOperandValue.textContent = '';
    if (resultValue) resultValue.textContent = '';
    currentAnswer = null;
    currentFact = null;
    awaitingSubmission = false;
    lastFinalTranscript = '';
    resetFacts();
    logLine('SESSION', 'Start (active)');
    if (testRunEnabled) {
      logLine('TEST_RUN', `ON run_id=${testRunId} session_index=${currentSessionRunIndex}`);
    }
    if (blinkToggleSelect?.value === 'on' && mode === MODE_EVAL) {
      startBlinkTimer(parseFloat(blinkRateInput?.value) || 1.0);
    }

    if (micOn) startRecognition();
  }

  function endSession() {
    sessionActive = false;
    startEndBtn.textContent = 'Start';
    if (testRunToggle) testRunToggle.disabled = false;
    setAnswerBoxEnabled(false);
    logLine('SESSION', 'End (idle)');
    stopBlinkTimer();
    if (ENABLE_MIC_METER) stopMicMeter();
    window.scrollTo({ top: 0 });
    if (operandFadeTimerId) {
      clearTimeout(operandFadeTimerId);
      operandFadeTimerId = 0;
    }
    if (leftOperandValue) leftOperandValue.classList.remove('operand-blink-off');
    if (rightOperandValue) rightOperandValue.classList.remove('operand-blink-off');
    waitingForBegin = false;
    if (beginPrompt) beginPrompt.classList.add('is-hidden');
    if (leftOperandValue) leftOperandValue.textContent = '';
    if (operatorBox) operatorBox.textContent = (operation === 'add') ? '+' : '×';
    if (rightOperandValue) rightOperandValue.textContent = '';
    if (resultValue) resultValue.textContent = '';
    currentAnswer = null;
    currentFact = null;
    awaitingSubmission = false;
    emitEvent('session_end', {
      answered_count: answeredCount,
      skipped_count: skippedCount
    });
    postSessionEventsToTestRunLog();
    currentSessionRunIndex = null;
    currentProblemId = null;

    stopRecognition();
  }

  startEndBtn.addEventListener('click', () => {
    if (sessionActive) endSession();
    else startSession();
  });

  micToggleBtn.addEventListener('click', () => {
    micOn = !micOn;
    setTypedModeUI();
    logLine('MIC', micOn ? 'On (voice-only)' : 'Off (typed-only)');
    emitEvent('mic_mode_changed', { mic_on: micOn });

    // Enforce mode immediately
    if (micOn) {
      // Clear any partial typed value (optional; keeps behavior crisp)
      answerInput.value = '';
      if (sessionActive) {
        waitingForBegin = true;
        if (beginPrompt) beginPrompt.classList.remove('is-hidden');
      }
      if (sessionActive) startRecognition();
    } else {
      waitingForBegin = false;
      if (beginPrompt) beginPrompt.classList.add('is-hidden');
      stopRecognition();
      if (sessionActive) answerInput.focus();
    }
  });

  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      mode = modeSelect.value;
      logLine('MODE', `Mode set to ${mode}`);
      emitEvent('mode_changed', { mode });
      if (sessionActive && mode === MODE_EVAL && blinkToggleSelect?.value === 'on') {
        const val = parseFloat(blinkRateInput?.value) || 1.0;
        startBlinkTimer(val);
      }
      if (sessionActive && mode !== MODE_EVAL) {
        stopBlinkTimer();
        if (mode === MODE_LEARN && blinkToggleSelect?.value === 'on' && awaitingSubmission) {
          const val = parseFloat(blinkRateInput?.value) || 1.0;
          scheduleLearnBlink(val);
        }
      }
    });
  }

  if (sttEngineSelect) {
    const manager = ensureSttAdapterManager();
    const sttCapabilities = getSttCapabilities();
    const options = manager.listAdapterIds();
    const renderSttStatus = (adapterId) => {
      if (!sttStatus) return;
      const capability = sttCapabilities[adapterId];
      if (!capability) {
        sttStatus.textContent = '';
        return;
      }
      sttStatus.textContent = capability.available
        ? `${capability.label} is available.`
        : `${capability.label} unavailable: ${capability.reason}`;
    };

    sttEngineSelect.innerHTML = options.map((id) => (
      `<option value="${id}"${sttCapabilities[id]?.available ? '' : ' disabled'}>${sttCapabilities[id]?.label || id}${sttCapabilities[id]?.available ? '' : ' (unavailable)'}</option>`
    )).join('');

    const currentAdapterId = manager.getCurrentAdapterId();
    const currentIsAvailable = Boolean(sttCapabilities[currentAdapterId]?.available);
    const fallbackAdapterId = options.find((id) => sttCapabilities[id]?.available);
    const selectedAdapterId = currentIsAvailable
      ? currentAdapterId
      : (fallbackAdapterId || currentAdapterId);

    if (!currentIsAvailable && fallbackAdapterId) {
      manager.setAdapter(fallbackAdapterId);
      logLine('STT_INFO', `Adapter '${currentAdapterId}' unavailable; switched to '${fallbackAdapterId}'.`);
      emitEvent('stt_engine_auto_switched', { from_engine: currentAdapterId, to_engine: fallbackAdapterId });
    }

    sttEngineSelect.value = selectedAdapterId;
    renderSttStatus(selectedAdapterId);

    sttEngineSelect.addEventListener('change', () => {
      const nextAdapterId = sttEngineSelect.value;
      const capability = sttCapabilities[nextAdapterId];
      if (!capability?.available) {
        logLine('STT_INFO', `${capability?.label || nextAdapterId} unavailable: ${capability?.reason || 'Unknown reason.'}`);
        sttEngineSelect.value = manager.getCurrentAdapterId();
        renderSttStatus(sttEngineSelect.value);
        return;
      }
      manager.setAdapter(nextAdapterId);
      renderSttStatus(nextAdapterId);
      emitEvent('stt_engine_changed', { stt_engine: nextAdapterId });
      if (sessionActive && micOn) {
        startRecognition();
      }
    });
  }

  if (operationSelect) {
    operationSelect.addEventListener('change', () => {
      operation = operationSelect.value;
      logLine('OP', `Operation set to ${operation}`);
      emitEvent('operation_changed', { operation });
      resetFacts();
      awaitingSubmission = false;
      currentFact = null;
      if (operatorBox) operatorBox.textContent = (operation === 'add') ? '+' : '×';
      if (leftOperandValue) leftOperandValue.textContent = '';
      if (rightOperandValue) rightOperandValue.textContent = '';
      if (resultValue) resultValue.textContent = '';
      if (sessionActive) advanceProblem(false);
    });
  }

  if (missingValueSelect) {
    missingValueSelect.addEventListener('change', () => {
      missingValue = missingValueSelect.value;
      logLine('MISS', `Missing value set to ${missingValue}`);
      emitEvent('missing_value_changed', { missing_value: missingValue });
      applyMissingDisplay();
    });
  }

  if (onErrorSelect) {
    onErrorSelect.addEventListener('change', () => {
      onErrorMode = onErrorSelect.value;
      logLine('ON_ERROR', `On error set to ${onErrorMode}`);
      emitEvent('on_error_changed', { on_error: onErrorMode });
    });
  }

  if (blinkToggleSelect) {
    blinkToggleSelect.addEventListener('change', () => {
      const isOn = blinkToggleSelect.value === 'on';
      logLine('BLINK', isOn ? 'On' : 'Off');
      if (!isOn) {
        stopBlinkTimer();
        return;
      }
      if (sessionActive && mode === MODE_EVAL) {
        const val = parseFloat(blinkRateInput?.value) || 1.0;
        startBlinkTimer(val);
      } else if (sessionActive && mode === MODE_LEARN && awaitingSubmission) {
        const val = parseFloat(blinkRateInput?.value) || 1.0;
        scheduleLearnBlink(val);
      }
    });
  }

  // Typed input: enforce numeric-only and auto-submit
  answerInput.addEventListener('input', (e) => {
    if (!sessionActive) return;
    if (micOn) {
      // Voice-only mode: ignore any typed input (and keep it empty)
      answerInput.value = '';
      return;
    }

    const val = speechProcessing.normalizeToNumber(answerInput.value);
    if (val == null) {
      // If not a digit, clear
      answerInput.value = '';
      return;
    }

    // Force normalized numeric display before submit
    answerInput.value = val;
    submitDigit(val);
  });

  // Prevent non-digit key presses in typed mode (optional hardening)
  answerInput.addEventListener('keydown', (e) => {
    if (answerInput.disabled) return;
    if (micOn) {
      e.preventDefault();
      return;
    }

    const allowed = [
      'Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'
    ];
    if (allowed.includes(e.key)) return;

    // Allow digits only
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  });

  // -----------------------------
  // Init UI
  // -----------------------------
  setTypedModeUI();
  logLine('INFO', 'Ready. Press Start.');
  stopBlinkTimer();
  if (modeSelect) {
    modeSelect.value = mode;
  }
  if (sttEngineSelect) {
    sttEngineSelect.value = ensureSttAdapterManager().getCurrentAdapterId();
  }
  if (operationSelect) {
    operationSelect.value = operation;
  }
  if (missingValueSelect) {
    missingValueSelect.value = missingValue;
  }
  if (onErrorSelect) {
    onErrorSelect.value = onErrorMode;
  }
  if (operatorBox) {
    operatorBox.textContent = (operation === 'add') ? '+' : '×';
  }

  if (downloadLogBtn) {
    downloadLogBtn.addEventListener('click', () => {
      if (!sessionEventLog.length) return;
      const stamp = makeShortStamp();
      const uid = deriveSessionUid(currentSessionId);
      const sessionCount = 1;
      const problemCount = deriveSessionSelectedProblemCount(sessionEventLog);
      const engine = deriveSessionEngineToken(sessionEventLog);
      const chunk = deriveSessionChunkToken(sessionEventLog);
      const source = deriveSessionSourceToken(sessionEventLog);
      const eventsForDownload = sessionEventLog.map((event) => ({
        ingest_ts_ms: Date.now(),
        ingest_ts_iso: new Date().toISOString(),
        ...event
      }));
      const jsonl = eventsForDownload.map((e) => JSON.stringify(e)).join('\n') + '\n';
      const eventsBlob = new Blob([jsonl], { type: 'application/x-ndjson' });
      const eventsUrl = URL.createObjectURL(eventsBlob);
      const eventsLink = document.createElement('a');
      eventsLink.href = eventsUrl;
      eventsLink.download = `sc_log_ses-${stamp}-${uid}_s${sessionCount}_p${problemCount}_${engine}_${chunk}_${source}.jsonl`;
      document.body.appendChild(eventsLink);
      eventsLink.click();
      document.body.removeChild(eventsLink);
      URL.revokeObjectURL(eventsUrl);
    });
  }

  if (testRunToggle) {
    testRunToggle.checked = testRunEnabled;
    testRunToggle.disabled = sessionActive;
    testRunToggle.addEventListener('change', () => {
      if (sessionActive) {
        testRunToggle.checked = testRunEnabled;
        return;
      }
      testRunEnabled = Boolean(testRunToggle.checked);
      if (testRunEnabled) {
        testRunId = makeRunId();
        testRunSessionCount = 0;
        logLine('TEST_RUN', `ON run_id=${testRunId}`);
      } else {
        logLine('TEST_RUN', 'OFF');
        testRunId = null;
        testRunSessionCount = 0;
      }
      emitEvent('test_run_toggled', {
        test_run_enabled: testRunEnabled,
        run_id: testRunEnabled ? testRunId : null
      });
    });
  }

  bindVaaEvents();
  renderVaaTable();
  setVaaStatus('Click 🗘 to load available files.', { type: 'info', duration: 'persistent' });

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (spacebarMarkArmed) {
      logLine('SPACEBAR', `Time mark ${spacebarMarkCount}`);
      spacebarMarkCount += 1;
      spacebarMarkArmed = false;
    }
    const advanced = advanceProblem(false);
    if (sessionActive && advanced) logLine('SPACE', 'Next problem');
  });

  if (blinkRateInput) {
    blinkRateInput.addEventListener('change', () => {
      const val = parseFloat(blinkRateInput.value);
      if (isNaN(val)) return;
      const clamped = Math.max(0.1, Math.min(10.0, val));
      blinkRateInput.value = clamped.toFixed(1);
      if (sessionActive && blinkToggleSelect?.value === 'on' && mode === MODE_EVAL) {
        startBlinkTimer(clamped);
      } else if (sessionActive && blinkToggleSelect?.value === 'on' && mode === MODE_LEARN && awaitingSubmission) {
        scheduleLearnBlink(clamped);
      }
    });
  }

  window.addEventListener('beforeunload', () => {
    if (ENABLE_MIC_METER) stopMicMeter();
  });
})();
