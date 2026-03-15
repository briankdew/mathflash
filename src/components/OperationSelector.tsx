import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Defs, Filter, FeFlood, FeBlend, FeColorMatrix, FeOffset, FeGaussianBlur, FeComposite, Rect } from 'react-native-svg';
import { OperationMode } from '../lib/types';
import { getOperationTheme } from '../theme/colors';

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
        <Svg width="353" height="36" viewBox="0 0 353 36" style={StyleSheet.absoluteFill}>
          <Defs>
            <Filter id="operationSelectorShadow" x="-0.03" y="-0.15" width="1.06" height="1.3" filterUnits="objectBoundingBox">
              <FeFlood floodOpacity="0" result="BackgroundImageFix" />
              <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <FeOffset dy="1.5" />
              <FeGaussianBlur stdDeviation="1.5" />
              <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1" />
              <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0" />
              <FeBlend mode="normal" in2="shape" result="effect1_innerShadow" />
            </Filter>
          </Defs>
          <Rect width="353" height="36" rx="18" fill="#FFFFFF" filter="url(#operationSelectorShadow)" />
        </Svg>
      ) : (
        <View style={[styles.borderOnly, { borderColor: stadiumBorderColor }]} pointerEvents="none" />
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
    width: 353,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 5,
  },
  borderOnly: {
    ...StyleSheet.absoluteFillObject,
    width: 353,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  labelRow: {
    height: 36,
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
