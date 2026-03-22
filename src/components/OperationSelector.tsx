import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Image as SvgImage, Rect } from 'react-native-svg';
import { OperationMode } from '../lib/types';
import { getOperationTheme } from '../theme/colors';

const STADIUM_WIDTH = 316;
const STADIUM_HEIGHT = 36;

function StadiumGraphic({
  fill,
  stroke,
  strokeWidth = 0,
  showShadow = false,
}: {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  showShadow?: boolean;
}) {
  return (
    <Svg
      width={STADIUM_WIDTH}
      height={STADIUM_HEIGHT}
      viewBox={`0 0 ${STADIUM_WIDTH} ${STADIUM_HEIGHT}`}
      style={StyleSheet.absoluteFill}
    >
      <Rect
        width={STADIUM_WIDTH}
        height={STADIUM_HEIGHT}
        rx={18}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {showShadow ? (
        <SvgImage
          x={-6}
          y={-6}
          width={328}
          height={51}
          href={require('../../assets/stadium-shadow.png')}
          preserveAspectRatio="none"
        />
      ) : null}
    </Svg>
  );
}

interface OperationSelectorProps {
  operation: OperationMode;
  isActive: boolean;
  isStadiumActive: boolean;
  onToggleOperation: () => void;
}

export function OperationSelector({ operation, isActive, isStadiumActive, onToggleOperation }: OperationSelectorProps) {
  const opTheme = getOperationTheme(operation);
  const stadiumBorderColor = operation === 'addsub' ? '#A6C1DE' : '#AFC6A6';

  return (
    <View style={styles.container}>
      {isStadiumActive ? (
        <StadiumGraphic fill="#FFFFFF" stroke="transparent" strokeWidth={1} showShadow />
      ) : (
        <StadiumGraphic fill="transparent" stroke="transparent" strokeWidth={1} showShadow />
      )}

      {isActive ? (
        <View style={styles.labelRow}>
          <Text style={[styles.text, { color: opTheme.logoMath }]}>{operation === 'addsub' ? 'addition' : 'multiplication'}</Text>
          <Text style={[styles.text, { color: opTheme.logoFlash }]}>{operation === 'addsub' ? 'subtraction' : 'division'}</Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleOperation}
          style={styles.labelRow}
          hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
        >
          <Text style={[styles.text, { color: opTheme.logoMath }]}>{operation === 'addsub' ? 'addition' : 'multiplication'}</Text>
          <Text style={[styles.text, { color: opTheme.logoFlash }]}>{operation === 'addsub' ? 'subtraction' : 'division'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: STADIUM_WIDTH,
    height: STADIUM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 5,
  },
  labelRow: {
    width: STADIUM_WIDTH,
    height: STADIUM_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Fredoka_400Regular',
  },
});
