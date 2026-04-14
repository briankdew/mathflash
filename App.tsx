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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Header } from './src/components/Header';
import { MeasureOverlay } from './src/components/MeasureOverlay';
import { PracticeArea } from './src/components/PracticeArea';
import { ControlDashboard } from './src/components/ControlDashboard';
import { SessionPerformanceSheet } from './src/components/SessionPerformanceSheet';
import { useMathSession } from './src/hooks/useMathSession';
import { theme, getOperationTheme } from './src/theme/colors';
import { useFonts } from 'expo-font';
import { appStyles as styles } from './src/theme/App.styles';

export default function App() {
  const session = useMathSession();
  const opTheme = getOperationTheme(session.options.operation);
  const pendingCount = session.getPendingCount();
  const selectedCountColor = !session.isActive && pendingCount === 0 ? theme.dangerText : theme.textMuted;
  const { width: windowWidth } = useWindowDimensions();
  const dashboardFrameWidth = Math.min(windowWidth, 600);
  const [safeAreaSize, setSafeAreaSize] = React.useState({ width: 0, height: 0 });
  const [isMeasureOverlayEnabled, setIsMeasureOverlayEnabled] = React.useState(false);
  const [measureLineY, setMeasureLineY] = React.useState<number | null>(null);
  const [measureLabelX, setMeasureLabelX] = React.useState<number | null>(null);

  let [fontsLoaded] = useFonts({
    Nunito_700Bold: require('./assets/fonts/Nunito_700Bold.ttf'),
    Nunito_800ExtraBold_Italic: require('./assets/fonts/Nunito_800ExtraBold_Italic.ttf'),
    Archivo_400Regular: require('./assets/fonts/Archivo_400Regular.ttf'),
    Fredoka_400Regular: require('./assets/fonts/Fredoka_400Regular.ttf'),
    NotoSans_500Medium: require('./assets/fonts/NotoSans_500Medium.ttf'),
    LibreBaskerville_400Regular_Italic: require('./assets/fonts/LibreBaskerville_400Regular_Italic.ttf'),
  });

  React.useEffect(() => {
    if (safeAreaSize.width <= 0 || safeAreaSize.height <= 0) {
      return;
    }

    if (measureLineY !== null) {
      const clampedLineY = Math.min(
        Math.max(measureLineY, 0),
        Math.max(0, safeAreaSize.height - 1)
      );
      if (clampedLineY !== measureLineY) {
        setMeasureLineY(clampedLineY);
      }
    }

    if (measureLabelX !== null) {
      const clampedLabelX = Math.min(Math.max(measureLabelX, 0), safeAreaSize.width);
      if (clampedLabelX !== measureLabelX) {
        setMeasureLabelX(clampedLabelX);
      }
    }

    if (isMeasureOverlayEnabled && measureLineY === null) {
      setMeasureLineY(Math.round(safeAreaSize.height / 2));
    }

    if (isMeasureOverlayEnabled && measureLabelX === null) {
      setMeasureLabelX(Math.round(safeAreaSize.width / 2));
    }
  }, [
    isMeasureOverlayEnabled,
    measureLabelX,
    measureLineY,
    safeAreaSize.height,
    safeAreaSize.width,
  ]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView
        style={styles.safeArea}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          if (width !== safeAreaSize.width || height !== safeAreaSize.height) {
            setSafeAreaSize({ width, height });
          }
        }}
      >
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
                  <View
                    style={[
                      styles.statsBlock,
                      {
                        marginTop: 0,
                        marginBottom: 7,
                      },
                    ]}
                  >
                    <View style={styles.statsTextRow}>
                      <Text
                        style={[
                          styles.countText,
                          styles.statsLabelText,
                          {
                            color: selectedCountColor,
                          },
                        ]}
                      >
                        {session.isActive && !!session.currentProblem ? 'Problems remaining:' : 'Problems selected:'}
                      </Text>
                      <Text
                        style={[
                          styles.statsCountText,
                          {
                            color: selectedCountColor,
                          },
                        ]}
                      >
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
                      isMeasureOverlayEnabled={isMeasureOverlayEnabled}
                      setIsMeasureOverlayEnabled={setIsMeasureOverlayEnabled}
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

        {__DEV__ ? (
          <MeasureOverlay
            enabled={isMeasureOverlayEnabled}
            safeAreaHeight={safeAreaSize.height}
            safeAreaWidth={safeAreaSize.width}
            lineY={measureLineY}
            onChangeLineY={setMeasureLineY}
            labelX={measureLabelX}
            onChangeLabelX={setMeasureLabelX}
          />
        ) : null}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
