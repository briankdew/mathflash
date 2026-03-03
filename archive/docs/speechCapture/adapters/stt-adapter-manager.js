(() => {
  function createSttAdapterManager({ factories, defaultAdapterId, logLine }) {
    if (!factories || typeof factories !== 'object') {
      throw new Error('STT adapter factories are required.');
    }

    const adapterIds = Object.keys(factories);
    if (!adapterIds.length) {
      throw new Error('At least one STT adapter factory is required.');
    }

    const isKnownId = (id) => Object.prototype.hasOwnProperty.call(factories, id);
    const initialId = isKnownId(defaultAdapterId) ? defaultAdapterId : adapterIds[0];

    let currentAdapterId = null;
    let currentAdapter = null;

    function createAdapter(id) {
      const adapter = factories[id]();
      if (!adapter || typeof adapter.start !== 'function' || typeof adapter.stop !== 'function') {
        throw new Error(`Invalid STT adapter for '${id}'.`);
      }
      return adapter;
    }

    function ensureCurrentAdapter() {
      if (!currentAdapter) {
        currentAdapterId = currentAdapterId || initialId;
        currentAdapter = createAdapter(currentAdapterId);
      }
      return currentAdapter;
    }

    function setAdapter(id) {
      if (!isKnownId(id)) {
        throw new Error(`Unknown STT adapter: ${id}`);
      }
      if (id === currentAdapterId) return;

      if (currentAdapter) {
        currentAdapter.stop();
      }

      currentAdapterId = id;
      currentAdapter = createAdapter(currentAdapterId);
      if (logLine) logLine('STT', `Adapter set to ${currentAdapterId}`);
    }

    function start() {
      ensureCurrentAdapter().start();
    }

    function stop() {
      if (!currentAdapter) return;
      currentAdapter.stop();
    }

    function getCurrentAdapterId() {
      return currentAdapterId || initialId;
    }

    function listAdapterIds() {
      return adapterIds.slice();
    }

    function notify(eventName, payload) {
      if (!currentAdapter) return;
      if (typeof currentAdapter.onNotify === 'function') {
        currentAdapter.onNotify(eventName, payload);
      }
    }

    return {
      start,
      stop,
      notify,
      setAdapter,
      getCurrentAdapterId,
      listAdapterIds
    };
  }

  window.createSttAdapterManager = createSttAdapterManager;
})();
