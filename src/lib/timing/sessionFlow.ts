// The session flow: what is on screen and when to move on
// (docs/timing-core-design.md, section 5). A pure reducer, so every path can be
// tested without a browser. It returns the new state and a list of effects for
// the session runner (`coreSession.ts`) to carry out. Times are never worked
// out here: the runner records events and the scorer reads them afterwards.
//
//   idle -> preparing -> showing(P) -> feedback(P) -> showing(P+1) ... -> done

import { recordCorrectAnswer, recordWrongAnswer } from '../sessionStats';
import { ProblemDisplay, SessionInputMode, SessionStats } from '../types';

export type FlowPhase = 'idle' | 'preparing' | 'showing' | 'feedback' | 'done';

export interface AnswerFeedback {
  /** Different for every answer, so a repeated result still flashes. */
  id: number;
  result: 'correct' | 'wrong';
}

export interface FlowState {
  phase: FlowPhase;
  inputMode: SessionInputMode;
  problem: ProblemDisplay | null;
  /** The next card, held while the recognizer for it gets ready. */
  pendingCard: ProblemDisplay | null;
  /** True when each card needs its own recognizer ready before it shows. */
  cardNeedsListener: boolean;
  prepFinished: boolean;
  listenerReady: boolean;
  isDrawn: boolean;
  isFirstCard: boolean;
  stats: SessionStats;
  totalProblems: number;
  feedback: AnswerFeedback | null;
}

export type FlowAction =
  | {
      type: 'start';
      inputMode: SessionInputMode;
      firstCard: ProblemDisplay;
      totalProblems: number;
      cardNeedsListener: boolean;
    }
  | { type: 'prepFinished' }
  | { type: 'listenerReady' }
  | { type: 'listenerWaitOver' }
  | { type: 'drawn'; problemId: string }
  | { type: 'answer'; value: number; next: ProblemDisplay | null }
  | { type: 'end' }
  | { type: 'reset' };

export type FlowEffect =
  | { type: 'runPrep' }
  | { type: 'startListening' }
  | { type: 'readyListenerForNextCard' }
  | { type: 'waitForListener' }
  | { type: 'cardPresented'; problem: ProblemDisplay; isFirstCard: boolean }
  | { type: 'problemShown'; problem: ProblemDisplay }
  | { type: 'answerChecked'; problemId: string; value: number; correct: boolean }
  | {
      type: 'problemLeft';
      problemId: string;
      reason: 'answered' | 'ended' | 'reset';
    }
  | { type: 'finish' };

export interface FlowStep {
  state: FlowState;
  effects: FlowEffect[];
}

const NO_STATS: SessionStats = { completed: 0, correctFirst: 0, missedFirst: 0 };

export function createFlow(): FlowState {
  return {
    phase: 'idle',
    inputMode: 'keypad',
    problem: null,
    pendingCard: null,
    cardNeedsListener: false,
    prepFinished: false,
    listenerReady: false,
    isDrawn: false,
    isFirstCard: false,
    stats: NO_STATS,
    totalProblems: 0,
    feedback: null,
  };
}

function present(state: FlowState): FlowStep {
  const problem = state.pendingCard;
  if (!problem) {
    return { state, effects: [] };
  }
  const isFirstCard = state.problem === null;
  return {
    state: {
      ...state,
      phase: 'showing',
      problem,
      pendingCard: null,
      isDrawn: false,
      isFirstCard,
    },
    effects: [{ type: 'cardPresented', problem, isFirstCard }],
  };
}

const isWaitingForListener = (state: FlowState) =>
  state.phase === 'feedback' ||
  (state.phase === 'preparing' && state.prepFinished);

// Each answer goes on the right or wrong pile once (D2): both finish the card.
function recordAnswer(stats: SessionStats, correct: boolean): SessionStats {
  return correct
    ? recordCorrectAnswer(stats, true)
    : { ...recordWrongAnswer(stats, true), completed: stats.completed + 1 };
}

export function flowReducer(state: FlowState, action: FlowAction): FlowStep {
  switch (action.type) {
    case 'start':
      return {
        state: {
          ...createFlow(),
          phase: 'preparing',
          inputMode: action.inputMode,
          pendingCard: action.firstCard,
          totalProblems: action.totalProblems,
          cardNeedsListener: action.cardNeedsListener,
          listenerReady: action.inputMode === 'keypad',
        },
        effects:
          action.inputMode === 'voice'
            ? [{ type: 'runPrep' }, { type: 'startListening' }]
            : [{ type: 'runPrep' }],
      };
    case 'prepFinished': {
      if (state.phase !== 'preparing') {
        return { state, effects: [] };
      }
      const next = { ...state, prepFinished: true };
      return next.listenerReady
        ? present(next)
        : { state: next, effects: [{ type: 'waitForListener' }] };
    }
    case 'listenerReady': {
      const next = { ...state, listenerReady: true };
      return isWaitingForListener(next) ? present(next) : { state: next, effects: [] };
    }
    case 'listenerWaitOver':
      return isWaitingForListener(state)
        ? present(state)
        : { state, effects: [] };
    case 'drawn': {
      const { problem } = state;
      if (
        state.phase !== 'showing' ||
        state.isDrawn ||
        problem?.problemInstanceId !== action.problemId
      ) {
        return { state, effects: [] };
      }
      return {
        state: { ...state, isDrawn: true },
        effects: [{ type: 'problemShown', problem }],
      };
    }
    case 'answer': {
      const { problem } = state;
      if (state.phase !== 'showing' || !problem?.problemInstanceId) {
        return { state, effects: [] };
      }
      const problemId = problem.problemInstanceId;
      const correct = action.value === problem.correct;
      const effects: FlowEffect[] = [
        { type: 'answerChecked', problemId, value: action.value, correct },
        { type: 'problemLeft', problemId, reason: 'answered' },
      ];
      const answered: FlowState = {
        ...state,
        phase: 'feedback',
        stats: recordAnswer(state.stats, correct),
        feedback: {
          id: (state.feedback?.id ?? 0) + 1,
          result: correct ? 'correct' : 'wrong',
        },
        pendingCard: action.next,
      };

      if (!action.next) {
        return {
          state: { ...answered, phase: 'done' },
          effects: [...effects, { type: 'finish' }],
        };
      }
      if (answered.cardNeedsListener) {
        return {
          state: { ...answered, listenerReady: false },
          effects: [
            ...effects,
            { type: 'readyListenerForNextCard' },
            { type: 'waitForListener' },
          ],
        };
      }
      const shown = present(answered);
      return { state: shown.state, effects: [...effects, ...shown.effects] };
    }
    case 'end': {
      if (state.phase === 'idle' || state.phase === 'done') {
        return { state, effects: [] };
      }
      const problemId = state.problem?.problemInstanceId;
      return {
        state: { ...state, phase: 'done', pendingCard: null },
        effects:
          state.phase === 'showing' && problemId
            ? [
                { type: 'problemLeft', problemId, reason: 'reset' },
                { type: 'finish' },
              ]
            : [{ type: 'finish' }],
      };
    }
    case 'reset':
      return { state: createFlow(), effects: [] };
    default:
      return { state, effects: [] };
  }
}
