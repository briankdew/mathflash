import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { OperationMode } from '../lib/types';
import { getOperationTheme } from '../theme/colors';
import { LogoWithTagline } from './icons/LogoWithTagline';

interface HeaderProps {
  operation: OperationMode;
  onOpenSettings?: () => void;
}

export function Header({ operation, onOpenSettings }: HeaderProps) {
  const currentTheme = getOperationTheme(operation);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <LogoWithTagline colors={currentTheme} />
        <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
          <FontAwesome name="gear" size={20} color={currentTheme.tagline} />
        </TouchableOpacity>
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    paddingHorizontal: 20,
  },
  settingsBtn: {
    position: 'absolute',
    right: 20,
    padding: 10,
  },
});
