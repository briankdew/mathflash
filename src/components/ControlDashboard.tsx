import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import { NumberPad } from './NumberPad';
import { SettingsPanel } from './SettingsPanel';
import { SessionOptions } from '../lib/types';
import { appStyles as styles } from '../theme/App.styles';
import { theme } from '../theme/colors';

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
  // Gear tucked behind button: 0. Fully out: 142 (Left edge = 107.5 button edge + 18u gap + 16.5 half width of 33px gear)
  const gearOffset = useSharedValue(142);

  useEffect(() => {
    if (isActive) {
      // Step 1: Tuck gear behind the Start Session button
      gearOffset.value = withTiming(0, { duration: 500, easing: Easing.inOut(Easing.cubic) });
      
      // Step 2: After tuck and beat (500 + 150)
      setTimeout(() => {
        keypadHeight.value = withTiming(KEYPAD_REVEAL_HEIGHT, {
          duration: 400,
          easing: Easing.linear,
        });
        keypadSlide.value = withTiming(0, {
          duration: 400,
          easing: Easing.linear,
        });
      }, 650); // 500ms tuck + 150ms beat
    } else {
      // Step 1: Hide keypad (Roll reverse)
      keypadSlide.value = withTiming(-KEYPAD_CONTENT_HEIGHT, {
        duration: 400,
        easing: Easing.linear,
      });
      keypadHeight.value = withTiming(0, {
        duration: 400,
        easing: Easing.linear,
      });

      // Step 2: After keypad hidden and beat, untuck gear
      setTimeout(() => {
        gearOffset.value = withTiming(142, { duration: 500, easing: Easing.out(Easing.cubic) });
      }, 550); // 400ms roll + 150ms beat
    }
  }, [isActive]);

  const keypadWrapperStyle = useAnimatedStyle(() => ({
    height: keypadHeight.value,
    overflow: 'hidden' as const,
  }));

  const keypadContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keypadSlide.value }],
  }));

  const gearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gearOffset.value }],
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
      <Animated.View 
        pointerEvents={isActive ? 'auto' : 'none'}
        style={[
          { alignItems: 'center', width: '100%', backgroundColor: theme.bg, zIndex: 10 }, 
          keypadWrapperStyle
        ]}
      >
        <Animated.View style={[{ width: '100%', alignItems: 'center' }, keypadContentStyle]}>
          <NumberPad
            onDigit={onDigitInput}
            onClear={onClearInput}
            disabled={!isActive}
          />
        </Animated.View>
      </Animated.View>

      {/* Primary Action Button Row */}
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[
          { position: 'absolute', zIndex: 0, marginBottom: 10 },
          gearStyle
        ]}>
          <TouchableOpacity
            style={{ 
              width: 33, 
              height: 33, 
              justifyContent: 'center', 
              alignItems: 'center',
            }}
            onPress={() => !isActive && setIsSettingsOpen(!isSettingsOpen)}
            disabled={isActive}
          >
            <FontAwesome name="gear" size={33} color={opTheme.tagline} />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: opTheme.textOperand, zIndex: 1 }]}
          onPress={() => isActive ? onEndSession() : onStartSession()}
          activeOpacity={0.9}
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
        />
      </Animated.View>
    </View>
  );
}
