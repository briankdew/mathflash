(() => {
  function createWebSpeechRecognitionController(deps) {
    let recognition = null;
    let recognizing = false;

    function resetRecognitionAfterSkip() {
      recognition = null;
      recognizing = false;
    }

    function skipProblemAndResetRecognition(logIndex, reasonText) {
      deps.logLine('PROB_SKIP', `Problem ${logIndex} (${reasonText})`);
      if (recognition) {
        try {
          recognition.abort();
          deps.logLine('REC', 'abort() called');
        } catch (e) {
          deps.logLine('REC_ERR', `abort() threw: ${e && e.message ? e.message : String(e)}`);
        }
      }
      resetRecognitionAfterSkip();
      deps.logLine('REC_RESET', 'after PROB_SKIP');
      deps.setAwaitingSubmission(false);
      deps.handleSkipAdvance(true);
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
        if (
          deps.getSessionActive() &&
          !deps.getWaitingForBegin() &&
          deps.getMode() === deps.modeLearn &&
          !deps.getAwaitingSubmission() &&
          !deps.getLeftOperandText()
        ) {
          deps.advanceProblem();
        }
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
          const conf = top && typeof top.confidence === 'number' ? top.confidence.toFixed(3) : 'n/a';

          deps.logLine('REC_RES', `i=${i} final=${res.isFinal} conf=${conf} txt="${transcript.trim()}"`);

          if (!res.isFinal) {
            const interimCheck = deps.speechProcessing.detectDuplicateOrMixedTokens(transcript);
            if (interimCheck?.type === 'duplicate') {
              deps.setInterimDuplicateValue(interimCheck.value);
            }
          }

          if (res.isFinal) {
            const cleaned = transcript.trim().toLowerCase();
            const interimDuplicateValue = deps.getInterimDuplicateValue();
            const awaitingSubmission = deps.getAwaitingSubmission();

            if (
              interimDuplicateValue != null &&
              /^\d+$/.test(cleaned) &&
              cleaned.length > 1 &&
              cleaned.split('').every((ch) => ch === cleaned[0]) &&
              parseInt(cleaned[0], 10) === interimDuplicateValue &&
              awaitingSubmission
            ) {
              const stitched = deps.speechProcessing.stitchTokenDigits(cleaned);
              if (stitched != null) {
                const logIndex = deps.getSpaceCount() - 1;
                deps.logLine('FLAGGED', `Problem ${logIndex} (Stitched="${stitched}" from "${cleaned}")`);
                deps.submitDigit(stitched);
                continue;
              }
              continue;
            }

            if (cleaned === '' && awaitingSubmission) {
              const logIndex = deps.getSpaceCount() - 1;
              skipProblemAndResetRecognition(logIndex, 'Empty final=true detected');
              continue;
            }

            if (awaitingSubmission && /[:/]/.test(cleaned)) {
              const logIndex = deps.getSpaceCount() - 1;
              skipProblemAndResetRecognition(logIndex, 'Non-numeric symbol detected');
              continue;
            }

            const tokenCheck = deps.speechProcessing.detectDuplicateOrMixedTokens(cleaned);
            if (tokenCheck?.type === 'mixed' && awaitingSubmission) {
              const stitched = deps.speechProcessing.stitchTokenDigits(cleaned);
              if (stitched != null) {
                const logIndex = deps.getSpaceCount() - 1;
                deps.logLine('FLAGGED', `Problem ${logIndex} (Stitched="${stitched}" from "${cleaned}")`);
                deps.submitDigit(stitched);
                continue;
              }
            }

            if (tokenCheck?.type === 'duplicate') {
              deps.submitDigit(String(tokenCheck.value));
              continue;
            }

            const lastFinalTranscript = deps.getLastFinalTranscript();
            if (cleaned && cleaned === lastFinalTranscript) continue;
            deps.setLastFinalTranscript(cleaned);

            if (deps.getWaitingForBegin() && /\bbegin\b/.test(cleaned)) {
              deps.setWaitingForBegin(false);
              deps.hideBeginPrompt();
              deps.logLine('BEGIN', 'Begin detected');
              deps.advanceProblem();
              continue;
            }

            const val = deps.speechProcessing.normalizeToNumber(transcript);
            if (val != null) {
              deps.submitDigit(val);
            }
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
      isRecognizing: () => recognizing
    };
  }

  window.createWebSpeechRecognitionController = createWebSpeechRecognitionController;
})();
