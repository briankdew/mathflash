import React, { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { appStyles as styles } from '../theme/App.styles';
import { ProblemConstellation } from './ProblemConstellation';
import { ProblemDisplay, SessionOptions } from '../lib/types';

interface PracticeAreaProps {
  currentProblem: ProblemDisplay | null;
  options: SessionOptions;
  isActive: boolean;
  isStadiumActive: boolean;
  onToggleOperation: () => void;
  onCheckAnswer: (input: string, forceComplete: boolean) => 'correct' | 'wrong' | 'incomplete';
  onAdvanceProblem: () => void;
  onInputChanged: (val: string) => void;
  inputValue: string;
}

export function PracticeArea({
  currentProblem,
  options,
  isActive,
  isStadiumActive,
  onToggleOperation,
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
    if (isActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      inputRef.current?.blur();
      onInputChanged('');
    }
  }, [isActive]);

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

  const processAnswer = (value: string, forceComplete: boolean) => {
    if (!value) return;
    const res = onCheckAnswer(value, forceComplete);

    if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      if (clearInputTimeoutRef.current) {
        clearTimeout(clearInputTimeoutRef.current);
      }
      clearInputTimeoutRef.current = setTimeout(() => {
        onInputChanged('');
        clearInputTimeoutRef.current = null;
      }, 400);
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
      }, 500);
    }
  };

  const handleSubmit = () => {
    processAnswer(inputValue, true);
  };

  const handleInput = (text: string) => {
    onInputChanged(text);
  };

  React.useEffect(() => {
    if (!isActive) return;
    processAnswer(inputValue, false);
  }, [inputValue, isActive]);

  return (
    <View style={styles.constellationWrapper}>
      <ProblemConstellation
        problem={currentProblem}
        operation={options.operation}
        shakeTrigger={shakeTrigger}
        showCorrect={showCorrect}
        isActive={isActive}
        isStadiumActive={isStadiumActive}
        onToggleOperation={onToggleOperation}
        renderInput={
          <TextInput
            ref={inputRef}
            // Explicit cast to bypass React Native Web's missing strict 'outline' typing
            style={[styles.textInput, { outline: 'none' } as any]}
            keyboardType="number-pad"
            value={inputValue}
            onChangeText={handleInput}
            onSubmitEditing={handleSubmit}
            editable={isActive}
            autoFocus={false}
            showSoftInputOnFocus={false}
            caretHidden={true}
          />
        }
      />
    </View>
  );
}
