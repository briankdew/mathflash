(() => {
  function createWebSpeechAdapter(deps) {
    let recognition = null;
    let recognizing = false;

    function resetRecognitionObject() {
      recognition = null;
      recognizing = false;
    }

    function abortAndReset() {
      if (recognition) {
        try {
          recognition.abort();
          deps.logLine('REC', 'abort() called');
        } catch (e) {
          deps.logLine('REC_ERR', `abort() threw: ${e && e.message ? e.message : String(e)}`);
        }
      }
      resetRecognitionObject();
    }

    function autoRestartIfNeeded() {
      if (deps.getSessionActive() && deps.getMicOn()) {
        setTimeout(() => {
          if (deps.getSessionActive() && deps.getMicOn() && !recognizing) {
            start();
          }
        }, 250);
      }
    }

    function initRecognitionIfPossible() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        deps.logLine('INFO', 'Web Speech API SpeechRecognition not available in this browser.');
        return null;
      }

      const r = new SR();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;

      r.onstart = () => {
        recognizing = true;
        deps.logLine('REC', 'onstart');
      };

      r.onend = () => {
        recognizing = false;
        deps.logLine('REC', 'onend');
        autoRestartIfNeeded();
      };

      r.onerror = (e) => {
        deps.logLine('REC_ERR', `${e.error}${e.message ? ' - ' + e.message : ''}`);
      };

      r.onaudiostart = () => {
        deps.logLine('REC', 'onaudiostart');
        deps.onAudioStart();
      };

      r.onaudioend = () => deps.logLine('REC', 'onaudioend');
      r.onspeechstart = () => deps.logLine('REC', 'onspeechstart');
      r.onspeechend = () => deps.logLine('REC', 'onspeechend');
      r.onsoundstart = () => deps.logLine('REC', 'onsoundstart');
      r.onsoundend = () => deps.logLine('REC', 'onsoundend');
      r.onnomatch = () => deps.logLine('REC', 'onnomatch');

      r.onresult = (event) => {
        if (!deps.getSessionActive() || !deps.getMicOn()) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const top = res[0];
          const transcript = top && top.transcript ? top.transcript : '';
          const confidence = top && typeof top.confidence === 'number' ? top.confidence : null;
          const confText = confidence != null ? confidence.toFixed(3) : 'n/a';

          deps.logLine('REC_RES', `i=${i} final=${res.isFinal} conf=${confText} txt="${transcript.trim()}"`);

          if (res.isFinal) {
            deps.onFinalResult({ index: i, transcript, confidence, abortAndReset });
          } else {
            deps.onInterimResult({ index: i, transcript, confidence });
          }
        }
      };

      return r;
    }

    function start() {
      if (!recognition) recognition = initRecognitionIfPossible();
      if (!recognition) return;
      if (recognizing) return;
      try {
        recognition.start();
        deps.logLine('REC', 'start() called');
      } catch (e) {
        deps.logLine('REC_ERR', `start() threw: ${e && e.message ? e.message : String(e)}`);
      }
    }

    function stop() {
      if (!recognition) return;
      if (!recognizing) return;
      try {
        recognition.stop();
        deps.logLine('REC', 'stop() called');
      } catch (e) {
        deps.logLine('REC_ERR', `stop() threw: ${e && e.message ? e.message : String(e)}`);
      }
    }

    return {
      start,
      stop,
      reset: abortAndReset,
      isRecognizing: () => recognizing
    };
  }

  // Backward-compatible alias while migrating call sites.
  window.createWebSpeechRecognitionController = createWebSpeechAdapter;
  window.createWebSpeechAdapter = createWebSpeechAdapter;
})();
