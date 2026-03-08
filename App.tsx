import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Dimensions
} from 'react-native';
import { Header } from './src/components/Header';
import { ProblemConstellation } from './src/components/ProblemConstellation';
import { SettingsModal } from './src/components/SettingsModal';
import { useMathSession } from './src/hooks/useMathSession';
import { theme, getOperationTheme } from './src/theme/colors';
import { useFonts, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Archivo_400Regular } from '@expo-google-fonts/archivo';
import { appStyles as styles } from './src/theme/App.styles';

export default function App() {
  const session = useMathSession();
  const opTheme = getOperationTheme(session.options.operation);
  const [inputValue, setInputValue] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (session.isActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      inputRef.current?.blur();
      setInputValue('');
    }
  }, [session.isActive]);

  let [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Archivo_400Regular,
  });

  const handleSubmit = () => {
    if (!inputValue) return;
    const res = session.checkAnswer(inputValue, true);

    if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      setTimeout(() => setInputValue(''), 400);
    } else if (res === 'correct') {
      setShowCorrect(true);
      setTimeout(() => {
        setInputValue('');
        setShowCorrect(false);
        session.advanceToNextProblem();
      }, 500); // 500ms delay so they can see it's right
    }
  };

  const handleInput = (text: string) => {
    setInputValue(text);
    const res = session.checkAnswer(text, false);
    if (res === 'correct') {
      setShowCorrect(true);
      setTimeout(() => {
        setInputValue('');
        setShowCorrect(false);
        session.advanceToNextProblem();
      }, 500);
    } else if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      setTimeout(() => setInputValue(''), 400);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Header operation={session.options.operation} onOpenSettings={() => setIsSettingsOpen(true)} />

          <SettingsModal
            visible={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            options={session.options}
            updateOptions={session.updateOptions}
            useTimer={session.useTimer}
            setUseTimer={session.setUseTimer}
            disabled={session.isActive}
          />

          <View style={styles.mainLayout}>
            <View style={styles.panelCenter}>
              <View style={styles.constellationWrapper}>
                <ProblemConstellation
                  problem={session.currentProblem}
                  operation={session.options.operation}
                  shakeTrigger={shakeTrigger}
                  showCorrect={showCorrect}
                  isActive={session.isActive}
                  onToggleOperation={() => session.updateOptions({ operation: session.options.operation === 'addsub' ? 'multdiv' : 'addsub' })}
                  renderInput={
                    <TextInput
                      ref={inputRef}
                      style={[styles.textInput, { outline: 'none' } as any]}
                      keyboardType="number-pad"
                      value={inputValue}
                      onChangeText={handleInput}
                      onSubmitEditing={handleSubmit}
                      editable={session.isActive}
                      autoFocus={false}
                    />
                  }
                />
              </View>

              <View style={styles.inputArea}>
                <View style={[styles.sessionControl, { marginTop: 7 }]}>
                  <Text style={[styles.countText, { lineHeight: 22, marginBottom: 11 }]}>
                    {session.isActive ? 'Problems remaining: ' : 'Problems selected: '}
                    <Text style={{ fontFamily: 'Nunito_700Bold', lineHeight: 22 }}>{session.isActive ? session.totalProblems - session.stats.completed : session.getPendingCount()}</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.startBtn,
                      { backgroundColor: opTheme.textOperand }
                    ]}
                    onPress={() => {
                      if (session.isActive) session.endSession();
                      else session.startSession();
                    }}
                  >
                    <Text style={styles.startBtnText}>
                      {session.isActive ? 'Reset Session' : 'Start Session'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


