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
import { SettingsPanel } from './src/components/SettingsPanel';
import { ProblemConstellation } from './src/components/ProblemConstellation';
import { useMathSession } from './src/hooks/useMathSession';
import { theme, getOperationTheme } from './src/theme/colors';
import { useFonts, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Archivo_400Regular } from '@expo-google-fonts/archivo';

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

          <Modal visible={isSettingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsSettingsOpen(false)}>
            <SafeAreaView style={styles.modalSafeArea}>
              <ScrollView>
                <SettingsPanel
                  options={session.options}
                  updateOptions={session.updateOptions}
                  useTimer={session.useTimer}
                  setUseTimer={session.setUseTimer}
                  disabled={session.isActive}
                  onClose={() => setIsSettingsOpen(false)}
                />
              </ScrollView>
            </SafeAreaView>
          </Modal>

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
                <View style={[styles.sessionControl, { marginTop: 25 }]}>
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
                  <Text style={styles.countText}>
                    {session.isActive ? 'Problems remaining: ' : 'Problems selected: '}
                    <Text style={{ fontFamily: 'Nunito_700Bold' }}>{session.isActive ? session.totalProblems - session.stats.completed : session.getPendingCount()}</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainLayout: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  panelCenter: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  constellationWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 22,
  },
  inputArea: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  textInput: {
    width: '100%',
    height: '100%',
    fontSize: 98,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    color: '#777565',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  sessionControl: {
    width: '100%',
    alignItems: 'center',
  },
  startBtn: {
    width: 215,
    height: 35,
    justifyContent: 'center',
    borderRadius: 17.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 10,
  },
  resetBtn: {
    // This is handled inline dynamically now
  },
  startBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Archivo_400Regular',
    fontWeight: 'normal',
  },
  countText: {
    fontSize: 16,
    fontFamily: 'Archivo_400Regular',
    color: theme.textMuted,
  }
});
