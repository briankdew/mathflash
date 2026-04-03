import React from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Header } from './src/components/Header';
import { PracticeArea } from './src/components/PracticeArea';
import { ControlDashboard } from './src/components/ControlDashboard';
import { SessionPerformanceSheet } from './src/components/SessionPerformanceSheet';
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
  const pendingCount = session.getPendingCount();
  const selectedCountColor = !session.isActive && pendingCount === 0 ? '#890124' : theme.textMuted;
  const { width: windowWidth } = useWindowDimensions();
  const dashboardFrameWidth = Math.min(windowWidth, 600);

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
      <SessionPerformanceSheet
        visible={session.isPerformanceReportVisible}
        report={session.sessionPerformanceReport}
        onClose={session.closePerformanceReport}
      />
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
                phase={session.phase}
                isActive={session.isActive}
                isInputEnabled={session.isInputEnabled}
                inputMode={session.inputMode}
                voiceState={session.voiceState}
                onCheckAnswer={session.submitAnswerAttempt}
                onAdvanceProblem={session.advanceToNextProblem}
                onInputChanged={session.setInputValue}
                onPauseVoiceInput={session.pauseVoiceInput}
                onResumeVoiceInput={session.resumeVoiceInput}
                onClearPendingVoiceAttempt={session.clearPendingVoiceAttempt}
                inputValue={session.inputValue}
              />

              <View style={styles.inputArea}>
                <View style={[styles.statsBlock, { marginTop: 0, marginBottom: 7 }]}>
                  <View style={styles.statsTextRow}>
                    <Text style={[styles.countText, styles.statsLabelText, { color: selectedCountColor }]}>
                      {session.isActive && !!session.currentProblem ? 'Problems remaining:' : 'Problems selected:'}
                    </Text>
                    <Text style={[styles.statsCountText, { color: selectedCountColor }]}>
                      {session.isActive && !!session.currentProblem ? session.totalProblems - session.stats.completed : pendingCount}
                    </Text>
                  </View>
                </View>

                <View style={{ width: dashboardFrameWidth, alignItems: 'center' }}>
                  <ControlDashboard
                    phase={session.phase}
                    isActive={session.isActive}
                    isStadiumActive={session.isStadiumActive}
                    inputMode={session.inputMode}
                    voiceState={session.voiceState}
                    options={session.options}
                    opTheme={opTheme}
                    onStartSession={session.startSession}
                    onEndSession={session.endSession}
                    onToggleInputMode={() =>
                      session.setInputMode(session.inputMode === 'keypad' ? 'voice' : 'keypad')
                    }
                    onDigitInput={session.appendInputDigit}
                    onClearInput={session.clearInputValue}
                    isInputEnabled={session.isInputEnabled}
                    onUpdateOptions={session.updateOptions}
                    useTimer={session.useTimer}
                    setUseTimer={session.setUseTimer}
                  />

                  {!session.isActive && session.sessionPerformanceReport ? (
                    <Pressable
                      style={styles.reportLinkBtn}
                      onPress={session.openPerformanceReport}
                    >
                      <Text style={styles.reportLinkText}>View last performance report</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
