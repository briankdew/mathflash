import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Header } from './src/components/Header';
import { SettingsPanel } from './src/components/SettingsPanel';
import { ProblemConstellation } from './src/components/ProblemConstellation';
import { useMathSession } from './src/hooks/useMathSession';
import { theme } from './src/theme/colors';

export default function App() {
  const session = useMathSession();
  const [inputValue, setInputValue] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const handleSubmit = () => {
    if (!inputValue) return;
    const res = session.checkAnswer(inputValue, true);

    if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      setInputValue('');
    } else if (res === 'correct') {
      setInputValue('');
      setTimeout(() => {
        session.advanceToNextProblem();
      }, 300); // slight delay so they can see it's right
    }
  };

  const handleInput = (text: string) => {
    setInputValue(text);
    const res = session.checkAnswer(text, false);
    if (res === 'correct') {
      setInputValue('');
      setTimeout(() => {
        session.advanceToNextProblem();
      }, 300);
    } else if (res === 'wrong') {
      setShakeTrigger(prev => prev + 1);
      setInputValue('');
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
          <Header operation={session.options.operation} />

          <View style={styles.mainLayout}>
            {!session.isActive && (
              <View style={styles.panelLeft}>
                <SettingsPanel
                  options={session.options}
                  updateOptions={session.updateOptions}
                  useTimer={session.useTimer}
                  setUseTimer={session.setUseTimer}
                  disabled={session.isActive}
                />
              </View>
            )}

            <View style={styles.panelCenter}>
              <View style={styles.constellationWrapper}>
                <ProblemConstellation
                  problem={session.currentProblem}
                  operation={session.options.operation}
                  shakeTrigger={shakeTrigger}
                />
              </View>

              <View style={styles.inputArea}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={inputValue}
                  onChangeText={handleInput}
                  onSubmitEditing={handleSubmit}
                  editable={session.isActive}
                  placeholder={session.isActive ? "123" : ""}
                  placeholderTextColor={theme.textMuted}
                  autoFocus={false}
                />

                <View style={styles.sessionControl}>
                  <TouchableOpacity
                    style={[styles.startBtn, session.isActive && styles.resetBtn]}
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
                    <Text style={{ fontWeight: 'bold' }}>{session.isActive ? session.totalProblems - session.stats.completed : session.getPendingCount()}</Text>
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
  mainLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  panelLeft: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  panelCenter: {
    flex: 1,
    minWidth: 320,
    maxWidth: 800,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  constellationWrapper: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // to prevent absolute objects from causing weird scrolls
    marginBottom: 20,
  },
  inputArea: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  textInput: {
    width: '80%',
    height: 60,
    borderWidth: 2,
    borderColor: theme.cardOperandBg,
    borderRadius: 8,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff',
    color: theme.textMain,
    marginBottom: 20,
  },
  sessionControl: {
    width: '100%',
    alignItems: 'center',
  },
  startBtn: {
    width: '100%',
    padding: 16,
    backgroundColor: theme.textMain,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  resetBtn: {
    backgroundColor: '#d32f2f', // Red for reset
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  countText: {
    fontSize: 16,
    color: theme.textMuted,
  }
});
