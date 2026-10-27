import { Platform } from 'react-native';
import {
  formatVoiceDebugEntry,
  getVoiceDebugEntries,
  isVoiceDebugEnabled,
  logVoiceDebug,
  resetVoiceDebugLog,
} from '../voiceDebugLog';

const originalOS = Platform.OS;

function setPage(os: typeof Platform.OS, search: string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  (globalThis as { window?: unknown }).window = { location: { search } };
}

describe('voiceDebugLog', () => {
  beforeEach(() => {
    resetVoiceDebugLog();
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    delete (globalThis as { window?: unknown }).window;
  });

  it('is enabled only on web with ?debug=1', () => {
    setPage('web', '?debug=1');
    expect(isVoiceDebugEnabled()).toBe(true);

    setPage('web', '');
    expect(isVoiceDebugEnabled()).toBe(false);

    setPage('web', '?debug=0');
    expect(isVoiceDebugEnabled()).toBe(false);

    setPage('ios', '?debug=1');
    expect(isVoiceDebugEnabled()).toBe(false);
  });

  it('records nothing when disabled', () => {
    setPage('web', '');
    logVoiceDebug('start()');
    expect(getVoiceDebugEntries()).toHaveLength(0);
  });

  it('keeps only the most recent entries, oldest first', () => {
    setPage('web', '?debug=1');
    for (let i = 1; i <= 20; i += 1) {
      logVoiceDebug(`event${i}`);
    }

    const entries = getVoiceDebugEntries();
    expect(entries).toHaveLength(14);
    expect(entries[0].label).toBe('event7');
    expect(entries[13].label).toBe('event20');
  });

  it('formats an entry with and without detail', () => {
    expect(
      formatVoiceDebugEntry({ id: 1, atMs: 1500, label: 'end', detail: '' })
    ).toBe('  1.5s end');
    expect(
      formatVoiceDebugEntry({
        id: 2,
        atMs: 31000,
        label: 'error',
        detail: 'audio-capture',
      })
    ).toBe(' 31.0s error audio-capture');
  });
});
