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
  const logoColors = {
    logoMath: currentTheme.logoMath,
    logoFlash: currentTheme.logoFlash,
    tagline: currentTheme.tagline,
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <LogoWithTagline colors={logoColors} />
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
