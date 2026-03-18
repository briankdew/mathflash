import { useCallback, useEffect, useRef, useState } from 'react';
import { AnswerCheckResult, SessionInputMode } from '../../lib/types';

const WRONG_ANSWER_RECOVERY_DELAY_MS = 400;
const CORRECT_ANSWER_ADVANCE_DELAY_MS = 500;

interface SessionStateSnapshot {
  inputMode: SessionInputMode;
  isActive: boolean;
  isInputEnabled: boolean;
}

interface UsePracticeFeedbackArgs {
  inputMode: SessionInputMode;
  isActive: boolean;
  isInputEnabled: boolean;
  inputValue: string;
  onPauseVoiceInput: () => void;
  onResumeVoiceInput: () => void;
  onInputChanged: (value: string) => void;
  onAdvanceProblem: () => void;
}

export function usePracticeFeedback({
  inputMode,
  isActive,
  isInputEnabled,
  inputValue,
  onPauseVoiceInput,
  onResumeVoiceInput,
  onInputChanged,
  onAdvanceProblem,
}: UsePracticeFeedbackArgs) {
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrongAnswer, setShowWrongAnswer] = useState(false);
  const [showWrongAnswerFill, setShowWrongAnswerFill] = useState(false);
  const [wrongAnswerValue, setWrongAnswerValue] = useState<string | null>(null);
  const wrongAnswerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceProblemTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStateRef = useRef<SessionStateSnapshot>({
    inputMode,
    isActive,
    isInputEnabled,
  });

  useEffect(() => {
    sessionStateRef.current = {
      inputMode,
      isActive,
      isInputEnabled,
    };
  }, [inputMode, isActive, isInputEnabled]);

  const clearTimers = useCallback(() => {
    if (wrongAnswerTimeoutRef.current) {
      clearTimeout(wrongAnswerTimeoutRef.current);
      wrongAnswerTimeoutRef.current = null;
    }
    if (advanceProblemTimeoutRef.current) {
      clearTimeout(advanceProblemTimeoutRef.current);
      advanceProblemTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!showWrongAnswer || wrongAnswerValue === null) {
      return;
    }

    if (inputValue === wrongAnswerValue) {
      return;
    }

    if (
      inputMode === 'keypad' &&
      inputValue.startsWith(wrongAnswerValue) &&
      inputValue.length > wrongAnswerValue.length
    ) {
      const nextAttemptValue = inputValue.slice(wrongAnswerValue.length);
      setShowWrongAnswer(false);
      setShowWrongAnswerFill(false);
      setWrongAnswerValue(null);
      onInputChanged(nextAttemptValue);
      return;
    }

    setShowWrongAnswer(false);
    setShowWrongAnswerFill(false);
    setWrongAnswerValue(null);
  }, [inputMode, inputValue, onInputChanged, showWrongAnswer, wrongAnswerValue]);

  const resetFeedback = useCallback(
    (clearInput: boolean) => {
      clearTimers();
      setShowCorrect(false);
      setShowWrongAnswer(false);
      setShowWrongAnswerFill(false);
      setWrongAnswerValue(null);
      if (clearInput) {
        onInputChanged('');
      }
    },
    [clearTimers, onInputChanged]
  );

  const applyAnswerResult = useCallback(
    (attemptValue: string, result: AnswerCheckResult) => {
      if (showWrongAnswer) {
        setShowWrongAnswer(false);
      }

      if (result === 'wrong') {
        setShowWrongAnswer(true);
        setShowWrongAnswerFill(true);
        setWrongAnswerValue(attemptValue);
        setShowCorrect(false);
        setShakeTrigger(prev => prev + 1);
        onPauseVoiceInput();
        if (wrongAnswerTimeoutRef.current) {
          clearTimeout(wrongAnswerTimeoutRef.current);
        }
        wrongAnswerTimeoutRef.current = setTimeout(() => {
          setShowWrongAnswerFill(false);
          const latestState = sessionStateRef.current;
          if (
            latestState.inputMode === 'voice' &&
            latestState.isActive &&
            latestState.isInputEnabled
          ) {
            onResumeVoiceInput();
          }
          wrongAnswerTimeoutRef.current = null;
        }, WRONG_ANSWER_RECOVERY_DELAY_MS);
        return;
      }

      if (result === 'correct') {
        setShowWrongAnswer(false);
        setShowWrongAnswerFill(false);
        setWrongAnswerValue(null);
        setShowCorrect(true);
        onPauseVoiceInput();
        if (advanceProblemTimeoutRef.current) {
          clearTimeout(advanceProblemTimeoutRef.current);
        }
        advanceProblemTimeoutRef.current = setTimeout(() => {
          onInputChanged('');
          setShowCorrect(false);
          onAdvanceProblem();
          advanceProblemTimeoutRef.current = null;
        }, CORRECT_ANSWER_ADVANCE_DELAY_MS);
      }
    },
    [
      onAdvanceProblem,
      onInputChanged,
      onPauseVoiceInput,
      onResumeVoiceInput,
      showWrongAnswer,
    ]
  );

  const isWrongAnswerDisplayActive =
    showWrongAnswer &&
    wrongAnswerValue !== null &&
    inputValue === wrongAnswerValue;
  const displayInputValue =
    inputMode === 'keypad' &&
    showWrongAnswer &&
    wrongAnswerValue !== null &&
    inputValue.startsWith(wrongAnswerValue) &&
    inputValue.length > wrongAnswerValue.length
      ? inputValue.slice(wrongAnswerValue.length)
      : inputValue;
  const isRecoveringWrongAnswerInput =
    inputMode === 'keypad' &&
    showWrongAnswer &&
    wrongAnswerValue !== null &&
    inputValue.startsWith(wrongAnswerValue) &&
    inputValue.length > wrongAnswerValue.length;

  return {
    shakeTrigger,
    showCorrect,
    showWrongAnswerFill,
    isWrongAnswerDisplayActive,
    displayInputValue,
    isRecoveringWrongAnswerInput,
    resetFeedback,
    applyAnswerResult,
  };
}
