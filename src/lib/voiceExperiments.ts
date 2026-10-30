import { Platform } from 'react-native';

// Voice experiments are switched on from the page URL, and only together with
// ?debug=1, so normal users never see them. Example:
//   https://briankdew.github.io/mathflash/?debug=1&abort=1&fast=500
//
//   delay=N  keep at least N ms between one recognizer ending and the next start
//   abort=1  abort() the old recognizer and wait for its end before restarting
//   reuse=1  use one recognizer object for the whole session (web only)
//   custrec=1 use our custom recording recognizer (a new browser recognizer per
//            start, each with a recId, events timed with the browser's own
//            timestamps and written to the session record). Web only.
//   addtest=1 start with the usual 10-problem test setup: voice input,
//            addition/subtraction, numbers 6-9, missing value 'result'
//   keepmic=1|0  force holding the microphone open for the whole session on or
//            off (web only). Default: on in Safari/WebKit, where it stops the
//            next recognition getting a dead microphone; off in Chrome, where
//            it appeared to make recognitions come back empty.
//   core=2   run the new timing core: session flow, voice controller and
//            session record (docs/timing-core-design.md). Web only.
//   continuous=1|0  with core=2, force one recognizer for the whole session on
//            or off. Default: on in Safari/WebKit, off (a new recognizer per
//            card) in Chrome.
//   fast=N   change how long a valid interim number must stay unchanged before
//            it is accepted instead of waiting for the browser's final result.
//            Default: on (DEFAULT_STABLE_INTERIM_MS) in Safari/WebKit, off in
//            Chrome; fast=0 forces it off
export interface VoiceExperiments {
  delayMs: number;
  abortBeforeRestart: boolean;
  reuseRecognizer: boolean;
  customRecognizer: boolean;
  addTestPreset: boolean;
  coreFlow: boolean;
  continuous: boolean;
  keepMic: boolean;
  stableInterimMs: number | null;
}

// iPhone Safari delivers its final transcript 1.5-3.5s after you start
// speaking, but its first guess is usually already right. On the web a valid
// interim number is accepted once it has stayed unchanged this long.
export const DEFAULT_STABLE_INTERIM_MS = 500;

// Safari, and every browser on iPhone/iPad (they all use Apple's WebKit speech
// engine). Safari needs workarounds that Chrome does not: Chrome's results
// already worked and the workarounds made it worse, so they are Safari-only.
export function isWebKitSpeechEngine(): boolean {
  const userAgent = globalThis.navigator?.userAgent ?? '';
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return true;
  }
  return (
    /Safari/.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(userAgent)
  );
}

function defaultStableInterimMs() {
  return Platform.OS === 'web' && isWebKitSpeechEngine()
    ? DEFAULT_STABLE_INTERIM_MS
    : null;
}

function defaultKeepMic() {
  return isWebKitSpeechEngine();
}

function defaultContinuous() {
  return isWebKitSpeechEngine();
}

function noExperiments(): VoiceExperiments {
  return {
    delayMs: 0,
    abortBeforeRestart: false,
    reuseRecognizer: false,
    customRecognizer: false,
    addTestPreset: false,
    coreFlow: false,
    continuous: defaultContinuous(),
    keepMic: defaultKeepMic(),
    stableInterimMs: defaultStableInterimMs(),
  };
}

export function getWebQueryParams(): URLSearchParams | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    return new URLSearchParams(globalThis.window?.location?.search ?? '');
  } catch {
    return null;
  }
}

function readMs(params: URLSearchParams, name: string, max: number) {
  const value = Number(params.get(name));
  return Number.isFinite(value) && value > 0 ? Math.min(value, max) : null;
}

export function getVoiceExperiments(): VoiceExperiments {
  const params = getWebQueryParams();
  if (!params || params.get('debug') !== '1') {
    return noExperiments();
  }

  return {
    delayMs: readMs(params, 'delay', 5000) ?? 0,
    abortBeforeRestart: params.get('abort') === '1',
    reuseRecognizer: params.get('reuse') === '1',
    customRecognizer: params.get('custrec') === '1',
    addTestPreset: params.get('addtest') === '1',
    coreFlow: params.get('core') === '2',
    continuous: params.has('continuous')
      ? params.get('continuous') === '1'
      : defaultContinuous(),
    keepMic: params.has('keepmic')
      ? params.get('keepmic') === '1'
      : defaultKeepMic(),
    stableInterimMs: params.has('fast')
      ? readMs(params, 'fast', 3000)
      : defaultStableInterimMs(),
  };
}

export function describeVoiceExperiments(): string {
  const experiments = getVoiceExperiments();
  const active = [
    experiments.delayMs > 0 ? `delay=${experiments.delayMs}` : '',
    experiments.abortBeforeRestart ? 'abort' : '',
    experiments.reuseRecognizer ? 'reuse' : '',
    experiments.customRecognizer ? 'custrec' : '',
    experiments.addTestPreset ? 'addtest' : '',
    experiments.coreFlow ? 'core=2' : '',
    experiments.coreFlow && experiments.continuous ? 'continuous' : '',
    experiments.keepMic ? 'keepmic' : '',
    experiments.stableInterimMs !== null
      ? `fast=${experiments.stableInterimMs}`
      : '',
  ].filter(Boolean);

  return active.length > 0 ? active.join(' ') : 'none';
}

// How long to wait before restarting the recognizer: the normal delay, or
// longer if the previous recognizer ended less than `minGapMs` ago.
export function computeRestartDelayMs(
  baseDelayMs: number,
  minGapMs: number,
  msSincePreviousEnd: number
): number {
  if (minGapMs <= 0) {
    return baseDelayMs;
  }
  return Math.max(baseDelayMs, minGapMs - Math.max(0, msSincePreviousEnd));
}
