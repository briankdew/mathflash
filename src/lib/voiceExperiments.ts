import { Platform } from 'react-native';

// Voice experiments are switched on from the page URL, and only together with
// ?debug=1, so normal users never see them. Example:
//   https://briankdew.github.io/mathflash/?debug=1&abort=1&fast=500
//
//   delay=N  keep at least N ms between one recognizer ending and the next start
//   abort=1  abort() the old recognizer and wait for its end before restarting
//   reuse=1  use one recognizer object for the whole session (web only)
//   keepmic=0  turn OFF the default of holding the microphone open for the whole
//            session (web only). Holding it stops iPhone Safari from handing the
//            next recognition a dead microphone.
//   fast=N   change how long a valid interim number must stay unchanged before
//            it is accepted instead of waiting for the browser's final result.
//            On the web this is ON by default (DEFAULT_STABLE_INTERIM_MS);
//            fast=0 turns it off
export interface VoiceExperiments {
  delayMs: number;
  abortBeforeRestart: boolean;
  reuseRecognizer: boolean;
  keepMic: boolean;
  stableInterimMs: number | null;
}

// iPhone Safari delivers its final transcript 1.5-3.5s after you start
// speaking, but its first guess is usually already right. On the web a valid
// interim number is accepted once it has stayed unchanged this long.
export const DEFAULT_STABLE_INTERIM_MS = 500;

function defaultStableInterimMs() {
  return Platform.OS === 'web' ? DEFAULT_STABLE_INTERIM_MS : null;
}

function noExperiments(): VoiceExperiments {
  return {
    delayMs: 0,
    abortBeforeRestart: false,
    reuseRecognizer: false,
    keepMic: true,
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
    keepMic: params.get('keepmic') !== '0',
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
    experiments.keepMic ? '' : 'keepmic=off',
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
