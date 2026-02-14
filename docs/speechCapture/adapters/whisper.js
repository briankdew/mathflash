(() => {
  function createWhisperAdapter(deps) {
    let started = false;

    function start() {
      if (started) return;
      started = true;
      deps.logLine('STT_INFO', 'Whisper adapter selected, but runtime integration is not implemented yet.');
    }

    function stop() {
      started = false;
    }

    function reset() {
      started = false;
    }

    return {
      start,
      stop,
      reset,
      isRecognizing: () => false
    };
  }

  window.createWhisperAdapter = createWhisperAdapter;
})();
