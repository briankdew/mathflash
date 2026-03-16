import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { appStyles as styles } from '../theme/App.styles';
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

const WRONG_ANSWER_CLEAR_DELAY_MS = 400;
const CORRECT_ANSWER_ADVANCE_DELAY_MS = 500;

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
  inputValue
}: PracticeAreaProps) {
  const inputRef = useRef<TextInput>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const clearInputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceProblemTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInputChangedRef = useRef(onInputChanged);
  const onAdvanceProblemRef = useRef(onAdvanceProblem);
  const onResumeVoiceInputRef = useRef(onResumeVoiceInput);
  const sessionStateRef = useRef({
    inputMode,
    isActive,
    isInputEnabled,
  });

  useEffect(() => {
    onInputChangedRef.current = onInputChanged;
  }, [onInputChanged]);

  useEffect(() => {
    onAdvanceProblemRef.current = onAdvanceProblem;
  }, [onAdvanceProblem]);

  useEffect(() => {
    onResumeVoiceInputRef.current = onResumeVoiceInput;
  }, [onResumeVoiceInput]);

  useEffect(() => {
    sessionStateRef.current = {
      inputMode,
      isActive,
      isInputEnabled,
    };
  }, [inputMode, isActive, isInputEnabled]);

  // Auto-focus when active
  useEffect(() => {
    if (inputMode === 'keypad' && isActive && isInputEnabled) {
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(focusTimeout);
    }

    if (clearInputTimeoutRef.current) {
      clearTimeout(clearInputTimeoutRef.current);
      clearInputTimeoutRef.current = null;
    }
    if (advanceProblemTimeoutRef.current) {
      clearTimeout(advanceProblemTimeoutRef.current);
      advanceProblemTimeoutRef.current = null;
    }
    setShowCorrect(false);
    inputRef.current?.blur();
    if (!isInputEnabled) {
      onInputChangedRef.current('');
    }
  }, [inputMode, isActive, isInputEnabled]);

  useEffect(() => {
    return () => {
      if (clearInputTimeoutRef.current) {
        clearTimeout(clearInputTimeoutRef.current);
        clearInputTimeoutRef.current = null;
      }
      if (advanceProblemTimeoutRef.current) {
        clearTimeout(advanceProblemTimeoutRef.current);
        advanceProblemTimeoutRef.current = null;
      }
    };
  }, []);

  const processAnswer = (attempt: AnswerAttempt, forceComplete: boolean) => {
    if (!attempt.value) return;
    const res = onCheckAnswer(attempt, forceComplete);

    if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      onPauseVoiceInput();
      if (clearInputTimeoutRef.current) {
        clearTimeout(clearInputTimeoutRef.current);
      }
      clearInputTimeoutRef.current = setTimeout(() => {
        onInputChangedRef.current('');
        const latestState = sessionStateRef.current;
        if (latestState.inputMode === 'voice' && latestState.isActive && latestState.isInputEnabled) {
          onResumeVoiceInputRef.current();
        }
        clearInputTimeoutRef.current = null;
      }, WRONG_ANSWER_CLEAR_DELAY_MS);
    } else if (res === 'correct') {
      setShowCorrect(true);
      onPauseVoiceInput();
      if (advanceProblemTimeoutRef.current) {
        clearTimeout(advanceProblemTimeoutRef.current);
      }
      advanceProblemTimeoutRef.current = setTimeout(() => {
        onInputChangedRef.current('');
        setShowCorrect(false);
        onAdvanceProblemRef.current();
        advanceProblemTimeoutRef.current = null;
      }, CORRECT_ANSWER_ADVANCE_DELAY_MS);
    }
  };

  const handleSubmit = () => {
    if (!isInputEnabled || inputMode !== 'keypad') return;
    processAnswer({
      problemInstanceId: currentProblem?.problemInstanceId,
      value: inputValue,
      source: 'keypad',
    }, true);
  };

  const handleInput = (text: string) => {
    if (!isInputEnabled) return;
    onInputChanged(text);
  };

  useEffect(() => {
    if (!isActive || !isInputEnabled || inputMode !== 'keypad') return;
    processAnswer({
      problemInstanceId: currentProblem?.problemInstanceId,
      value: inputValue,
      source: 'keypad',
    }, false);
  }, [currentProblem?.problemInstanceId, inputMode, inputValue, isActive, isInputEnabled]);

  useEffect(() => {
    if (
      inputMode !== 'voice' ||
      !isActive ||
      !isInputEnabled ||
      !voiceState.pendingAttempt ||
      (
        voiceState.pendingAttempt.problemInstanceId !== undefined &&
        voiceState.pendingAttempt.problemInstanceId !== currentProblem?.problemInstanceId
      )
    ) {
      return;
    }

    processAnswer(voiceState.pendingAttempt, true);
    onClearPendingVoiceAttempt();
  }, [
    inputMode,
    isActive,
    isInputEnabled,
    currentProblem?.problemInstanceId,
    onClearPendingVoiceAttempt,
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
        showCorrect={showCorrect}
        isActive={isActive}
        renderInput={
          <TextInput
            ref={inputRef}
            // Explicit cast to bypass React Native Web's missing strict 'outline' typing
            style={[styles.textInput, { outline: 'none' } as any]}
            keyboardType="number-pad"
            value={inputValue}
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
