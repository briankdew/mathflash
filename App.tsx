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
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Header } from './src/components/Header';
import { ProblemConstellation } from './src/components/ProblemConstellation';
import { SettingsModal } from './src/components/SettingsModal';
import { NumberPad } from './src/components/NumberPad';
import { useMathSession } from './src/hooks/useMathSession';
import { theme, getOperationTheme } from './src/theme/colors';
import { useFonts, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Archivo_400Regular } from '@expo-google-fonts/archivo';
import { appStyles as styles } from './src/theme/App.styles';

// Keypad dimensions: 4 rows × (52px + 8px margin) = 240px
const KEYPAD_CONTENT_HEIGHT = 240;
// Gap below keypad to button: 22px
const KEYPAD_REVEAL_HEIGHT = KEYPAD_CONTENT_HEIGHT + 22; // 262px

export default function App() {
  const session = useMathSession();
  const opTheme = getOperationTheme(session.options.operation);
  const [inputValue, setInputValue] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animated values for keypad slide-in
  const keypadHeight = useSharedValue(0);
  const keypadSlide = useSharedValue(-KEYPAD_CONTENT_HEIGHT);

  useEffect(() => {
    if (session.isActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Expand the wrapper AND slide the keypad content downward in sync
      keypadHeight.value = withTiming(KEYPAD_REVEAL_HEIGHT, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
      keypadSlide.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      inputRef.current?.blur();
      setInputValue('');
      // Collapse: slide keypad back up and shrink wrapper
      keypadSlide.value = withTiming(-KEYPAD_CONTENT_HEIGHT, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      keypadHeight.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [session.isActive]);

  // Wrapper: expands height to push button down, clips overflow
  const keypadWrapperStyle = useAnimatedStyle(() => ({
    height: keypadHeight.value,
    overflow: 'hidden' as const,
  }));

  // Content: slides downward from -232 to 0 inside the wrapper
  const keypadContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keypadSlide.value }],
  }));

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
      }, 500);
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
                      showSoftInputOnFocus={false}
                      caretHidden={true}
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

                  {/* Animated keypad slide-in: slides down like a movie screen */}
                  <Animated.View style={[{ alignItems: 'center', width: '100%' }, keypadWrapperStyle]}>
                    <Animated.View style={[{ width: '100%', alignItems: 'center' }, keypadContentStyle]}>
                      <NumberPad
                        onDigit={(d) => handleInput(inputValue + d)}
                        onClear={() => setInputValue('')}
                        disabled={!session.isActive}
                      />
                    </Animated.View>
                  </Animated.View>

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
