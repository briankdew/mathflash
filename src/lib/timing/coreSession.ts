// Runs one session of the new timing core (docs/timing-core-design.md). It
// connects the recorder, recognizer, accept rules, listening controller and
// session flow, and carries out what the flow asks for. No React here, so a
// whole session can be tested with a fake clock and a fake recognizer.

import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';
import { expoSpeechRecognitionAdapter } from '../expoSpeechRecognitionAdapter';
import { MathEngine } from '../MathEngine';
import { recordingWebRecognizer } from '../recordingWebRecognizer';
import { getSessionPrepSchedule } from '../sessionPrepTimeline';
import {
  createProblemDisplay,
  createSessionQueue,
  resolveNextProblem,
} from '../sessionProgression';
import {
  ProblemDisplay,
  ProblemSpec,
  SessionInputMode,
  SessionOptions,
  SessionPerformanceReport,
} from '../types';
import {
  getBuildName,
  logVoiceDebug,
  setVoiceDebugReportSection,
} from '../voiceDebugLog';
import {
  describeVoiceExperiments,
  getVoiceExperiments,
  isWebKitSpeechEngine,
  VoiceExperiments,
} from '../voiceExperiments';
import {
  getVoiceAcceptedAnswerRange,
  getVoiceAnswerRange,
} from '../voiceNumberNormalization';
import {
  AcceptedAnswer,
  AccepterInput,
  AccepterNotice,
  AccepterState,
  createAccepter,
  stepAccepter,
} from './answerAccepter';
import {
  createListeningController,
  ListeningStatus,
} from './listeningController';
import { score, ScoredSession } from './scorer';
import { scoredToReport } from './scoredToReport';
import {
  createFlow,
  FlowAction,
  FlowEffect,
  flowReducer,
  FlowState,
} from './sessionFlow';
import { SessionEvent } from './sessionRecord';
import {
  RecorderDraft,
  sessionRecorder,
  SessionRecorder,
} from './sessionRecorder';
import { deviceOf } from './voiceLogToRecord';

// How long a card waits for its recognizer before showing anyway.
export const LISTENER_WAIT_MS = 500;

const NOTICE_TEXT: Record<AccepterNotice, string> = {
  number_only: 'Say a number only',
  whole_number: 'Say the whole number',
};

const QUIET: ListeningStatus = {
  isListening: false,
  statusLabel: null,
  errorMessage: '',
};

export interface CoreSnapshot {
  flow: FlowState;
  isStadiumActive: boolean;
  listening: ListeningStatus;
  notice: string | null;
  preview: string;
  report: SessionPerformanceReport | null;
  isReportVisible: boolean;
}

export interface CoreRecognizer {
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
  subscribe: (listener: (event: SessionEvent) => void) => () => void;
}

interface CoreSessionDeps {
  recorder: SessionRecorder;
  recognizer: CoreRecognizer;
  /** Null when voice is ready, otherwise what to tell the user. */
  prepareVoice: () => Promise<string | null>;
  releaseMic: () => void;
  experiments: () => VoiceExperiments;
  isWebKit: () => boolean;
  now: () => number;
}

export interface StartArgs {
  inputMode: SessionInputMode;
  options: SessionOptions;
}

async function prepareWebVoice(): Promise<string | null> {
  if (globalThis.window?.isSecureContext !== true) {
    return 'Use localhost or HTTPS';
  }
  if (!expoSpeechRecognitionAdapter.isRecognitionAvailable()) {
    return 'Browser speech unavailable';
  }
  const permission = await expoSpeechRecognitionAdapter.requestPermissionsAsync();
  return permission.granted ? null : 'Microphone permission needed';
}

function describeEvent(event: SessionEvent): string {
  switch (event.kind) {
    case 'rec.result':
      return `recId=${event.recId} index=${event.resultIndex ?? '?'} ${
        event.isFinal ? 'final' : 'interim'
      } "${event.text}"`;
    case 'rec.error':
      return `recId=${event.recId} ${event.code}`;
    case 'rec.requested':
    case 'rec.started':
    case 'rec.ended':
    case 'rec.speechstart':
    case 'rec.speechend':
      return `recId=${event.recId}`;
    case 'problem.shown':
      return `${event.problemId} missing=${event.spec.missing} answer=${event.spec.correct}`;
    case 'problem.left':
      return `${event.problemId} ${event.reason}`;
    case 'answer.accepted':
      return `${event.value} via ${event.via}`;
    case 'answer.checked':
      return `${event.value} ${event.correct ? 'correct' : 'wrong'}`;
    default:
      return '';
  }
}

export function createCoreSession(deps: CoreSessionDeps) {
  const { recorder, recognizer } = deps;

  let snapshot: CoreSnapshot = {
    flow: createFlow(),
    isStadiumActive: true,
    listening: QUIET,
    notice: null,
    preview: '',
    report: null,
    isReportVisible: false,
  };
  const subscribers = new Set<() => void>();
  let accepter: AccepterState = createAccepter(null);
  let listening: ReturnType<typeof createListeningController> | null = null;
  let options: SessionOptions | null = null;
  let queue: ProblemSpec[] = [];
  let cyclesRemaining = 0;
  let problemCounter = 0;
  let sessionId = '';
  let lastScored: ScoredSession | null = null;

  const pendingActions: FlowAction[] = [];
  let isDraining = false;
  let prepTimers: ReturnType<typeof setTimeout>[] = [];
  let acceptTimer: ReturnType<typeof setTimeout> | null = null;
  let listenerTimer: ReturnType<typeof setTimeout> | null = null;

  function update(change: Partial<CoreSnapshot>) {
    snapshot = { ...snapshot, ...change };
    subscribers.forEach(subscriber => subscriber());
  }

  function append(draft: RecorderDraft) {
    const event = recorder.append(draft);
    logVoiceDebug(event.kind, describeEvent(event));
    return event;
  }

  function clearListenerTimer() {
    if (listenerTimer) clearTimeout(listenerTimer);
    listenerTimer = null;
  }

  function clearTimers() {
    prepTimers.forEach(clearTimeout);
    prepTimers = [];
    if (acceptTimer) clearTimeout(acceptTimer);
    acceptTimer = null;
    clearListenerTimer();
  }

  function takeNextCard(): ProblemDisplay | null {
    if (!options) {
      return null;
    }
    const resolution = resolveNextProblem(queue, cyclesRemaining, options);
    if (resolution.type === 'end') {
      return null;
    }
    queue = resolution.queue;
    cyclesRemaining = resolution.cyclesRemaining;
    problemCounter += 1;
    const problem = createProblemDisplay(resolution.problem, options);
    problem.problemIndex = problemCounter;
    problem.problemInstanceId = `${sessionId}-p${problemCounter}`;
    return problem;
  }

  function finish() {
    feed({ type: 'problem', problem: null });
    clearTimers();
    listening?.stop();
    listening = null;
    deps.releaseMic();
    lastScored = score(recorder.getRecord());
    const report = options
      ? scoredToReport(lastScored, options.operation)
      : null;
    update({
      flow: createFlow(),
      isStadiumActive: true,
      listening: QUIET,
      notice: null,
      preview: '',
      report,
      isReportVisible:
        Boolean(options?.autoShowPerformanceReport) && report !== null,
    });
  }

  function runPrep() {
    if (!options) {
      return;
    }
    const schedule = getSessionPrepSchedule(options.startMode);
    prepTimers = [
      setTimeout(
        () => update({ isStadiumActive: false }),
        schedule.stadiumHideAtMs
      ),
      setTimeout(
        () => dispatch({ type: 'prepFinished' }),
        schedule.firstProblemAtMs
      ),
    ];
  }

  function feed(input: AccepterInput) {
    const step = stepAccepter(accepter, input);
    accepter = step.state;
    if (step.timer !== undefined) {
      if (acceptTimer) clearTimeout(acceptTimer);
      acceptTimer = step.timer
        ? setTimeout(() => {
            acceptTimer = null;
            feed({ type: 'timer' });
          }, step.timer.ms)
        : null;
    }
    if (step.preview !== undefined && step.preview !== snapshot.preview) {
      update({ preview: step.preview });
    }
    if (step.notice) {
      update({ notice: NOTICE_TEXT[step.notice] });
    }
    if (step.accepted) {
      handleVoiceAnswer(step.accepted);
    }
  }

  function handleVoiceAnswer(answer: AcceptedAnswer) {
    append({
      kind: 'answer.accepted',
      problemId: answer.problemId,
      value: answer.value,
      via: answer.via,
      recId: answer.recId,
      resultSeq: answer.resultSeq,
      alternative: answer.alternative,
      ...(answer.onsetSeq === undefined ? {} : { onsetSeq: answer.onsetSeq }),
    });
    feed({ type: 'problem', problem: null });
    dispatch({ type: 'answer', value: answer.value, next: takeNextCard() });
  }

  function presentCard(problem: ProblemDisplay) {
    clearListenerTimer();
    update({ notice: null });
    if (snapshot.flow.inputMode !== 'voice' || !options) {
      return;
    }
    feed({
      type: 'problem',
      problem: {
        problemId: problem.problemInstanceId ?? '',
        acceptedRange: getVoiceAcceptedAnswerRange(problem, options.operation),
        answerRange: getVoiceAnswerRange(problem, options.operation),
      },
    });
  }

  function runEffect(effect: FlowEffect) {
    switch (effect.type) {
      case 'runPrep':
        runPrep();
        break;
      case 'startListening':
        listening?.start();
        break;
      case 'readyListenerForNextCard':
        listening?.readyForNextCard();
        break;
      case 'waitForListener':
        clearListenerTimer();
        listenerTimer = setTimeout(() => {
          listenerTimer = null;
          dispatch({ type: 'listenerWaitOver' });
        }, LISTENER_WAIT_MS);
        break;
      case 'cardPresented':
        presentCard(effect.problem);
        break;
      case 'problemShown': {
        const { problem } = effect;
        append({
          kind: 'problem.shown',
          problemId: problem.problemInstanceId ?? '',
          index: problem.problemIndex ?? 0,
          spec: {
            left: problem.left,
            right: problem.right,
            result: problem.result,
            missing: problem.missing,
            correct: problem.correct,
          },
        });
        break;
      }
      case 'answerChecked':
        append({
          kind: 'answer.checked',
          problemId: effect.problemId,
          value: effect.value,
          correct: effect.correct,
        });
        break;
      case 'problemLeft':
        append({
          kind: 'problem.left',
          problemId: effect.problemId,
          reason: effect.reason,
        });
        break;
      case 'finish':
        finish();
        break;
      default:
        break;
    }
  }

  // Effects can lead to more actions; those wait their turn, so effects always
  // run in the order the flow asked for them.
  function dispatch(action: FlowAction) {
    pendingActions.push(action);
    if (isDraining) {
      return;
    }
    isDraining = true;
    while (pendingActions.length > 0) {
      const next = pendingActions.shift() as FlowAction;
      const step = flowReducer(snapshot.flow, next);
      if (step.state !== snapshot.flow) {
        update({ flow: step.state });
      }
      step.effects.forEach(runEffect);
    }
    isDraining = false;
  }

  function handleRecognizerEvent(event: SessionEvent) {
    logVoiceDebug(event.kind, describeEvent(event));
    listening?.handleEvent(event);
    switch (event.kind) {
      case 'rec.speechstart':
        feed({ type: 'speechstart' });
        break;
      case 'rec.speechend':
        feed({ type: 'speechend' });
        break;
      case 'rec.ended':
        feed({ type: 'ended', recId: event.recId });
        break;
      case 'rec.result':
        feed({
          type: 'result',
          recId: event.recId,
          resultIndex: event.resultIndex,
          text: event.text,
          alternatives: event.alternatives,
          isFinal: event.isFinal,
          seq: event.seq,
        });
        break;
      default:
        break;
    }
  }

  recognizer.subscribe(handleRecognizerEvent);

  setVoiceDebugReportSection(() => {
    const record = recorder.getRecord();
    if (record.events.length === 0) {
      return '';
    }
    return [
      `session record: ${JSON.stringify(record)}`,
      `scored: ${JSON.stringify(lastScored ?? score(record))}`,
    ].join('\n');
  });

  return {
    getSnapshot: () => snapshot,

    subscribe(subscriber: () => void) {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },

    // Returns what to tell the user if the session could not start.
    async start({ inputMode, options: sessionOptions }: StartArgs) {
      if (snapshot.flow.phase !== 'idle') {
        return null;
      }
      clearTimers();
      if (inputMode === 'voice') {
        const problem = await deps.prepareVoice();
        if (problem) {
          update({ listening: { ...QUIET, errorMessage: problem } });
          return problem;
        }
      }

      const pool = MathEngine.getFilteredPool(sessionOptions);
      if (pool.length === 0) {
        console.warn('No Problem Set Selected');
        return null;
      }

      const experiments = deps.experiments();
      const setup = createSessionQueue(pool, sessionOptions);
      options = sessionOptions;
      queue = setup.initialQueue;
      cyclesRemaining = setup.cyclesRemaining;
      problemCounter = 0;
      sessionId = `mf-${Date.now().toString(36)}`;
      lastScored = null;
      accepter = createAccepter(experiments.stableInterimMs);
      listening =
        inputMode === 'voice'
          ? createListeningController({
              recognizer,
              continuous: experiments.continuous,
              minGapMs: experiments.delayMs,
              now: deps.now,
              onListenerReady: () => dispatch({ type: 'listenerReady' }),
              onStatus: status => update({ listening: status }),
            })
          : null;

      recorder.reset();
      const userAgent = globalThis.navigator?.userAgent ?? '';
      append({
        kind: 'session.started',
        device: deviceOf(userAgent),
        browser: userAgent,
        engine: deps.isWebKit() ? 'webkit' : 'chrome',
        build: getBuildName(),
        experiments: describeVoiceExperiments().split(' '),
        inputMode,
        pace: 'evaluation',
        settings: { ...sessionOptions },
      });

      const firstCard = takeNextCard();
      if (!firstCard) {
        return null;
      }
      update({
        report: null,
        isReportVisible: false,
        isStadiumActive: true,
        notice: null,
        preview: '',
        listening: QUIET,
      });
      dispatch({
        type: 'start',
        inputMode,
        firstCard,
        totalProblems: setup.totalProblems,
        cardNeedsListener: inputMode === 'voice' && !experiments.continuous,
      });
      return null;
    },

    keyDigit(digit: string) {
      if (snapshot.flow.phase === 'showing') {
        append({ kind: 'key.digit', digit });
      }
    },

    keyClear() {
      if (snapshot.flow.phase === 'showing') {
        append({ kind: 'key.clear' });
      }
    },

    submitKeypad(problemId: string | undefined, value: number) {
      const { phase, problem } = snapshot.flow;
      if (phase !== 'showing' || problem?.problemInstanceId !== problemId) {
        return;
      }
      append({
        kind: 'answer.accepted',
        problemId: problemId ?? '',
        value,
        via: 'keypad',
      });
      dispatch({ type: 'answer', value, next: takeNextCard() });
    },

    problemDrawn(problemId: string) {
      dispatch({ type: 'drawn', problemId });
    },

    end() {
      dispatch({ type: 'end' });
    },

    openReport() {
      if (snapshot.report) {
        update({ isReportVisible: true });
      }
    },

    closeReport() {
      update({ isReportVisible: false });
    },
  };
}

export type CoreSession = ReturnType<typeof createCoreSession>;

let instance: CoreSession | null = null;

export function getCoreSession(): CoreSession {
  instance =
    instance ??
    createCoreSession({
      recorder: sessionRecorder,
      recognizer: recordingWebRecognizer,
      prepareVoice: prepareWebVoice,
      releaseMic: () => expoSpeechRecognitionAdapter.releaseMic?.(),
      experiments: getVoiceExperiments,
      isWebKit: isWebKitSpeechEngine,
      now: () => globalThis.performance?.now() ?? Date.now(),
    });
  return instance;
}
