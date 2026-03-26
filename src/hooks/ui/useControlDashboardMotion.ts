import { useEffect, useRef } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SessionInputMode } from '../../lib/types';
import { isSessionPhaseActive } from '../../lib/sessionPhases';
import { sessionPrepMarks, sessionPrepTimeline } from '../../lib/sessionPrepTimeline';

const KEYPAD_CONTENT_HEIGHT = 232;
const KEYPAD_REVEAL_HEIGHT = KEYPAD_CONTENT_HEIGHT + 20;
const VOICE_ICON_CONTENT_HEIGHT = 240;
const VOICE_ICON_REVEAL_HEIGHT = VOICE_ICON_CONTENT_HEIGHT + 20;
const SETTINGS_REVEAL_MARGIN = 5;
const SETTINGS_FALLBACK_HEIGHT = 240;
const GEAR_REVEAL_OFFSET = 145;

interface UseControlDashboardMotionArgs {
  inputMode: SessionInputMode;
  phase: Parameters<typeof isSessionPhaseActive>[0];
  isSettingsOpen: boolean;
  settingsMeasuredHeight: number;
  trayVisibleOverlap: number;
}

export function useControlDashboardMotion({
  inputMode,
  phase,
  isSettingsOpen,
  settingsMeasuredHeight,
  trayVisibleOverlap,
}: UseControlDashboardMotionArgs) {
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const untuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keypadHeight = useSharedValue(0);
  const keypadSlide = useSharedValue(-KEYPAD_CONTENT_HEIGHT);
  const voiceIconHeight = useSharedValue(0);
  const voiceIconSlide = useSharedValue(-VOICE_ICON_CONTENT_HEIGHT);
  const settingsRevealHeight = useSharedValue(0);
  const settingsSpacerHeight = useSharedValue(0);
  const gearOffset = useSharedValue(GEAR_REVEAL_OFFSET);
  const inputToggleOffset = useSharedValue(0);
  const isSessionInProgress = isSessionPhaseActive(phase);

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
      gearOffset.value = withTiming(0, {
        duration: sessionPrepTimeline.tuck,
        easing: Easing.inOut(Easing.cubic),
      });
      inputToggleOffset.value = withTiming(GEAR_REVEAL_OFFSET, {
        duration: sessionPrepTimeline.tuck,
        easing: Easing.inOut(Easing.cubic),
      });

      rollTimeoutRef.current = setTimeout(() => {
        if (inputMode === 'keypad') {
          keypadHeight.value = withTiming(KEYPAD_REVEAL_HEIGHT, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          keypadSlide.value = withTiming(0, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          voiceIconSlide.value = withTiming(-VOICE_ICON_CONTENT_HEIGHT, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          voiceIconHeight.value = withTiming(0, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
        } else {
          voiceIconHeight.value = withTiming(VOICE_ICON_REVEAL_HEIGHT, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          voiceIconSlide.value = withTiming(0, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          keypadSlide.value = withTiming(-KEYPAD_CONTENT_HEIGHT, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
          keypadHeight.value = withTiming(0, {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          });
        }
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
      voiceIconSlide.value = withTiming(-VOICE_ICON_CONTENT_HEIGHT, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
      voiceIconHeight.value = withTiming(0, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });

      untuckTimeoutRef.current = setTimeout(() => {
        gearOffset.value = withTiming(GEAR_REVEAL_OFFSET, {
          duration: sessionPrepTimeline.tuck,
          easing: Easing.out(Easing.cubic),
        });
        inputToggleOffset.value = withTiming(0, {
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
  }, [
    gearOffset,
    inputMode,
    inputToggleOffset,
    isSessionInProgress,
    keypadHeight,
    keypadSlide,
    voiceIconHeight,
    voiceIconSlide,
  ]);

  useEffect(() => {
    const settingsTargetRevealHeight =
      (settingsMeasuredHeight > 0
        ? settingsMeasuredHeight
        : SETTINGS_FALLBACK_HEIGHT) + SETTINGS_REVEAL_MARGIN;
    const settingsTargetSpacerHeight = Math.max(
      0,
      settingsTargetRevealHeight - trayVisibleOverlap
    );

    if (isSettingsOpen) {
      settingsRevealHeight.value = withTiming(settingsTargetRevealHeight, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
      settingsSpacerHeight.value = withTiming(settingsTargetSpacerHeight, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
    } else {
      settingsRevealHeight.value = withTiming(0, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
      settingsSpacerHeight.value = withTiming(0, {
        duration: sessionPrepTimeline.roll,
        easing: Easing.linear,
      });
    }
  }, [
    isSettingsOpen,
    settingsMeasuredHeight,
    settingsRevealHeight,
    settingsSpacerHeight,
    trayVisibleOverlap,
  ]);

  return {
    isSessionInProgress,
    keypadWrapperStyle: useAnimatedStyle(() => ({
      height: keypadHeight.value,
      overflow: 'hidden' as const,
    })),
    keypadContentStyle: useAnimatedStyle(() => ({
      transform: [{ translateY: keypadSlide.value }],
    })),
    voiceIconWrapperStyle: useAnimatedStyle(() => ({
      height: voiceIconHeight.value,
      overflow: 'hidden' as const,
    })),
    voiceIconContentStyle: useAnimatedStyle(() => ({
      transform: [{ translateY: voiceIconSlide.value }],
    })),
    gearStyle: useAnimatedStyle(() => ({
      transform: [{ translateX: gearOffset.value }],
    })),
    inputToggleStyle: useAnimatedStyle(() => ({
      transform: [{ translateX: inputToggleOffset.value }],
    })),
    settingsRevealStyle: useAnimatedStyle(() => ({
      height: settingsRevealHeight.value,
      overflow: 'hidden' as const,
    })),
    settingsSpacerStyle: useAnimatedStyle(() => ({
      height: settingsSpacerHeight.value,
    })),
  };
}
