import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import { NumberPad } from './NumberPad';
import { SettingsPanel } from './SettingsPanel';
import { SessionOptions } from '../lib/types';
import { appStyles as styles } from '../theme/App.styles';

// Keypad dimensions
const KEYPAD_CONTENT_HEIGHT = 232;
const KEYPAD_REVEAL_HEIGHT = KEYPAD_CONTENT_HEIGHT + 20;

interface ControlDashboardProps {
  isActive: boolean;
  options: SessionOptions;
  opTheme: { textOperand: string; textResult: string; logoMath: string; logoFlash: string; tagline: string; btnBg: string; };
  onStartSession: () => void;
  onEndSession: () => void;
  onDigitInput: (d: string) => void;
  onClearInput: () => void;
  onUpdateOptions: (opts: Partial<SessionOptions>) => void;
  useTimer: boolean;
  setUseTimer: (val: boolean) => void;
}

export function ControlDashboard({
  isActive,
  options,
  opTheme,
  onStartSession,
  onEndSession,
  onDigitInput,
  onClearInput,
  onUpdateOptions,
  useTimer,
  setUseTimer
}: ControlDashboardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Animated values for keypad slide-in
  const keypadHeight = useSharedValue(0);
  const keypadSlide = useSharedValue(-KEYPAD_CONTENT_HEIGHT);

  useEffect(() => {
    if (isActive) {
      setIsSettingsOpen(false); // Auto-close settings when starting
      keypadHeight.value = withTiming(KEYPAD_REVEAL_HEIGHT, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
      keypadSlide.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      keypadSlide.value = withTiming(-KEYPAD_CONTENT_HEIGHT, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      keypadHeight.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [isActive]);

  const keypadWrapperStyle = useAnimatedStyle(() => ({
    height: keypadHeight.value,
    overflow: 'hidden' as const,
  }));

  const keypadContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keypadSlide.value }],
  }));

  const settingsWrapperStyle = useAnimatedStyle(() => ({
    height: withTiming(isSettingsOpen ? 550 : 0, {
       duration: 350,
       easing: Easing.out(Easing.cubic),
    }),
    opacity: withTiming(isSettingsOpen ? 1 : 0),
    overflow: 'hidden',
  }));

  return (
    <View style={styles.keypadBlock}>
      {/* Animated Keypad View */}
      <Animated.View style={[{ alignItems: 'center', width: '100%' }, keypadWrapperStyle]}>
        <Animated.View style={[{ width: '100%', alignItems: 'center' }, keypadContentStyle]}>
          <NumberPad
            onDigit={onDigitInput}
            onClear={onClearInput}
            disabled={!isActive}
          />
        </Animated.View>
      </Animated.View>

      {/* Primary Action Button */}
      <View style={{ width: '100%', alignItems: 'center' }}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: opTheme.textOperand }]}
          onPress={() => isActive ? onEndSession() : onStartSession()}
        >
          <Text style={styles.startBtnText}>
            {isActive ? 'Reset Session' : 'Start Session'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Settings */}
      <Animated.View style={[{ width: '100%' }, settingsWrapperStyle]}>
        <SettingsPanel
          options={options}
          updateOptions={onUpdateOptions}
          useTimer={useTimer}
          setUseTimer={setUseTimer}
          disabled={isActive}
          onClose={() => setIsSettingsOpen(false)}
        />
      </Animated.View>

      {/* Floating Gear Icon (Hidden when active) */}
      {!isActive && (
        <TouchableOpacity
          style={{ position: 'absolute', bottom: 10, right: 10, padding: 10 }}
          onPress={() => setIsSettingsOpen(!isSettingsOpen)}
        >
          <FontAwesome name="gear" size={35} color={opTheme.tagline} />
        </TouchableOpacity>
      )}
    </View>
  );
}
