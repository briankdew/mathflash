import {
  CustomSet,
  MissingValueMode,
  OperationMode,
  OperandOrder,
  ProblemOrder,
  SessionOptions,
  SetsMode,
  StartMode,
} from './types';

export type OperationScopedSettings = {
  problemOrder: ProblemOrder;
  operandOrder: OperandOrder;
  missingValue: MissingValueMode;
  activeChips: number[];
  customSet: CustomSet;
  practiceCycles: number;
  setsMode: SetsMode;
};

export type GlobalSessionSettings = {
  useTimer: boolean;
  startMode: StartMode;
};

export type SettingsByOperation = Record<OperationMode, OperationScopedSettings>;

export type SessionOptionsState = {
  operation: OperationMode;
  settingsByOperation: SettingsByOperation;
  globalSettings: GlobalSessionSettings;
};

export type SessionOptionsUpdate =
  | { type: 'setOperation'; operation: OperationMode }
  | { type: 'cycleProblemOrder' }
  | { type: 'cycleOperandOrder' }
  | { type: 'cycleMissingValue' }
  | { type: 'cyclePracticeCycles' }
  | { type: 'toggleSetsMode' }
  | { type: 'toggleChip'; value: number }
  | { type: 'toggleAllChips' }
  | { type: 'toggleCustomSet'; customSet: Exclude<CustomSet, null> }
  | { type: 'toggleStartMode' };

const ALL_CHIPS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PROBLEM_ORDER_SEQUENCE: ProblemOrder[] = ['random', 'standard'];
const OPERAND_ORDER_SEQUENCE: OperandOrder[] = ['random', 'standard', 'reverse'];
const MISSING_VALUE_SEQUENCE: MissingValueMode[] = ['random', 'result', 'operand'];

export const defaultOperationSettings = (): OperationScopedSettings => ({
  problemOrder: 'random',
  operandOrder: 'random',
  missingValue: 'random',
  activeChips: [...ALL_CHIPS],
  customSet: null,
  practiceCycles: 1,
  setsMode: 'cycles',
});

export function isCustomSetAllowedForOperation(
  operation: OperationMode,
  customSet: CustomSet
): boolean {
  if (customSet === null) return true;
  if (operation === 'addsub') return customSet === '10s' || customSet === 'doubles';
  return customSet === 'squares';
}

export function normalizeScopedSettingsForOperation(
  operation: OperationMode,
  settings: OperationScopedSettings
): OperationScopedSettings {
  const customSet = isCustomSetAllowedForOperation(operation, settings.customSet)
    ? settings.customSet
    : null;

  return {
    ...settings,
    customSet,
  };
}

export function getSessionOptions(
  operation: OperationMode,
  settingsByOperation: SettingsByOperation,
  globalSettings: GlobalSessionSettings
): SessionOptions {
  const currentOperationSettings = normalizeScopedSettingsForOperation(
    operation,
    settingsByOperation[operation]
  );

  return {
    operation,
    problemOrder: currentOperationSettings.problemOrder,
    operandOrder: currentOperationSettings.operandOrder,
    missingValue: currentOperationSettings.missingValue,
    startMode: globalSettings.startMode,
    setsMode: currentOperationSettings.setsMode,
    activeChips: currentOperationSettings.activeChips,
    customSet: currentOperationSettings.customSet,
    practiceCycles: currentOperationSettings.practiceCycles,
  };
}

function cycleValue<T extends string>(sequence: readonly T[], current: T): T {
  const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
  return sequence[nextIdx];
}

function toggleChipSelection(settings: OperationScopedSettings, value: number): OperationScopedSettings {
  if (settings.customSet) {
    return {
      ...settings,
      customSet: null,
      activeChips: [value],
    };
  }

  const current = new Set(settings.activeChips);
  if (current.has(value)) {
    current.delete(value);
  } else {
    current.add(value);
  }

  return {
    ...settings,
    activeChips: Array.from(current).sort((a, b) => a - b),
  };
}

function toggleAllChipSelection(settings: OperationScopedSettings): OperationScopedSettings {
  const isAllMode = !settings.customSet && settings.activeChips.length === ALL_CHIPS.length;

  return {
    ...settings,
    customSet: null,
    activeChips: isAllMode ? [] : [...ALL_CHIPS],
  };
}

function toggleCustomSetSelection(
  operation: OperationMode,
  settings: OperationScopedSettings,
  customSet: Exclude<CustomSet, null>
): OperationScopedSettings {
  if (!isCustomSetAllowedForOperation(operation, customSet)) {
    return normalizeScopedSettingsForOperation(operation, settings);
  }

  return normalizeScopedSettingsForOperation(operation, {
    ...settings,
    customSet: settings.customSet === customSet ? null : customSet,
    activeChips: [],
  });
}

function cyclePracticeCycles(settings: OperationScopedSettings): OperationScopedSettings {
  const nextCycles = settings.practiceCycles >= 5 ? 1 : settings.practiceCycles + 1;

  return {
    ...settings,
    practiceCycles: nextCycles,
    setsMode: nextCycles > 1 ? 'cycles' : settings.setsMode,
  };
}

function toggleSetsMode(settings: OperationScopedSettings): OperationScopedSettings {
  if (settings.practiceCycles <= 1) {
    return settings;
  }

  return {
    ...settings,
    setsMode: settings.setsMode === 'cycles' ? 'single' : 'cycles',
  };
}

export function applySessionOptionsUpdate(
  state: SessionOptionsState,
  update: SessionOptionsUpdate
): SessionOptionsState {
  if (update.type === 'setOperation') {
    return {
      ...state,
      operation: update.operation,
    };
  }

  if (update.type === 'toggleStartMode') {
    return {
      ...state,
      globalSettings: {
        ...state.globalSettings,
        startMode: state.globalSettings.startMode === 'full' ? 'min' : 'full',
      },
    };
  }

  const targetOperation = state.operation;
  const currentSettings = state.settingsByOperation[targetOperation];
  let nextSettings = currentSettings;

  switch (update.type) {
    case 'cycleProblemOrder':
      nextSettings = {
        ...currentSettings,
        problemOrder: cycleValue(PROBLEM_ORDER_SEQUENCE, currentSettings.problemOrder),
      };
      break;
    case 'cycleOperandOrder':
      nextSettings = {
        ...currentSettings,
        operandOrder: cycleValue(OPERAND_ORDER_SEQUENCE, currentSettings.operandOrder),
      };
      break;
    case 'cycleMissingValue':
      nextSettings = {
        ...currentSettings,
        missingValue: cycleValue(MISSING_VALUE_SEQUENCE, currentSettings.missingValue),
      };
      break;
    case 'cyclePracticeCycles':
      nextSettings = cyclePracticeCycles(currentSettings);
      break;
    case 'toggleSetsMode':
      nextSettings = toggleSetsMode(currentSettings);
      break;
    case 'toggleChip':
      nextSettings = toggleChipSelection(currentSettings, update.value);
      break;
    case 'toggleAllChips':
      nextSettings = toggleAllChipSelection(currentSettings);
      break;
    case 'toggleCustomSet':
      nextSettings = toggleCustomSetSelection(targetOperation, currentSettings, update.customSet);
      break;
    default:
      return state;
  }

  return {
    ...state,
    settingsByOperation: {
      ...state.settingsByOperation,
      [targetOperation]: normalizeScopedSettingsForOperation(targetOperation, nextSettings),
    },
  };
}
