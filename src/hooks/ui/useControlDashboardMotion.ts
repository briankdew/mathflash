import { useEffect, useRef } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SessionInputMode } from '../../lib/types';
import { isSessionPhaseActive } from '../../lib/sessionPhases';
import { sessionPrepMarks, sessionPrepTimeline } from '../../lib/sessionPrepTimeline';

const INPUT_CONTENT_HEIGHT = 231;
const INPUT_CONTENT_MARGIN_BOTTOM = 6;
const INPUT_VIEWPORT_HEIGHT = INPUT_CONTENT_HEIGHT + INPUT_CONTENT_MARGIN_BOTTOM;
const INPUT_INACTIVE_OFFSET = INPUT_VIEWPORT_HEIGHT;
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
  const keypadOffset = useSharedValue(0);
  const voiceIconOffset = useSharedValue(INPUT_INACTIVE_OFFSET);
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
        keypadOffset.value = withTiming(
          inputMode === 'keypad' ? 0 : -INPUT_INACTIVE_OFFSET,
          {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          }
        );
        voiceIconOffset.value = withTiming(
          inputMode === 'keypad' ? INPUT_INACTIVE_OFFSET : 0,
          {
            duration: sessionPrepTimeline.roll,
            easing: Easing.linear,
          }
        );
        rollTimeoutRef.current = null;
      }, sessionPrepMarks.keypadRollStartAt);
    } else {
      keypadOffset.value = withTiming(
        inputMode === 'keypad' ? 0 : -INPUT_INACTIVE_OFFSET,
        {
          duration: sessionPrepTimeline.roll,
          easing: Easing.linear,
        }
      );
      voiceIconOffset.value = withTiming(
        inputMode === 'keypad' ? INPUT_INACTIVE_OFFSET : 0,
        {
          duration: sessionPrepTimeline.roll,
          easing: Easing.linear,
        }
      );

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
    keypadOffset,
    voiceIconOffset,
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
    keypadContentStyle: useAnimatedStyle(() => ({
      transform: [{ translateY: keypadOffset.value }],
    })),
    voiceIconContentStyle: useAnimatedStyle(() => ({
      transform: [{ translateY: voiceIconOffset.value }],
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
