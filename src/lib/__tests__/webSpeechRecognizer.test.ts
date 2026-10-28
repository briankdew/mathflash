import {
  resetWebSpeechRecognizerForTests,
  webSpeechRecognizer,
} from '../webSpeechRecognizer';

type Handler = (event: unknown) => void;

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  interimResults = false;
  maxAlternatives = 0;
  continuous = false;
  handlers: Record<string, Handler[]> = {};
  startCalls = 0;
  abortCalls = 0;
  throwOnStart = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  addEventListener(name: string, handler: Handler) {
    (this.handlers[name] ??= []).push(handler);
  }

  start() {
    if (this.throwOnStart) {
      throw new Error('already started');
    }
    this.startCalls += 1;
  }

  stop() {}

  abort() {
    this.abortCalls += 1;
  }

  fire(name: string, event: unknown = {}) {
    (this.handlers[name] ?? []).forEach(handler => handler(event));
  }
}

describe('webSpeechRecognizer', () => {
  beforeEach(() => {
    resetWebSpeechRecognizerForTests();
    FakeRecognition.instances = [];
    (globalThis as { window?: unknown }).window = {
      webkitSpeechRecognition: FakeRecognition,
      location: { search: '' },
    };
  });

  afterAll(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('reuses one browser recognizer across starts', () => {
    webSpeechRecognizer.start({ lang: 'en-US', interimResults: true });
    webSpeechRecognizer.start({ lang: 'en-US', interimResults: true });

    expect(FakeRecognition.instances).toHaveLength(1);
    expect(FakeRecognition.instances[0].startCalls).toBe(2);
    expect(FakeRecognition.instances[0].interimResults).toBe(true);
  });

  it('forwards events to listeners until they are removed', () => {
    const onEnd = jest.fn();
    const subscription = webSpeechRecognizer.addListener('end', onEnd);
    webSpeechRecognizer.start({});

    FakeRecognition.instances[0].fire('end');
    expect(onEnd).toHaveBeenCalledTimes(1);

    subscription.remove();
    FakeRecognition.instances[0].fire('end');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('maps interim and final results to the library payload shape', () => {
    const onResult = jest.fn();
    webSpeechRecognizer.addListener('result', onResult);
    webSpeechRecognizer.start({});
    const instance = FakeRecognition.instances[0];

    const interim = Object.assign(
      [{ transcript: 'seven', confidence: 0.9 }],
      { isFinal: false }
    );
    instance.fire('result', { resultIndex: 0, results: [interim] });

    const final = Object.assign(
      [{ transcript: 'Seven', confidence: 0.95 }],
      { isFinal: true }
    );
    instance.fire('result', { resultIndex: 0, results: [final] });

    expect(onResult.mock.calls[0][0]).toMatchObject({
      isFinal: false,
      results: [{ transcript: 'seven' }],
    });
    expect(onResult.mock.calls[1][0]).toMatchObject({
      isFinal: true,
      results: [{ transcript: 'Seven', confidence: 0.95 }],
    });
  });

  it('aborts and restarts once the run ends when start() is rejected', () => {
    webSpeechRecognizer.start({});
    const instance = FakeRecognition.instances[0];
    instance.throwOnStart = true;

    webSpeechRecognizer.start({});
    expect(instance.abortCalls).toBe(1);
    expect(instance.startCalls).toBe(1);

    instance.throwOnStart = false;
    instance.fire('end');
    expect(instance.startCalls).toBe(2);
  });
});
