import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OperationMode } from '../lib/types';
import { getOperationTheme } from '../theme/colors';
import { LogoWithTagline } from './icons/LogoWithTagline';

interface HeaderProps {
  operation: OperationMode;
}

export function Header({ operation }: HeaderProps) {
  const currentTheme = getOperationTheme(operation);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <LogoWithTagline colors={currentTheme} />
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
});
