import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme/colors';
import {
  formatVoiceDebugEntry,
  getVoiceDebugEntries,
  isVoiceDebugEnabled,
  subscribeVoiceDebug,
} from '../lib/voiceDebugLog';

// Shown only when the page URL ends in ?debug=1. It lists recent speech events
// so voice problems can be diagnosed from a phone screenshot. Tap the strip to
// move it between the bottom and top of the screen.
export function VoiceDebugOverlay() {
  const [isAtTop, setIsAtTop] = React.useState(false);
  const entries = React.useSyncExternalStore(
    subscribeVoiceDebug,
    getVoiceDebugEntries
  );

  if (!isVoiceDebugEnabled()) {
    return null;
  }

  return (
    <Pressable
      onPress={() => setIsAtTop(value => !value)}
      style={[styles.container, isAtTop ? styles.atTop : styles.atBottom]}
    >
      <Text style={styles.title}>voice debug</Text>
      {entries.length === 0 ? (
        <Text style={styles.line}>(no speech events yet)</Text>
      ) : (
        entries.map(entry => (
          <Text key={entry.id} style={styles.line} numberOfLines={1}>
            {formatVoiceDebugEntry(entry)}
          </Text>
        ))
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.textMain,
    opacity: 0.92,
    zIndex: 1000,
  },
  atTop: {
    top: 0,
  },
  atBottom: {
    bottom: 0,
  },
  title: {
    color: theme.bg,
    fontSize: 10,
    fontWeight: '700',
  },
  line: {
    color: theme.bg,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
