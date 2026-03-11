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

  // Auto-focus when active
  React.useEffect(() => {
    if (isActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      inputRef.current?.blur();
      onInputChanged('');
    }
  }, [isActive]);

  const handleSubmit = () => {
    if (!inputValue) return;
    const res = onCheckAnswer(inputValue, true);

    if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      setTimeout(() => onInputChanged(''), 400);
    } else if (res === 'correct') {
      setShowCorrect(true);
      setTimeout(() => {
        onInputChanged('');
        setShowCorrect(false);
        onAdvanceProblem();
      }, 500);
    }
  };

  const handleInput = (text: string) => {
    onInputChanged(text);
    const res = onCheckAnswer(text, false);
    if (res === 'correct') {
      setShowCorrect(true);
      setTimeout(() => {
        onInputChanged('');
        setShowCorrect(false);
        onAdvanceProblem();
      }, 500);
    } else if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      setTimeout(() => onInputChanged(''), 400);
    }
  };

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
