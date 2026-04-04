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

const START_BUTTON_HEIGHT = 40;
const START_BUTTON_MARGIN_BOTTOM = 20;
const START_BUTTON_WIDTH = 215;
const GEAR_BUTTON_WIDTH = 51;
const GEAR_BUTTON_HEIGHT = 39;
const START_BUTTON_FLASH_DURATION_MS = 180;
const MIC_BUTTON_SIZE = 43;
const MIC_BUTTON_GAP = 12;
const INPUT_CONTAINER_WIDTH = 320;
const INPUT_CONTAINER_HEIGHT = 222;
const INPUT_CONTAINER_MARGIN_BOTTOM = 15;
const VOICE_MICROPHONE_WIDTH = (INPUT_CONTAINER_HEIGHT * 330) / 241;
const OPERATION_SELECTOR_HEIGHT = 36;
const SETTINGS_TRAY_TOP_OVERLAP = 10;
const SETTINGS_TRAY_VISIBLE_OVERLAP =
  OPERATION_SELECTOR_HEIGHT + SETTINGS_TRAY_TOP_OVERLAP;
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
  isMeasureOverlayEnabled: boolean;
  setIsMeasureOverlayEnabled: (val: boolean) => void;
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
  isMeasureOverlayEnabled,
  setIsMeasureOverlayEnabled,
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
    settingsRevealStyle,
    settingsSpacerStyle,
  } = useControlDashboardMotion({
    inputMode,
    phase,
    isSettingsOpen,
    settingsMeasuredHeight,
    trayVisibleOverlap: SETTINGS_TRAY_VISIBLE_OVERLAP,
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
        <Animated.View
          style={[
            {
              width: INPUT_CONTAINER_WIDTH,
              height: INPUT_CONTAINER_HEIGHT,
              alignItems: 'center',
              marginBottom: INPUT_CONTAINER_MARGIN_BOTTOM,
            },
            keypadContentStyle,
          ]}
        >
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
        <Animated.View
          style={[
            {
              width: INPUT_CONTAINER_WIDTH,
              height: INPUT_CONTAINER_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: INPUT_CONTAINER_MARGIN_BOTTOM,
            },
            voiceIconContentStyle,
          ]}
        >
          <IconVoiceInputMicrophone width={VOICE_MICROPHONE_WIDTH} haloFill={voiceHaloColor} />
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
              top: (START_BUTTON_HEIGHT - GEAR_BUTTON_HEIGHT) / 2,
            },
            gearStyle,
          ]}
        >
          <TouchableOpacity
            style={{
              width: GEAR_BUTTON_WIDTH,
              height: GEAR_BUTTON_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => !isActive && setIsSettingsOpen(!isSettingsOpen)}
            disabled={isActive}
          >
            {options.operation === 'multdiv' ? (
              <IconSettingsMulDiv size={39} />
            ) : (
              <IconSettingsAddSub size={39} />
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

      </View>

      <View style={{ width: '100%', alignItems: 'center', position: 'relative' }}>
        <Animated.View
          pointerEvents={isSettingsOpen ? 'auto' : 'none'}
          style={[
            {
              position: 'absolute',
              top: -SETTINGS_TRAY_TOP_OVERLAP,
              width: '100%',
              alignItems: 'center',
              zIndex: 1,
            },
            settingsRevealStyle,
          ]}
        >
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
              isMeasureOverlayEnabled={isMeasureOverlayEnabled}
              setIsMeasureOverlayEnabled={setIsMeasureOverlayEnabled}
              disabled={isActive}
            />
          </View>
        </Animated.View>

        <View style={{ zIndex: 2, position: 'relative' }}>
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
        </View>

        <Animated.View style={[{ width: '100%' }, settingsSpacerStyle]} />
      </View>

      <Text
        pointerEvents="none"
        style={[styles.voiceStatusText, { opacity: voiceStatusText ? 1 : 0 }]}
      >
        {voiceStatusText || ' '}
      </Text>
    </View>
  );
}
