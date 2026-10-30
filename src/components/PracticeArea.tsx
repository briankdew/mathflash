import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, TextInput, type StyleProp, type TextStyle, View } from 'react-native';
import { appStyles as styles } from '../theme/App.styles';
import { theme } from '../theme/colors';
import { ProblemConstellation } from './ProblemConstellation';
import {
  AnswerAttempt,
  AnswerCheckResult,
  ProblemDisplay,
  SessionInputMode,
  SessionOptions,
  SessionPhase,
  VoiceInputState,
} from '../lib/types';
import { usePracticeFeedback } from '../hooks/ui/usePracticeFeedback';
import type { AnswerFeedback } from '../lib/timing/sessionFlow';

interface PracticeAreaProps {
  currentProblem: ProblemDisplay | null;
  options: SessionOptions;
  phase: SessionPhase;
  isActive: boolean;
  isInputEnabled: boolean;
  inputMode: SessionInputMode;
  voiceState: VoiceInputState;
  onCheckAnswer: (attempt: AnswerAttempt, forceComplete: boolean) => AnswerCheckResult;
  onAdvanceProblem: () => void;
  onInputChanged: (val: string) => void;
  onPauseVoiceInput: () => void;
  onResumeVoiceInput: () => void;
  onClearPendingVoiceAttempt: () => void;
  inputValue: string;
  // Set by the new session flow (?core=2), which moves on by itself.
  pace?: 'evaluation';
  answerFeedback?: AnswerFeedback | null;
}

export function PracticeArea({
  currentProblem,
  options,
  phase,
  isActive,
  isInputEnabled,
  inputMode,
  voiceState,
  onCheckAnswer,
  onAdvanceProblem,
  onInputChanged,
  onPauseVoiceInput,
  onResumeVoiceInput,
  onClearPendingVoiceAttempt,
  inputValue,
  pace,
  answerFeedback,
}: PracticeAreaProps) {
  const inputRef = useRef<TextInput>(null);
  const webInputResetStyle: StyleProp<TextStyle> =
    Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0, borderWidth: 0 } as unknown as TextStyle)
      : undefined;
  const {
    shakeTrigger,
    showCorrect,
    showWrongAnswerFill,
    isWrongAnswerDisplayActive,
    displayInputValue,
    isRecoveringWrongAnswerInput,
    resetFeedback,
    applyAnswerResult,
    answerFlash,
    flashAnswer,
  } = usePracticeFeedback({
    inputMode,
    isActive,
    isInputEnabled,
    inputValue,
    onPauseVoiceInput,
    onResumeVoiceInput,
    onInputChanged,
    onAdvanceProblem,
  });

  useEffect(() => {
    if (inputMode === 'keypad' && isActive && isInputEnabled) {
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(focusTimeout);
    }

    inputRef.current?.blur();
    resetFeedback(!isInputEnabled);
    return undefined;
  }, [inputMode, isActive, isInputEnabled, resetFeedback]);

  const processAnswer = useCallback(
    (attempt: AnswerAttempt, forceComplete: boolean) => {
      if (!attempt.value) return;

      const result = onCheckAnswer(attempt, forceComplete);
      if (!pace) {
        applyAnswerResult(attempt.value, result);
      }
    },
    [applyAnswerResult, onCheckAnswer, pace]
  );

  const answerFeedbackId = answerFeedback?.id;
  const answerFeedbackResult = answerFeedback?.result;
  useEffect(() => {
    if (answerFeedbackResult) {
      flashAnswer(answerFeedbackResult);
    }
  }, [answerFeedbackId, answerFeedbackResult, flashAnswer]);

  const handleSubmit = useCallback(() => {
    if (
      !isInputEnabled ||
      inputMode !== 'keypad' ||
      phase !== 'awaitingAnswer' ||
      isRecoveringWrongAnswerInput
    ) {
      return;
    }
    processAnswer(
      {
        problemInstanceId: currentProblem?.problemInstanceId,
        value: inputValue,
        source: 'keypad',
      },
      true
    );
  }, [
    currentProblem,
    inputMode,
    inputValue,
    isInputEnabled,
    isRecoveringWrongAnswerInput,
    phase,
    processAnswer,
  ]);

  const handleInput = useCallback(
    (text: string) => {
      if (!isInputEnabled) return;
      onInputChanged(text);
    },
    [isInputEnabled, onInputChanged]
  );

  useEffect(() => {
    if (
      !isActive ||
      !isInputEnabled ||
      inputMode !== 'keypad' ||
      phase !== 'awaitingAnswer' ||
      isRecoveringWrongAnswerInput
    ) {
      return;
    }
    if (isWrongAnswerDisplayActive) return;
    processAnswer(
      {
        problemInstanceId: currentProblem?.problemInstanceId,
        value: inputValue,
        source: 'keypad',
      },
      false
    );
  }, [
    currentProblem,
    inputMode,
    inputValue,
    isActive,
    isInputEnabled,
    isRecoveringWrongAnswerInput,
    isWrongAnswerDisplayActive,
    phase,
    processAnswer,
  ]);

  useEffect(() => {
    if (
      inputMode !== 'voice' ||
      !isActive ||
      !isInputEnabled ||
      !voiceState.pendingAttempt ||
      (voiceState.pendingAttempt.problemInstanceId !== undefined &&
        voiceState.pendingAttempt.problemInstanceId !==
          currentProblem?.problemInstanceId)
    ) {
      return;
    }

    processAnswer(voiceState.pendingAttempt, true);
    onClearPendingVoiceAttempt();
  }, [
    currentProblem,
    inputMode,
    isActive,
    isInputEnabled,
    onClearPendingVoiceAttempt,
    processAnswer,
    voiceState.pendingAttempt,
  ]);

  return (
    <View style={styles.constellationWrapper}>
      <ProblemConstellation
        problem={currentProblem}
        operation={options.operation}
        startMode={options.startMode}
        phase={phase}
        shakeTrigger={shakeTrigger}
        showWrongAnswer={isWrongAnswerDisplayActive}
        showWrongAnswerFill={showWrongAnswerFill || answerFlash === 'wrong'}
        showCorrectFill={answerFlash === 'correct'}
        showCorrect={showCorrect}
        isActive={isActive}
        renderInput={
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              isWrongAnswerDisplayActive ? { color: theme.dangerText } : null,
              webInputResetStyle,
            ]}
            keyboardType="number-pad"
            value={displayInputValue}
            onChangeText={handleInput}
            onSubmitEditing={handleSubmit}
            editable={inputMode === 'keypad' && isActive && isInputEnabled}
            autoFocus={false}
            showSoftInputOnFocus={false}
            caretHidden={true}
          />
        }
      />
    </View>
  );
}
