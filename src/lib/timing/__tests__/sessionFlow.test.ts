import {
  createFlow,
  FlowAction,
  FlowEffect,
  flowReducer,
  FlowState,
} from '../sessionFlow';
import { ProblemDisplay } from '../../types';

const card = (index: number, correct = 8): ProblemDisplay => ({
  problemInstanceId: `s-p${index}`,
  problemIndex: index,
  left: 3,
  right: 5,
  result: correct,
  missing: 'result',
  correct,
});

function run(state: FlowState, ...actions: FlowAction[]) {
  const effects: FlowEffect[] = [];
  let current = state;
  actions.forEach(action => {
    const step = flowReducer(current, action);
    current = step.state;
    effects.push(...step.effects);
  });
  return { state: current, effects, types: effects.map(effect => effect.type) };
}

const start = (cardNeedsListener: boolean, inputMode: 'voice' | 'keypad' = 'voice') =>
  ({
    type: 'start',
    inputMode,
    firstCard: card(1),
    totalProblems: 3,
    cardNeedsListener,
  }) as FlowAction;

describe('sessionFlow start', () => {
  it('listens during the opening animation and shows card 1 when ready', () => {
    const begun = run(createFlow(), start(true));
    expect(begun.state.phase).toBe('preparing');
    expect(begun.types).toEqual(['runPrep', 'startListening']);

    const shown = run(begun.state, { type: 'listenerReady' }, { type: 'prepFinished' });
    expect(shown.state.phase).toBe('showing');
    expect(shown.types).toEqual(['cardPresented']);
    expect(shown.state.isFirstCard).toBe(true);
  });

  it('holds card 1 until the recognizer is ready', () => {
    const waiting = run(createFlow(), start(true), { type: 'prepFinished' });
    expect(waiting.state.phase).toBe('preparing');
    expect(waiting.types).toContain('waitForListener');

    const shown = run(waiting.state, { type: 'listenerReady' });
    expect(shown.state.phase).toBe('showing');
  });

  it('never holds card 1 for long', () => {
    const waiting = run(createFlow(), start(true), { type: 'prepFinished' });
    const shown = run(waiting.state, { type: 'listenerWaitOver' });
    expect(shown.state.phase).toBe('showing');
  });

  it('does not show a card before the opening animation ends', () => {
    const early = run(createFlow(), start(true), { type: 'listenerReady' });
    expect(early.state.phase).toBe('preparing');
    expect(early.types).not.toContain('cardPresented');
  });

  it('keypad needs no recognizer', () => {
    const keypad = run(createFlow(), start(false, 'keypad'), { type: 'prepFinished' });
    expect(keypad.state.phase).toBe('showing');
    expect(keypad.types).toEqual(['runPrep', 'cardPresented']);
  });
});

describe('sessionFlow answers', () => {
  const showing = (cardNeedsListener: boolean) =>
    run(
      createFlow(),
      start(cardNeedsListener),
      { type: 'listenerReady' },
      { type: 'prepFinished' }
    ).state;

  it('shows the next card at once with one recognizer for the session', () => {
    const answered = run(showing(false), {
      type: 'answer',
      value: 8,
      next: card(2),
    });
    expect(answered.types).toEqual([
      'answerChecked',
      'problemLeft',
      'cardPresented',
    ]);
    expect(answered.state.phase).toBe('showing');
    expect(answered.state.problem?.problemInstanceId).toBe('s-p2');
    expect(answered.state.isFirstCard).toBe(false);
    expect(answered.state.feedback).toEqual({ id: 1, result: 'correct' });
  });

  it('waits for the next recognizer when each card has its own', () => {
    const answered = run(showing(true), {
      type: 'answer',
      value: 8,
      next: card(2),
    });
    expect(answered.state.phase).toBe('feedback');
    expect(answered.types).toEqual([
      'answerChecked',
      'problemLeft',
      'readyListenerForNextCard',
      'waitForListener',
    ]);
    const ready = run(answered.state, { type: 'listenerReady' });
    expect(ready.state.phase).toBe('showing');
    expect(ready.state.problem?.problemInstanceId).toBe('s-p2');
  });

  it('moves on after a wrong answer and counts it once (D2)', () => {
    const answered = run(showing(false), {
      type: 'answer',
      value: 3,
      next: card(2),
    });
    expect(answered.state.problem?.problemInstanceId).toBe('s-p2');
    expect(answered.state.stats).toEqual({
      completed: 1,
      correctFirst: 0,
      missedFirst: 1,
    });
    expect(answered.effects[0]).toMatchObject({ correct: false, value: 3 });
    expect(answered.state.feedback?.result).toBe('wrong');
  });

  it('ignores a second answer while the next card is on its way', () => {
    const answered = run(
      showing(true),
      { type: 'answer', value: 8, next: card(2) },
      { type: 'answer', value: 8, next: card(3) }
    );
    expect(answered.state.stats.completed).toBe(1);
    expect(answered.state.pendingCard?.problemInstanceId).toBe('s-p2');
  });

  it('gives each answer its own feedback id', () => {
    const answered = run(
      showing(false),
      { type: 'answer', value: 8, next: card(2) },
      { type: 'answer', value: 8, next: card(3) }
    );
    expect(answered.state.feedback?.id).toBe(2);
  });

  it('finishes after the last card', () => {
    const answered = run(showing(false), { type: 'answer', value: 8, next: null });
    expect(answered.state.phase).toBe('done');
    expect(answered.types).toEqual(['answerChecked', 'problemLeft', 'finish']);
  });
});

describe('sessionFlow drawing and ending', () => {
  const showing = () =>
    run(
      createFlow(),
      start(false),
      { type: 'listenerReady' },
      { type: 'prepFinished' }
    ).state;

  it('records a card as shown once, and only the card on screen', () => {
    const drawn = run(
      showing(),
      { type: 'drawn', problemId: 'other' },
      { type: 'drawn', problemId: 's-p1' },
      { type: 'drawn', problemId: 's-p1' }
    );
    expect(drawn.types).toEqual(['problemShown']);
  });

  it('marks the card left when the session is ended early', () => {
    const ended = run(showing(), { type: 'end' });
    expect(ended.state.phase).toBe('done');
    expect(ended.effects).toEqual([
      { type: 'problemLeft', problemId: 's-p1', reason: 'reset' },
      { type: 'finish' },
    ]);
  });

  it('can end during the opening animation', () => {
    const ended = run(createFlow(), start(true), { type: 'end' });
    expect(ended.types).toEqual(['runPrep', 'startListening', 'finish']);
  });

  it('ends only once', () => {
    const ended = run(showing(), { type: 'end' }, { type: 'end' });
    expect(ended.types.filter(type => type === 'finish')).toHaveLength(1);
  });

  it('a late answer after the end does nothing', () => {
    const ended = run(showing(), { type: 'end' }, {
      type: 'answer',
      value: 8,
      next: null,
    });
    expect(ended.types.filter(type => type === 'finish')).toHaveLength(1);
    expect(ended.state.stats.completed).toBe(0);
  });
});
