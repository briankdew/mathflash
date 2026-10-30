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

  it('shows the right answer, then the next card, with one recognizer', () => {
    const answered = run(showing(false), {
      type: 'answer',
      value: 8,
      next: card(2),
    });
    expect(answered.types).toEqual([
      'problemShown',
      'answerChecked',
      'problemLeft',
      'holdForCorrect',
    ]);
    expect(answered.state.phase).toBe('feedback');
    expect(answered.state.problem?.problemInstanceId).toBe('s-p1');
    expect(answered.state.feedback).toEqual({ id: 1, result: 'correct', value: 8 });

    const next = run(answered.state, { type: 'holdOver' });
    expect(next.types).toEqual(['cardPresented']);
    expect(next.state.phase).toBe('showing');
    expect(next.state.problem?.problemInstanceId).toBe('s-p2');
    expect(next.state.isFirstCard).toBe(false);
  });

  it('waits for the next recognizer when each card has its own', () => {
    const answered = run(showing(true), {
      type: 'answer',
      value: 8,
      next: card(2),
    });
    expect(answered.state.phase).toBe('feedback');
    expect(answered.types).toEqual([
      'problemShown',
      'answerChecked',
      'problemLeft',
      'holdForCorrect',
      'readyListenerForNextCard',
    ]);
    const ready = run(answered.state, { type: 'listenerReady' });
    expect(ready.state.phase).toBe('feedback');
    const over = run(ready.state, { type: 'holdOver' });
    expect(over.state.phase).toBe('showing');
    expect(over.state.problem?.problemInstanceId).toBe('s-p2');
  });

  it('asks for a short wait when the recognizer is not ready after the pause', () => {
    const answered = run(showing(true), { type: 'answer', value: 8, next: card(2) });
    const over = run(answered.state, { type: 'holdOver' });
    expect(over.types).toEqual(['waitForListener']);
    expect(run(over.state, { type: 'listenerWaitOver' }).state.phase).toBe('showing');
  });

  it('finishes after the last right answer has been shown', () => {
    const last = run(showing(false), { type: 'answer', value: 8, next: null });
    expect(last.state.phase).toBe('feedback');
    expect(last.types).not.toContain('finish');
    const over = run(last.state, { type: 'holdOver' });
    expect(over.state.phase).toBe('done');
    expect(over.types).toEqual(['finish']);
  });

  it('keeps the card after a wrong answer until the right one comes', () => {
    const wrong = run(showing(false), {
      type: 'answer',
      value: 3,
      next: null,
    });
    expect(wrong.state.phase).toBe('showing');
    expect(wrong.state.problem?.problemInstanceId).toBe('s-p1');
    expect(wrong.types).toEqual(['problemShown', 'answerChecked']);
    expect(wrong.effects[1]).toMatchObject({ correct: false, value: 3 });
    expect(wrong.state.feedback).toEqual({ id: 1, result: 'wrong', value: 3 });
    expect(wrong.state.stats).toEqual({
      completed: 0,
      correctFirst: 0,
      missedFirst: 1,
    });

    const again = run(wrong.state, { type: 'answer', value: 4, next: null });
    expect(again.state.stats.missedFirst).toBe(1);

    const answered = run(again.state, { type: 'answer', value: 8, next: card(2) });
    const right = run(answered.state, { type: 'holdOver' });
    expect(right.state.problem?.problemInstanceId).toBe('s-p2');
    expect(right.state.stats).toEqual({
      completed: 1,
      correctFirst: 0,
      missedFirst: 1,
    });
    expect(right.state.missed).toBe(false);
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
      { type: 'answer', value: 3, next: null },
      { type: 'answer', value: 3, next: null }
    );
    expect(answered.state.feedback?.id).toBe(2);
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
