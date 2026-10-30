import { Platform } from 'react-native';
import {
  buildVoiceDebugFileName,
  buildVoiceDebugReport,
  formatVoiceDebugEntry,
  getVoiceDebugEntries,
  isVoiceDebugEnabled,
  logVoiceDebug,
  resetVoiceDebugLog,
  setVoiceDebugReportSection,
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
    for (let i = 1; i <= 3005; i += 1) {
      logVoiceDebug(`event${i}`);
    }

    const entries = getVoiceDebugEntries();
    expect(entries).toHaveLength(3000);
    expect(entries[0].label).toBe('event6');
    expect(entries[2999].label).toBe('event3005');
  });

  it('folds identical consecutive events into a repeat count', () => {
    setPage('web', '?debug=1');
    logVoiceDebug('end');
    logVoiceDebug('end');
    logVoiceDebug('end');
    logVoiceDebug('start');
    logVoiceDebug('end');

    const entries = getVoiceDebugEntries();
    expect(entries.map(entry => [entry.label, entry.count])).toEqual([
      ['end', 3],
      ['start', 1],
      ['end', 1],
    ]);
  });

  it('formats an entry with detail and repeat count', () => {
    expect(
      formatVoiceDebugEntry({
        id: 1,
        atMs: 1500,
        label: 'end',
        detail: '',
        count: 1,
      })
    ).toBe('   1.5s end');
    expect(
      formatVoiceDebugEntry({
        id: 2,
        atMs: 31000,
        label: 'error',
        detail: 'audio-capture',
        count: 9,
      })
    ).toBe('  31.0s error audio-capture x9');
  });

  it('builds a report with a header and every event', () => {
    setPage('web', '?debug=1');
    logVoiceDebug('start()');
    logVoiceDebug('error', 'aborted No speech detected');

    const report = buildVoiceDebugReport();
    expect(report).toContain('mathflash voice debug log');
    expect(report).toContain('events: 2');
    expect(report).toContain('start()');
    expect(report).toContain('error aborted No speech detected');
  });

  it('adds the extra section at the end of the report', () => {
    setPage('web', '?debug=1');
    logVoiceDebug('start()');
    setVoiceDebugReportSection(() => 'session record: {}');

    const report = buildVoiceDebugReport();
    expect(report.indexOf('start()')).toBeLessThan(
      report.indexOf('session record: {}')
    );
    setVoiceDebugReportSection(() => '');
  });

  it('names the saved file with the local date and time', () => {
    expect(buildVoiceDebugFileName(new Date(2026, 9, 28, 8, 5))).toBe(
      'mathflash-voice-log-2026-10-28-0805.txt'
    );
  });
});
