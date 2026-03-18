import {
  applySessionOptionsUpdate,
  defaultOperationSettings,
  getSessionOptions,
  GlobalSessionSettings,
  SettingsByOperation,
  SessionOptionsUpdate,
} from '../../lib/sessionOptions';
import {
  MissedProblem,
  OperationMode,
  ProblemDisplay,
  ProblemSpec,
  SessionInputMode,
  SessionOptions,
  SessionPerformanceReport,
  SessionPhase,
  SessionStats,
} from '../../lib/types';

export interface SessionState {
  operation: OperationMode;
  settingsByOperation: SettingsByOperation;
  globalSettings: GlobalSessionSettings;
  phase: SessionPhase;
  isActive: boolean;
  isInputEnabled: boolean;
  isStadiumActive: boolean;
  inputMode: SessionInputMode;
  voiceListeningArmed: boolean;
  sessionId: string;
  sessionStart: Date | null;
  queue: ProblemSpec[];
  currentProblem: ProblemDisplay | null;
  stats: SessionStats;
  missedProblems: MissedProblem[];
  totalProblems: number;
  sessionPerformanceReport: SessionPerformanceReport | null;
  isPerformanceReportVisible: boolean;
}

export type SessionEffect =
  | 'schedulePrep'
  | 'presentNextProblem'
  | 'finalizeSession'
  | 'none';

export type SessionAction =
  | { type: 'applyOptionsUpdate'; update: SessionOptionsUpdate }
  | { type: 'setUseTimer'; value: boolean }
  | { type: 'setInputMode'; inputMode: SessionInputMode }
  | { type: 'setVoiceListeningArmed'; value: boolean }
  | {
      type: 'prepareSession';
      sessionId: string;
      sessionStart: Date;
      queue: ProblemSpec[];
      totalProblems: number;
    }
  | { type: 'setPhase'; phase: SessionPhase }
  | { type: 'setIsInputEnabled'; value: boolean }
  | { type: 'setIsStadiumActive'; value: boolean }
  | { type: 'setCurrentProblem'; problem: ProblemDisplay | null; phase?: SessionPhase }
  | { type: 'setQueue'; queue: ProblemSpec[] }
  | { type: 'setStats'; stats: SessionStats }
  | { type: 'setMissedProblems'; missedProblems: MissedProblem[] }
  | {
      type: 'completeSession';
      report: SessionPerformanceReport | null;
      showPerformanceReport: boolean;
    }
  | { type: 'openPerformanceReport' }
  | { type: 'closePerformanceReport' };

export function createInitialSessionState(): SessionState {
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
    phase: 'idle',
    isActive: false,
    isInputEnabled: false,
    isStadiumActive: true,
    inputMode: 'keypad',
    voiceListeningArmed: false,
    sessionId: '',
    sessionStart: null,
    queue: [],
    currentProblem: null,
    stats: { completed: 0, correctFirst: 0, missedFirst: 0 },
    missedProblems: [],
    totalProblems: 0,
    sessionPerformanceReport: null,
    isPerformanceReportVisible: false,
  };
}

export function getSessionOptionsFromState(state: SessionState): SessionOptions {
  return getSessionOptions(
    state.operation,
    state.settingsByOperation,
    state.globalSettings
  );
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'applyOptionsUpdate': {
      const nextState = applySessionOptionsUpdate(
        {
          operation: state.operation,
          settingsByOperation: state.settingsByOperation,
          globalSettings: state.globalSettings,
        },
        action.update
      );

      return {
        ...state,
        operation: nextState.operation,
        settingsByOperation: nextState.settingsByOperation,
        globalSettings: nextState.globalSettings,
      };
    }
    case 'setUseTimer':
      return {
        ...state,
        globalSettings: {
          ...state.globalSettings,
          useTimer: action.value,
        },
      };
    case 'setInputMode':
      return {
        ...state,
        inputMode: action.inputMode,
        voiceListeningArmed: false,
      };
    case 'setVoiceListeningArmed':
      return {
        ...state,
        voiceListeningArmed: action.value,
      };
    case 'prepareSession':
      return {
        ...state,
        phase: 'preparing',
        isActive: true,
        isInputEnabled: false,
        isStadiumActive: true,
        voiceListeningArmed: false,
        sessionId: action.sessionId,
        sessionStart: action.sessionStart,
        queue: action.queue,
        currentProblem: null,
        stats: { completed: 0, correctFirst: 0, missedFirst: 0 },
        missedProblems: [],
        totalProblems: action.totalProblems,
        sessionPerformanceReport: null,
        isPerformanceReportVisible: false,
      };
    case 'setPhase':
      return {
        ...state,
        phase: action.phase,
      };
    case 'setIsInputEnabled':
      return {
        ...state,
        isInputEnabled: action.value,
      };
    case 'setIsStadiumActive':
      return {
        ...state,
        isStadiumActive: action.value,
      };
    case 'setCurrentProblem':
      return {
        ...state,
        currentProblem: action.problem,
        phase: action.phase ?? state.phase,
      };
    case 'setQueue':
      return {
        ...state,
        queue: action.queue,
      };
    case 'setStats':
      return {
        ...state,
        stats: action.stats,
      };
    case 'setMissedProblems':
      return {
        ...state,
        missedProblems: action.missedProblems,
      };
    case 'completeSession':
      return {
        ...state,
        phase: 'idle',
        isActive: false,
        isInputEnabled: false,
        isStadiumActive: true,
        voiceListeningArmed: false,
        queue: [],
        currentProblem: null,
        sessionPerformanceReport: action.report,
        isPerformanceReportVisible: action.showPerformanceReport,
      };
    case 'openPerformanceReport':
      return state.sessionPerformanceReport
        ? { ...state, isPerformanceReportVisible: true }
        : state;
    case 'closePerformanceReport':
      return {
        ...state,
        isPerformanceReportVisible: false,
      };
    default:
      return state;
  }
}
