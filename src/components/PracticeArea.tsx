import React, { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { appStyles as styles } from '../theme/App.styles';
import { ProblemConstellation } from './ProblemConstellation';
import {
  AnswerCheckResult,
  ProblemDisplay,
  SessionOptions,
  SessionPhase,
} from '../lib/types';

const WRONG_ANSWER_CLEAR_DELAY_MS = 400;
const CORRECT_ANSWER_ADVANCE_DELAY_MS = 500;

interface PracticeAreaProps {
  currentProblem: ProblemDisplay | null;
  options: SessionOptions;
  phase: SessionPhase;
  isActive: boolean;
  isInputEnabled: boolean;
  onCheckAnswer: (forceComplete: boolean) => AnswerCheckResult;
  onAdvanceProblem: () => void;
  onInputChanged: (val: string) => void;
  inputValue: string;
}

export function PracticeArea({
  currentProblem,
  options,
  phase,
  isActive,
  isInputEnabled,
  onCheckAnswer,
  onAdvanceProblem,
  onInputChanged,
  inputValue
}: PracticeAreaProps) {
  const inputRef = useRef<TextInput>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const clearInputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceProblemTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus when active
  React.useEffect(() => {
    if (isActive && isInputEnabled) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
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
        onInputChanged('');
      }
    }
  }, [isActive, isInputEnabled, onInputChanged]);

  React.useEffect(() => {
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

  const processAnswer = (forceComplete: boolean) => {
    if (!inputValue) return;
    const res = onCheckAnswer(forceComplete);

    if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      if (clearInputTimeoutRef.current) {
        clearTimeout(clearInputTimeoutRef.current);
      }
      clearInputTimeoutRef.current = setTimeout(() => {
        onInputChanged('');
        clearInputTimeoutRef.current = null;
      }, WRONG_ANSWER_CLEAR_DELAY_MS);
    } else if (res === 'correct') {
      setShowCorrect(true);
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
  };

  const handleSubmit = () => {
    if (!isInputEnabled) return;
    processAnswer(true);
  };

  const handleInput = (text: string) => {
    if (!isInputEnabled) return;
    onInputChanged(text);
  };

  React.useEffect(() => {
    if (!isActive || !isInputEnabled) return;
    processAnswer(false);
  }, [inputValue, isActive, isInputEnabled]);

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
            editable={isActive && isInputEnabled}
            autoFocus={false}
            showSoftInputOnFocus={false}
            caretHidden={true}
          />
        }
      />
    </View>
  );
}
