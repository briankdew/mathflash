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
  const structuredEventLog = [];

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
      ...payload
    };
    eventSeq += 1;
    structuredEventLog.push(event);
  }

  function getAdapterEventContext(overrides = {}) {
    return {
      session_id: currentSessionId,
      problem_id: currentProblemId,
      segment_id: null,
      chunk_id: null,
      engine: getCurrentEngineId(),
      client_ts_ms: Date.now(),
      ...overrides
    };
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

  function handleRecognitionFinalResult({ transcript, abortAndReset }) {
    const cleaned = transcript.trim().toLowerCase();
    emitEvent('stt_final_result', {
      transcript_raw: String(transcript || ''),
      transcript_cleaned: cleaned
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

    const val = speechProcessing.normalizeToNumber(transcript);
    if (val != null) {
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
      defaultAdapterId: 'webspeech',
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

  // -----------------------------
  // UI Events
  // -----------------------------
  function startSession() {
    sessionActive = true;
    currentSessionId = makeId('sess');
    currentProblemId = null;
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
    logLine('ENV', `Browser=${env.browser} OS=${env.os} Source=${sourceLabel} STT=${sttEngine}`);
    emitEvent('session_start', {
      browser: env.browser,
      os: env.os,
      source: sourceLabel,
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
    if (blinkToggleSelect?.value === 'on' && mode === MODE_EVAL) {
      startBlinkTimer(parseFloat(blinkRateInput?.value) || 1.0);
    }

    if (micOn) startRecognition();
  }

  function endSession() {
    sessionActive = false;
    startEndBtn.textContent = 'Start';
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
      if (!feed.textContent) return;
      const blob = new Blob([feed.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const env = detectPlatformInfo();
      let platform = `${env.browser}_${env.os}`;
      const sanitizePlatform = (value) => String(value || 'Unknown').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20) || 'Unknown';
      platform = sanitizePlatform(platform);
      const now = new Date();
      const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      let time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      if (lastLogTimestamp) {
        const hhmm = lastLogTimestamp.slice(0, 5).replace(':', '');
        if (/^\d{4}$/.test(hhmm)) time = hhmm;
      }
      a.download = `speechCapture_log_${platform}_${date}.${time}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (structuredEventLog.length) {
        const jsonl = structuredEventLog.map((e) => JSON.stringify(e)).join('\n') + '\n';
        const eventsBlob = new Blob([jsonl], { type: 'application/x-ndjson' });
        const eventsUrl = URL.createObjectURL(eventsBlob);
        const eventsLink = document.createElement('a');
        eventsLink.href = eventsUrl;
        eventsLink.download = `speechCapture_events_${platform}_${date}.${time}.jsonl`;
        document.body.appendChild(eventsLink);
        eventsLink.click();
        document.body.removeChild(eventsLink);
        URL.revokeObjectURL(eventsUrl);
      }
    });
  }

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
