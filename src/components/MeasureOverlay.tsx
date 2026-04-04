import React from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const LINE_COLOR = '#b00131';
const LINE_THICKNESS = 1;
const LABEL_GAP = 2;
const DRAG_HIT_SLOP = 10;
const DRAG_BAND_HEIGHT = DRAG_HIT_SLOP * 2 + LINE_THICKNESS;
const LABEL_HORIZONTAL_PADDING = 6;
const LABEL_VERTICAL_PADDING = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface MeasureOverlayProps {
  enabled: boolean;
  safeAreaHeight: number;
  safeAreaWidth: number;
  lineY: number | null;
  onChangeLineY: (value: number) => void;
  labelX: number | null;
  onChangeLabelX: (value: number) => void;
  lineColor?: string;
}

export function MeasureOverlay({
  enabled,
  safeAreaHeight,
  safeAreaWidth,
  lineY,
  onChangeLineY,
  labelX,
  onChangeLabelX,
  lineColor = LINE_COLOR,
}: MeasureOverlayProps) {
  const overlayRef = React.useRef<View>(null);
  const [labelSize, setLabelSize] = React.useState({ width: 44, height: 22 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [displayLineY, setDisplayLineY] = React.useState(lineY ?? 0);

  const maxLineY = Math.max(0, safeAreaHeight - LINE_THICKNESS);
  const lineYValue = useSharedValue(clamp(Math.round(lineY ?? 0), 0, maxLineY));
  const labelXValue = useSharedValue(
    clamp(Math.round(labelX ?? safeAreaWidth / 2), 0, Math.max(0, safeAreaWidth))
  );
  const overlayOriginX = useSharedValue(0);
  const overlayOriginY = useSharedValue(0);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const nextLineY = clamp(Math.round(lineY ?? safeAreaHeight / 2), 0, maxLineY);
    lineYValue.value = nextLineY;
    setDisplayLineY(nextLineY);
  }, [enabled, lineY, lineYValue, maxLineY, safeAreaHeight]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const nextLabelX = clamp(
      Math.round(labelX ?? safeAreaWidth / 2),
      0,
      Math.max(0, safeAreaWidth)
    );
    labelXValue.value = nextLabelX;
  }, [enabled, labelX, labelXValue, safeAreaWidth]);

  useAnimatedReaction(
    () => ({
      lineY: Math.round(lineYValue.value),
      labelX: Math.round(labelXValue.value),
    }),
    (next, prev) => {
      if (!prev || next.lineY !== prev.lineY) {
        runOnJS(setDisplayLineY)(next.lineY);
      }
    },
    []
  );

  const setDraggingTrue = React.useCallback(() => setIsDragging(true), []);
  const setDraggingFalse = React.useCallback(() => setIsDragging(false), []);

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          runOnJS(setDraggingTrue)();
        })
        .onUpdate(event => {
          const nextLineY = clamp(
            Math.round(event.absoluteY - overlayOriginY.value),
            0,
            maxLineY
          );
          const nextLabelX = clamp(
            Math.round(event.absoluteX - overlayOriginX.value),
            0,
            Math.max(0, safeAreaWidth)
          );

          lineYValue.value = nextLineY;
          labelXValue.value = nextLabelX;
        })
        .onFinalize(() => {
          runOnJS(setDraggingFalse)();
          runOnJS(onChangeLineY)(Math.round(lineYValue.value));
          runOnJS(onChangeLabelX)(Math.round(labelXValue.value));
        }),
    [
      labelXValue,
      lineYValue,
      maxLineY,
      onChangeLabelX,
      onChangeLineY,
      overlayOriginX,
      overlayOriginY,
      safeAreaWidth,
      setDraggingFalse,
      setDraggingTrue,
    ]
  );

  const lineStyle = useAnimatedStyle(() => ({
    top: lineYValue.value,
  }));

  const dragBandStyle = useAnimatedStyle(() => ({
    top: clamp(
      lineYValue.value - DRAG_HIT_SLOP,
      0,
      Math.max(0, safeAreaHeight - DRAG_BAND_HEIGHT)
    ),
  }), [safeAreaHeight]);

  const labelStyle = useAnimatedStyle(() => {
    const nextLabelTop =
      lineYValue.value < labelSize.height + LABEL_GAP
        ? clamp(
            lineYValue.value + LINE_THICKNESS + LABEL_GAP,
            0,
            Math.max(0, safeAreaHeight - labelSize.height)
          )
        : clamp(
            lineYValue.value - labelSize.height - LABEL_GAP,
            0,
            Math.max(0, safeAreaHeight - labelSize.height)
          );
    const nextLabelLeft = clamp(
      labelXValue.value - labelSize.width / 2,
      0,
      Math.max(0, safeAreaWidth - labelSize.width)
    );

    return {
      top: nextLabelTop,
      left: nextLabelLeft,
    };
  }, [labelSize.height, labelSize.width, safeAreaHeight, safeAreaWidth]);

  const handleLabelLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== labelSize.width || height !== labelSize.height) {
      setLabelSize({ width, height });
    }
  };

  const handleOverlayLayout = () => {
    overlayRef.current?.measureInWindow((x, y) => {
      overlayOriginX.value = x;
      overlayOriginY.value = y;
    });
  };

  if (!enabled || safeAreaWidth <= 0 || safeAreaHeight <= 0 || lineY === null) {
    return null;
  }

  return (
    <View
      ref={overlayRef}
      onLayout={handleOverlayLayout}
      pointerEvents="box-none"
      style={styles.overlay}
      testID="measure-overlay"
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.dragBand,
            dragBandStyle,
            Platform.OS === 'web'
              ? ({ cursor: isDragging ? 'grabbing' : 'grab' } as never)
              : null,
          ]}
        />
      </GestureDetector>

      <Animated.View
        pointerEvents="none"
        testID="measure-overlay-line"
        style={[
          styles.line,
          {
            backgroundColor: lineColor,
          },
          lineStyle,
        ]}
      />

      <Animated.View
        onLayout={handleLabelLayout}
        pointerEvents="none"
        testID="measure-overlay-label"
        style={[
          styles.label,
          labelStyle,
        ]}
      >
        <Text style={styles.labelText}>{displayLineY}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  dragBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: DRAG_BAND_HEIGHT,
    backgroundColor: 'transparent',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE_THICKNESS,
  },
  label: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: LABEL_HORIZONTAL_PADDING,
    paddingVertical: LABEL_VERTICAL_PADDING,
  },
  labelText: {
    color: '#000000',
    fontSize: 11,
    includeFontPadding: false,
  },
});
