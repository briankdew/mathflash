import {
  applyAddTestPreset,
  createInitialSessionState,
  getSessionOptionsFromState,
  sessionReducer,
} from '../sessionState';

describe('sessionState reducer', () => {
  it('prepares a session while preserving settings', () => {
    const state = createInitialSessionState();
    const next = sessionReducer(state, {
      type: 'prepareSession',
      sessionId: 'session-1',
      sessionStart: new Date('2026-03-18T10:00:00.000Z'),
      queue: [{ a: 1, b: 2, sum: 3, product: 2 }],
      totalProblems: 1,
    });

    expect(next.isActive).toBe(true);
    expect(next.phase).toBe('preparing');
    expect(next.queue).toHaveLength(1);
    expect(next.stats).toEqual({ completed: 0, correctFirst: 0, missedFirst: 0 });
    expect(getSessionOptionsFromState(next).operation).toBe('addsub');
  });

  it('updates global timer state independently from scoped options', () => {
    const next = sessionReducer(createInitialSessionState(), {
      type: 'setUseTimer',
      value: false,
    });

    expect(next.globalSettings.useTimer).toBe(false);
    expect(next.settingsByOperation.addsub.activeChips).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('completes a session and retains the report for later viewing', () => {
    const prepared = sessionReducer(createInitialSessionState(), {
      type: 'prepareSession',
      sessionId: 'session-2',
      sessionStart: new Date('2026-03-18T10:00:00.000Z'),
      queue: [],
      totalProblems: 1,
    });
    const completed = sessionReducer(prepared, {
      type: 'completeSession',
      report: {
        schemaVersion: 1,
        generatedAtIso: '2026-03-18T10:10:00.000Z',
        inputMode: 'keypad',
        summary: {
          problemCount: 1,
          measuredProblemCount: 1,
          measuredCompletionCount: 1,
          noInputCount: 0,
          medianOnsetLatencyMs: 100,
          fastestOnsetLatencyMs: 100,
          slowestOnsetLatencyMs: 100,
          medianCompletionLatencyMs: 200,
          firstTryAccuracyPct: 100,
          correctFirstTryMedianOnsetMs: 100,
          otherOutcomeMedianOnsetMs: null,
          attemptCountDistribution: { '1': 1 },
          outcomeCounts: {
            correct_first_try: 1,
            wrong_then_correct: 0,
            wrong_only: 0,
            no_input: 0,
            reset_incomplete: 0,
          },
          modeBreakdown: {},
        },
        problems: [],
      },
      showPerformanceReport: true,
    });

    expect(completed.isActive).toBe(false);
    expect(completed.phase).toBe('idle');
    expect(completed.sessionPerformanceReport).not.toBeNull();
    expect(completed.isPerformanceReportVisible).toBe(true);
  });
});

describe('applyAddTestPreset', () => {
  it('sets voice, addition/subtraction, numbers 6-9 and a missing result', () => {
    const state = applyAddTestPreset(createInitialSessionState());
    const options = getSessionOptionsFromState(state);

    expect(state.inputMode).toBe('voice');
    expect(options.operation).toBe('addsub');
    expect(options.activeChips).toEqual([6, 7, 8, 9]);
    expect(options.missingValue).toBe('result');
  });

  it('leaves every other setting at its default', () => {
    const defaults = createInitialSessionState();
    const state = applyAddTestPreset(defaults);
    const options = getSessionOptionsFromState(state);
    const base = getSessionOptionsFromState(defaults);

    expect({ ...options, activeChips: [], missingValue: 'random' }).toEqual({
      ...base,
      activeChips: [],
    });
    expect(state.settingsByOperation.multdiv).toEqual(
      defaults.settingsByOperation.multdiv
    );
    expect(state.globalSettings).toEqual(defaults.globalSettings);
  });
});
