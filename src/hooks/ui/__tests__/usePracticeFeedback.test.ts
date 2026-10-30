import { act, renderHook } from '@testing-library/react-native';
import { usePracticeFeedback } from '../usePracticeFeedback';

function renderFeedback(onAdvanceProblem: () => void) {
  return renderHook(
    (props: { onInputChanged: (value: string) => void }) =>
      usePracticeFeedback({
        inputMode: 'voice',
        isActive: true,
        isInputEnabled: true,
        inputValue: '',
        onPauseVoiceInput: jest.fn(),
        onResumeVoiceInput: jest.fn(),
        onInputChanged: props.onInputChanged,
        onAdvanceProblem,
      }),
    { initialProps: { onInputChanged: jest.fn() } }
  );
}

describe('usePracticeFeedback', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('keeps resetFeedback stable when onInputChanged changes', () => {
    const { result, rerender } = renderFeedback(jest.fn());
    const first = result.current.resetFeedback;

    // The session creates a new onInputChanged whenever the input value changes.
    rerender({ onInputChanged: jest.fn() });

    expect(result.current.resetFeedback).toBe(first);
  });

  it('still advances after a correct answer when onInputChanged changes meanwhile', () => {
    const onAdvanceProblem = jest.fn();
    const { result, rerender } = renderFeedback(onAdvanceProblem);

    act(() => result.current.applyAnswerResult('6', 'correct'));
    rerender({ onInputChanged: jest.fn() });
    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onAdvanceProblem).toHaveBeenCalledTimes(1);
  });

  it('flashes the result briefly without showing the answer or advancing', () => {
    const onAdvanceProblem = jest.fn();
    const { result } = renderFeedback(onAdvanceProblem);

    act(() => result.current.flashAnswer('correct'));
    expect(result.current.answerFlash).toBe('correct');
    expect(result.current.showCorrect).toBe(false);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.answerFlash).toBeNull();
    expect(onAdvanceProblem).not.toHaveBeenCalled();
  });
});
