import { Platform } from 'react-native';
import {
  computeRestartDelayMs,
  describeVoiceExperiments,
  getVoiceExperiments,
  isWebKitSpeechEngine,
} from '../voiceExperiments';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1';
const CHROMEBOOK_CHROME =
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/156.0.0.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

function setUserAgent(userAgent: string) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent },
    configurable: true,
  });
}

const originalOS = Platform.OS;

function setPage(os: typeof Platform.OS, search: string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  (globalThis as { window?: unknown }).window = { location: { search } };
}

describe('voiceExperiments', () => {
  beforeEach(() => setUserAgent(IPHONE_SAFARI));

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    delete (globalThis as { window?: unknown }).window;
  });

  it('reads every switch when debug=1 is present', () => {
    setPage('web', '?debug=1&delay=1500&abort=1&reuse=1&custrec=1&addtest=1&core=2&continuous=0&keepmic=0&fast=500');

    expect(getVoiceExperiments()).toEqual({
      delayMs: 1500,
      abortBeforeRestart: true,
      reuseRecognizer: true,
      customRecognizer: true,
      addTestPreset: true,
      coreFlow: true,
      continuous: false,
      keepMic: false,
      stableInterimMs: 500,
    });
    expect(describeVoiceExperiments()).toBe('delay=1500 abort reuse custrec addtest core=2 fast=500');
  });

  it('ignores every switch without debug=1', () => {
    setPage('web', '?delay=1500&abort=1&reuse=1&core=2&continuous=0&fast=500');

    expect(getVoiceExperiments()).toEqual({
      delayMs: 0,
      abortBeforeRestart: false,
      coreFlow: false,
      continuous: true,
      reuseRecognizer: false,
      customRecognizer: false,
      addTestPreset: false,
      keepMic: true,
      stableInterimMs: 500,
    });
    expect(describeVoiceExperiments()).toBe('keepmic fast=500');
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

  it('turns the Safari workarounds on by default in Safari and off in Chrome', () => {
    setPage('web', '');

    setUserAgent(IPHONE_SAFARI);
    expect(getVoiceExperiments()).toMatchObject({
      keepMic: true,
      stableInterimMs: 500,
    });

    setUserAgent(CHROMEBOOK_CHROME);
    expect(getVoiceExperiments()).toMatchObject({
      keepMic: false,
      stableInterimMs: null,
    });
    expect(describeVoiceExperiments()).toBe('none');
  });

  it('lets debug switches override the browser default either way', () => {
    setUserAgent(CHROMEBOOK_CHROME);
    setPage('web', '?debug=1&keepmic=1&fast=800');
    expect(getVoiceExperiments()).toMatchObject({
      keepMic: true,
      stableInterimMs: 800,
    });

    setUserAgent(IPHONE_SAFARI);
    setPage('web', '?debug=1&keepmic=0&fast=0');
    expect(getVoiceExperiments()).toMatchObject({
      keepMic: false,
      stableInterimMs: null,
    });
  });

  it('treats Safari and every iPhone browser as WebKit, but not Chrome', () => {
    setUserAgent(IPHONE_SAFARI);
    expect(isWebKitSpeechEngine()).toBe(true);
    setUserAgent(IPHONE_CHROME);
    expect(isWebKitSpeechEngine()).toBe(true);
    setUserAgent(MAC_SAFARI);
    expect(isWebKitSpeechEngine()).toBe(true);
    setUserAgent(CHROMEBOOK_CHROME);
    expect(isWebKitSpeechEngine()).toBe(false);
  });

  it('does not accept interim numbers by default off the web', () => {
    setPage('ios', '');
    expect(getVoiceExperiments().stableInterimMs).toBeNull();
  });

  it('defaults to one recognizer for the session only on WebKit', () => {
    setPage('web', '?debug=1&core=2');
    expect(getVoiceExperiments()).toMatchObject({ coreFlow: true, continuous: true });
    expect(describeVoiceExperiments()).toContain('core=2 continuous');
  });

  it('can force one recognizer for the session on or off', () => {
    setPage('web', '?debug=1&core=2&continuous=0');
    expect(getVoiceExperiments().continuous).toBe(false);
    setPage('web', '?debug=1&core=2&continuous=1');
    expect(getVoiceExperiments().continuous).toBe(true);
  });
});
