import {
  applySessionOptionsUpdate,
  defaultOperationSettings,
  getSessionOptions,
  SessionOptionsState,
} from '../sessionOptions';

function createState(): SessionOptionsState {
  return {
    operation: 'addsub',
    settingsByOperation: {
      addsub: defaultOperationSettings(),
      multdiv: defaultOperationSettings(),
    },
    globalSettings: {
      useTimer: true,
      startMode: 'min',
      autoShowPerformanceReport: false,
    },
  };
}

describe('sessionOptions', () => {
  it('keeps settings scoped per operation', () => {
    const afterAddSub = applySessionOptionsUpdate(createState(), {
      type: 'toggleCustomSet',
      customSet: 'doubles',
    });
    const switched = applySessionOptionsUpdate(afterAddSub, {
      type: 'setOperation',
      operation: 'multdiv',
    });

    expect(getSessionOptions(switched.operation, switched.settingsByOperation, switched.globalSettings))
      .toMatchObject({ operation: 'multdiv', customSet: null });
    expect(switched.settingsByOperation.addsub.customSet).toBe('doubles');
  });

  it('resets custom set when toggling a single chip', () => {
    const state = applySessionOptionsUpdate(createState(), {
      type: 'toggleCustomSet',
      customSet: 'doubles',
    });
    const next = applySessionOptionsUpdate(state, { type: 'toggleChip', value: 4 });

    expect(next.settingsByOperation.addsub.customSet).toBeNull();
    expect(next.settingsByOperation.addsub.activeChips).toEqual([4]);
  });

  it('cycles practice cycles and locks sets mode appropriately', () => {
    const state = createState();
    const next = applySessionOptionsUpdate(state, { type: 'cyclePracticeCycles' });

    expect(next.settingsByOperation.addsub.practiceCycles).toBe(2);
    expect(next.settingsByOperation.addsub.setsMode).toBe('cycles');
  });

  it('toggles global report visibility without mutating operation settings', () => {
    const next = applySessionOptionsUpdate(createState(), {
      type: 'toggleAutoShowPerformanceReport',
    });

    expect(next.globalSettings.autoShowPerformanceReport).toBe(true);
    expect(next.settingsByOperation.addsub).toEqual(defaultOperationSettings());
  });
});
