import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Header } from './src/components/Header';
import { PracticeArea } from './src/components/PracticeArea';
import { ControlDashboard } from './src/components/ControlDashboard';
import { useMathSession } from './src/hooks/useMathSession';
import { theme, getOperationTheme } from './src/theme/colors';
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold_Italic } from '@expo-google-fonts/nunito';
import { Archivo_400Regular } from '@expo-google-fonts/archivo';
import { Fredoka_400Regular } from '@expo-google-fonts/fredoka';
import { NotoSans_500Medium } from '@expo-google-fonts/noto-sans';
import { LibreBaskerville_400Regular_Italic } from '@expo-google-fonts/libre-baskerville';
import { appStyles as styles } from './src/theme/App.styles';

export default function App() {
  const session = useMathSession();
  const opTheme = getOperationTheme(session.options.operation);
  const [inputValue, setInputValue] = useState('');
  const handleDigitInput = (digit: string) => {
    if (!session.isInputEnabled) return;
    setInputValue(prev => prev + digit);
  };
  const handleInputChanged = (value: string) => {
    if (!session.isInputEnabled && value !== '') return;
    setInputValue(value);
  };

  let [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold_Italic,
    Archivo_400Regular,
    Fredoka_400Regular,
    NotoSans_500Medium,
    LibreBaskerville_400Regular_Italic,
  });

  if (!fontsLoaded) return null;

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
            <View style={styles.panelCenter}>

              <PracticeArea
                currentProblem={session.currentProblem}
                options={session.options}
                isActive={session.isActive}
                isInputEnabled={session.isInputEnabled}
                onCheckAnswer={(input, force) => session.checkAnswer(input, force)}
                onAdvanceProblem={session.advanceToNextProblem}
                onInputChanged={handleInputChanged}
                inputValue={inputValue}
              />

              <View style={styles.inputArea}>
                <View style={[styles.statsBlock, { marginTop: 4 }]}>
                  <Text style={[styles.countText, { lineHeight: 22 }]}>
                    {session.isActive && !!session.currentProblem ? 'Problems remaining: ' : 'Problems selected: '}
                    <Text style={{ fontFamily: 'Nunito_700Bold', lineHeight: 22 }}>
                      {session.isActive && !!session.currentProblem ? session.totalProblems - session.stats.completed : session.getPendingCount()}
                    </Text>
                  </Text>
                </View>

                <ControlDashboard
                  isActive={session.isActive}
                  isStadiumActive={session.isStadiumActive}
                  options={session.options}
                  opTheme={opTheme}
                  onStartSession={session.startSession}
                  onEndSession={session.endSession}
                  onDigitInput={handleDigitInput}
                  onClearInput={() => setInputValue('')}
                  isInputEnabled={session.isInputEnabled}
                  onUpdateOptions={session.updateOptions}
                  useTimer={session.useTimer}
                  setUseTimer={session.setUseTimer}
                />
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
