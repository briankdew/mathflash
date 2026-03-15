import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { NumberPad } from './NumberPad';
import { OperationSelector } from './OperationSelector';
import { SettingsPanel } from './SettingsPanel';
import { IconAudioMicrophone, IconSettingsAddSub, IconSettingsMulDiv } from './icons/MathIcons';
import { SessionInputMode, SessionOptions, SessionPhase, VoiceInputState } from '../lib/types';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import { isSessionPhaseActive } from '../lib/sessionPhases';
import { sessionPrepMarks, sessionPrepTimeline } from '../lib/sessionPrepTimeline';
import { appStyles as styles } from '../theme/App.styles';
import { palette, theme } from '../theme/colors';

// Keypad dimensions
const KEYPAD_CONTENT_HEIGHT = 232;
const KEYPAD_REVEAL_HEIGHT = KEYPAD_CONTENT_HEIGHT + 20;
const SETTINGS_REVEAL_MARGIN = 5;
const SETTINGS_FALLBACK_HEIGHT = 240;
const START_BUTTON_HEIGHT = 35;
const START_BUTTON_MARGIN_BOTTOM = 20;
const START_BUTTON_WIDTH = 215;
const GEAR_SIZE = 40;
const GEAR_REVEAL_OFFSET = 145.5;
const START_BUTTON_FLASH_DURATION_MS = 180;
const MIC_BUTTON_SIZE = 34;
const MIC_BUTTON_GAP = 12;

interface ControlDashboardProps {
  phase: SessionPhase;
  isActive: boolean;
  isInputEnabled: boolean;
  isStadiumActive: boolean;
  inputMode: SessionInputMode;
  voiceState: VoiceInputState;
  options: SessionOptions;
  opTheme: { textOperand: string; textResult: string; logoMath: string; logoFlash: string; tagline: string; btnBg: string; };
  onStartSession: () => void | Promise<void>;
  onEndSession: () => void;
  onToggleInputMode: () => void;
  onDigitInput: (d: string) => void;
  onClearInput: () => void;
  onUpdateOptions: (update: SessionOptionsUpdate) => void;
  useTimer: boolean;
  setUseTimer: (val: boolean) => void;
}

export function ControlDashboard({
  phase,
  isActive,
  isInputEnabled,
  isStadiumActive,
  inputMode,
  voiceState,
  options,
  opTheme,
  onStartSession,
  onEndSession,
  onToggleInputMode,
  onDigitInput,
  onClearInput,
  onUpdateOptions,
  useTimer,
  setUseTimer
}: ControlDashboardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsMeasuredHeight, setSettingsMeasuredHeight] = useState(0);
  const [isStartButtonFlashActive, setIsStartButtonFlashActive] = useState(false);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const untuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startButtonFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetSessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values for keypad slide-in
  const keypadHeight = useSharedValue(0);
  const keypadSlide = useSharedValue(-KEYPAD_CONTENT_HEIGHT);
  const settingsHeight = useSharedValue(0);
  const settingsSlide = useSharedValue(-(SETTINGS_FALLBACK_HEIGHT + SETTINGS_REVEAL_MARGIN));
  const gearOffset = useSharedValue(GEAR_REVEAL_OFFSET);
  const isSessionInProgress = isSessionPhaseActive(phase);
  const startButtonPressedColor = options.operation === 'addsub' ? '#07345b' : '#1d3c0b';
  const isVoiceToggleDisabled =
    isActive ||
    (inputMode === 'keypad' &&
      (!voiceState.platformSupported || !voiceState.isAvailable));
  const voiceStatusText = inputMode === 'voice'
    ? (voiceState.statusLabel || voiceState.errorMessage)
    : '';

  useEffect(() => {
    if (rollTimeoutRef.current) {
      clearTimeout(rollTimeoutRef.current);
      rollTimeoutRef.current = null;
    }
    if (untuckTimeoutRef.current) {
      clearTimeout(untuckTimeoutRef.current);
      untuckTimeoutRef.current = null;
    }

    if (isSessionInProgress) {
      // Step 1: Tuck gear behind the Start Session button
      gearOffset.value = withTiming(0, {
        duration: sessionPrepTimeline.tuck,
        easing: Easing.inOut(Easing.cubic),
      });

      if (inputMode === 'keypad') {
        // Step 2: After tuck and beat (500 + 150)
        rollTimeoutRef.current = setTimeout(() => {
          keypadHeight.value = withTiming(KEYPAD_REVEAL_HEIGHT, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          keypadSlide.value = withTiming(0, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          rollTimeoutRef.current = null;
        }, sessionPrepMarks.keypadRollStartAt);
      } else {
        keypadSlide.value = withTiming(-KEYPAD_CONTENT_HEIGHT, {
          duration: sessionPrepTimeline.roll,
          easing: Easing.linear,
        });
        keypadHeight.value = withTiming(0, {
          duration: sessionPrepTimeline.roll,
          easing: Easing.linear,
        });
      }
    } else {
      // Step 1: Hide keypad (Roll reverse)
      keypadSlide.value = withTiming(-KEYPAD_CONTENT_HEIGHT, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
      keypadHeight.value = withTiming(0, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });

      // Step 2: After keypad hidden and beat, untuck gear
      untuckTimeoutRef.current = setTimeout(() => {
        gearOffset.value = withTiming(GEAR_REVEAL_OFFSET, {
          duration: sessionPrepTimeline.tuck,
          easing: Easing.out(Easing.cubic),
        });
        untuckTimeoutRef.current = null;
      }, sessionPrepTimeline.roll + sessionPrepTimeline.beat);
    }

    return () => {
      if (rollTimeoutRef.current) {
        clearTimeout(rollTimeoutRef.current);
        rollTimeoutRef.current = null;
      }
      if (untuckTimeoutRef.current) {
        clearTimeout(untuckTimeoutRef.current);
        untuckTimeoutRef.current = null;
      }
    };
  }, [inputMode, isSessionInProgress]);

  useEffect(() => {
    return () => {
      if (startButtonFlashTimeoutRef.current) {
        clearTimeout(startButtonFlashTimeoutRef.current);
        startButtonFlashTimeoutRef.current = null;
      }
      if (resetSessionTimeoutRef.current) {
        clearTimeout(resetSessionTimeoutRef.current);
        resetSessionTimeoutRef.current = null;
      }
    };
  }, []);

  const triggerStartButtonFlash = () => {
    setIsStartButtonFlashActive(true);
    if (startButtonFlashTimeoutRef.current) {
      clearTimeout(startButtonFlashTimeoutRef.current);
    }
    startButtonFlashTimeoutRef.current = setTimeout(() => {
      setIsStartButtonFlashActive(false);
      startButtonFlashTimeoutRef.current = null;
    }, START_BUTTON_FLASH_DURATION_MS);
  };

  const handlePrimaryActionPress = () => {
    if (isActive) {
      if (resetSessionTimeoutRef.current) {
        clearTimeout(resetSessionTimeoutRef.current);
      }
      resetSessionTimeoutRef.current = setTimeout(() => {
        onEndSession();
        resetSessionTimeoutRef.current = null;
      }, START_BUTTON_FLASH_DURATION_MS);
      return;
    }

    onStartSession();
  };

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

  useEffect(() => {
    const settingsTargetHeight = (settingsMeasuredHeight > 0 ? settingsMeasuredHeight : SETTINGS_FALLBACK_HEIGHT) + SETTINGS_REVEAL_MARGIN;

    if (isSettingsOpen) {
      settingsHeight.value = withTiming(settingsTargetHeight, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
      settingsSlide.value = withTiming(0, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
    } else {
      settingsSlide.value = withTiming(-settingsTargetHeight, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
      settingsHeight.value = withTiming(0, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
    }
  }, [isSettingsOpen, settingsMeasuredHeight, settingsHeight, settingsSlide]);

  const settingsWrapperStyle = useAnimatedStyle(() => ({
    height: settingsHeight.value,
    overflow: 'hidden',
  }));

  const settingsContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsSlide.value }],
  }));

  return (
    <View style={styles.keypadBlock}>
      {/* Animated Keypad View */}
      <Animated.View 
        pointerEvents={isActive && isInputEnabled ? 'auto' : 'none'}
        style={[
          { alignItems: 'center', width: '100%', backgroundColor: theme.bg, zIndex: 10 }, 
          keypadWrapperStyle
        ]}
      >
        <Animated.View style={[{ width: '100%', alignItems: 'center' }, keypadContentStyle]}>
          <NumberPad
            onDigit={onDigitInput}
            onClear={onClearInput}
            disabled={!isActive || !isInputEnabled || inputMode !== 'keypad'}
          />
        </Animated.View>
      </Animated.View>

      {/* Primary Action Button Row */}
      <View
        style={{
          width: '100%',
          height: START_BUTTON_HEIGHT + START_BUTTON_MARGIN_BOTTOM,
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              zIndex: 0,
              top: (START_BUTTON_HEIGHT - GEAR_SIZE) / 2,
            },
            gearStyle
          ]}
        >
          <TouchableOpacity
            style={{ 
              width: GEAR_SIZE, 
              height: GEAR_SIZE, 
              justifyContent: 'center', 
              alignItems: 'center',
            }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => !isActive && setIsSettingsOpen(!isSettingsOpen)}
            disabled={isActive}
          >
            {options.operation === 'multdiv' ? (
              <IconSettingsMulDiv size={40} />
            ) : (
              <IconSettingsAddSub size={40} />
            )}
          </TouchableOpacity>
        </Animated.View>

        <Pressable
          style={[
            {
              position: 'absolute',
              left: '50%',
              marginLeft: -(START_BUTTON_WIDTH / 2) - MIC_BUTTON_SIZE - MIC_BUTTON_GAP,
              top: (START_BUTTON_HEIGHT - MIC_BUTTON_SIZE) / 2,
              width: MIC_BUTTON_SIZE,
              height: MIC_BUTTON_SIZE,
              borderRadius: MIC_BUTTON_SIZE / 2,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: inputMode === 'voice' ? opTheme.textOperand : palette.beige[1],
              opacity: isVoiceToggleDisabled ? 0.38 : 1,
              zIndex: 2,
            },
          ]}
          onPress={onToggleInputMode}
          disabled={isVoiceToggleDisabled}
        >
          <IconAudioMicrophone
            width={18}
            shellFill={inputMode === 'voice' ? palette.red[7] : palette.beige[5]}
            detailFill={inputMode === 'voice' ? palette.bg : palette.beige[2]}
          />
        </Pressable>

        <Pressable
          style={[
            styles.startBtn,
            {
              backgroundColor: isStartButtonFlashActive ? startButtonPressedColor : opTheme.textOperand,
              zIndex: 1,
            },
          ]}
          onPressIn={triggerStartButtonFlash}
          onPress={handlePrimaryActionPress}
        >
          <Text style={styles.startBtnText}>
            {isActive ? 'Reset Session' : 'Start Session'}
          </Text>
        </Pressable>

        <Text
          pointerEvents="none"
          style={[
            styles.voiceStatusText,
            {
              position: 'absolute',
              top: START_BUTTON_HEIGHT + 2,
              opacity: voiceStatusText ? 1 : 0,
            }
          ]}
        >
          {voiceStatusText || ' '}
        </Text>
      </View>

      <OperationSelector
        operation={options.operation}
        isActive={isActive}
        isStadiumActive={isStadiumActive}
        onToggleOperation={() => onUpdateOptions({
          type: 'setOperation',
          operation: options.operation === 'addsub' ? 'multdiv' : 'addsub',
        })}
      />

      {/* Expandable Settings */}
      <Animated.View style={[{ width: '100%' }, settingsWrapperStyle]}>
        <Animated.View style={[{ width: '100%' }, settingsContentStyle]}>
          <View
            onLayout={(event) => {
              const h = Math.ceil(event.nativeEvent.layout.height);
              if (h > 0 && h !== settingsMeasuredHeight) {
                setSettingsMeasuredHeight(h);
              }
            }}
          >
            <SettingsPanel
              options={options}
              updateOptions={onUpdateOptions}
              useTimer={useTimer}
              setUseTimer={setUseTimer}
              disabled={isActive}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
