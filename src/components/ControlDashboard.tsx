import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { NumberPad } from './NumberPad';
import { OperationSelector } from './OperationSelector';
import { SettingsPanel } from './SettingsPanel';
import {
  IconInputModeToggle,
  IconSettingsAddSub,
  IconSettingsMulDiv,
  IconVoiceInputMicrophone,
} from './icons/MathIcons';
import {
  SessionInputMode,
  SessionOptions,
  SessionPhase,
  VoiceInputState,
} from '../lib/types';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import { appStyles as styles } from '../theme/App.styles';
import { theme } from '../theme/colors';
import { useControlDashboardMotion } from '../hooks/ui/useControlDashboardMotion';

const START_BUTTON_HEIGHT = 35;
const START_BUTTON_MARGIN_BOTTOM = 20;
const START_BUTTON_WIDTH = 215;
const GEAR_SIZE = 40;
const START_BUTTON_FLASH_DURATION_MS = 180;
const MIC_BUTTON_SIZE = 40;
const MIC_BUTTON_GAP = 12;
const VOICE_HALO_COLORS = {
  neutral: '#f4f2e7',
  listening: '#c5ffd0',
  retrying: '#fcffc5',
  error: '#ffc5c5',
} as const;

function getVoiceHaloColor(message: string): string {
  if (!message) {
    return VOICE_HALO_COLORS.neutral;
  }

  if (message === 'Listening…') {
    return VOICE_HALO_COLORS.listening;
  }

  if (message === 'Retrying…') {
    return VOICE_HALO_COLORS.retrying;
  }

  return VOICE_HALO_COLORS.error;
}

interface ControlDashboardProps {
  phase: SessionPhase;
  isActive: boolean;
  isInputEnabled: boolean;
  isStadiumActive: boolean;
  inputMode: SessionInputMode;
  voiceState: VoiceInputState;
  options: SessionOptions;
  opTheme: {
    textOperand: string;
    textResult: string;
    logoMath: string;
    logoFlash: string;
    tagline: string;
    btnBg: string;
  };
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
  setUseTimer,
}: ControlDashboardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsMeasuredHeight, setSettingsMeasuredHeight] = useState(0);
  const [isStartButtonFlashActive, setIsStartButtonFlashActive] = useState(false);
  const [voiceHaloColor, setVoiceHaloColor] = useState<string>(
    VOICE_HALO_COLORS.neutral
  );
  const startButtonFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const resetSessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    keypadWrapperStyle,
    keypadContentStyle,
    voiceIconWrapperStyle,
    voiceIconContentStyle,
    gearStyle,
    inputToggleStyle,
    settingsWrapperStyle,
    settingsContentStyle,
  } = useControlDashboardMotion({
    inputMode,
    phase,
    isSettingsOpen,
    settingsMeasuredHeight,
  });

  const startButtonPressedColor =
    options.operation === 'addsub' ? '#07345b' : '#1d3c0b';
  const isVoiceToggleDisabled =
    isActive ||
    (inputMode === 'keypad' &&
      (!voiceState.platformSupported || !voiceState.isAvailable));
  const voiceStatusText =
    inputMode === 'voice' ? voiceState.statusLabel || voiceState.errorMessage : '';

  useEffect(() => {
    if (!isActive) {
      setVoiceHaloColor(VOICE_HALO_COLORS.neutral);
      return;
    }

    if (!voiceStatusText) {
      return;
    }

    setVoiceHaloColor(getVoiceHaloColor(voiceStatusText));
  }, [isActive, voiceStatusText]);

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

  return (
    <View style={styles.keypadBlock}>
      <Animated.View
        pointerEvents={isActive && isInputEnabled ? 'auto' : 'none'}
        style={[
          { alignItems: 'center', width: '100%', backgroundColor: theme.bg, zIndex: 10 },
          keypadWrapperStyle,
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

      <Animated.View
        pointerEvents="none"
        style={[
          { alignItems: 'center', width: '100%', backgroundColor: theme.bg, zIndex: 10 },
          voiceIconWrapperStyle,
        ]}
      >
        <Animated.View style={[{ width: '100%', alignItems: 'center' }, voiceIconContentStyle]}>
          <IconVoiceInputMicrophone width={330} haloFill={voiceHaloColor} />
        </Animated.View>
      </Animated.View>

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
            gearStyle,
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

        <Animated.View
          style={[
            {
              position: 'absolute',
              left: '50%',
              marginLeft:
                -(START_BUTTON_WIDTH / 2) - MIC_BUTTON_SIZE - MIC_BUTTON_GAP,
              top: (START_BUTTON_HEIGHT - MIC_BUTTON_SIZE) / 2,
              width: MIC_BUTTON_SIZE,
              height: MIC_BUTTON_SIZE,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isVoiceToggleDisabled ? 0.38 : 1,
              zIndex: 0,
            },
            inputToggleStyle,
          ]}
        >
          <Pressable
            style={{
              width: MIC_BUTTON_SIZE,
              height: MIC_BUTTON_SIZE,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel={
              inputMode === 'keypad'
                ? 'Switch to voice input'
                : 'Switch to keypad input'
            }
            onPress={onToggleInputMode}
            disabled={isVoiceToggleDisabled}
          >
            <IconInputModeToggle
              size={MIC_BUTTON_SIZE}
              operation={options.operation}
              inputMode={inputMode}
            />
          </Pressable>
        </Animated.View>

        <Pressable
          style={[
            styles.startBtn,
            {
              backgroundColor: isStartButtonFlashActive
                ? startButtonPressedColor
                : opTheme.textOperand,
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
            },
          ]}
        >
          {voiceStatusText || ' '}
        </Text>
      </View>

      <OperationSelector
        operation={options.operation}
        isActive={isActive}
        isStadiumActive={isStadiumActive}
        onToggleOperation={() =>
          onUpdateOptions({
            type: 'setOperation',
            operation: options.operation === 'addsub' ? 'multdiv' : 'addsub',
          })
        }
      />

      <Animated.View style={[{ width: '100%' }, settingsWrapperStyle]}>
        <Animated.View style={[{ width: '100%' }, settingsContentStyle]}>
          <View
            onLayout={event => {
              const height = Math.ceil(event.nativeEvent.layout.height);
              if (height > 0 && height !== settingsMeasuredHeight) {
                setSettingsMeasuredHeight(height);
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
