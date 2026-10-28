import { Platform } from 'react-native';
import {
  computeRestartDelayMs,
  describeVoiceExperiments,
  getVoiceExperiments,
} from '../voiceExperiments';

const originalOS = Platform.OS;

function setPage(os: typeof Platform.OS, search: string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  (globalThis as { window?: unknown }).window = { location: { search } };
}

describe('voiceExperiments', () => {
  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    delete (globalThis as { window?: unknown }).window;
  });

  it('reads every switch when debug=1 is present', () => {
    setPage('web', '?debug=1&delay=1500&abort=1&reuse=1&keepmic=0&fast=500');

    expect(getVoiceExperiments()).toEqual({
      delayMs: 1500,
      abortBeforeRestart: true,
      reuseRecognizer: true,
      keepMic: false,
      stableInterimMs: 500,
    });
    expect(describeVoiceExperiments()).toBe(
      'delay=1500 abort reuse keepmic=off fast=500'
    );
  });

  it('ignores every switch without debug=1', () => {
    setPage('web', '?delay=1500&abort=1&reuse=1&fast=500');

    expect(getVoiceExperiments()).toEqual({
      delayMs: 0,
      abortBeforeRestart: false,
      reuseRecognizer: false,
      keepMic: true,
      stableInterimMs: null,
    });
    expect(describeVoiceExperiments()).toBe('none');
  });

  it('ignores switches off the web and bad numbers', () => {
    setPage('ios', '?debug=1&abort=1');
    expect(getVoiceExperiments().abortBeforeRestart).toBe(false);

    setPage('web', '?debug=1&fast=abc&delay=-5');
    expect(getVoiceExperiments().stableInterimMs).toBeNull();
    expect(getVoiceExperiments().delayMs).toBe(0);
  });

  it('caps very large numbers', () => {
    setPage('web', '?debug=1&fast=999999&delay=999999');
    expect(getVoiceExperiments().stableInterimMs).toBe(3000);
    expect(getVoiceExperiments().delayMs).toBe(5000);
  });

  it('computes the restart delay from the minimum gap', () => {
    expect(computeRestartDelayMs(220, 0, 10)).toBe(220);
    expect(computeRestartDelayMs(0, 1500, 500)).toBe(1000);
    expect(computeRestartDelayMs(220, 1500, 1400)).toBe(220);
    expect(computeRestartDelayMs(0, 1500, Infinity)).toBe(0);
  });
});
