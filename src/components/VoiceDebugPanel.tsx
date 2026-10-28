import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/colors';
import { attachVoiceDebugAudioLogging } from '../lib/expoSpeechRecognitionAdapter';
import {
  formatVoiceDebugEntry,
  getVoiceDebugEntries,
  isVoiceDebugEnabled,
  resetVoiceDebugLog,
  subscribeVoiceDebug,
} from '../lib/voiceDebugLog';
import {
  copyVoiceDebugReport,
  shareVoiceDebugReport,
} from '../lib/voiceDebugShare';

const VISIBLE_LINES = 80;

// Shown only when the page URL ends in ?debug=1. A collapsed bar at the bottom
// of the screen; tap the title to open the recent events as plain text. Share
// saves the whole log as a .txt file via the phone's share sheet, Copy puts it
// on the clipboard, Clear starts a fresh log.
export function VoiceDebugPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const entries = React.useSyncExternalStore(
    subscribeVoiceDebug,
    getVoiceDebugEntries
  );
  const enabled = isVoiceDebugEnabled();

  React.useEffect(() => attachVoiceDebugAudioLogging(), []);

  if (!enabled) {
    return null;
  }

  const run = async (action: () => Promise<string>) => {
    setMessage(await action());
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <Pressable style={styles.title} onPress={() => setIsOpen(open => !open)}>
          <Text style={styles.text}>
            {`voice debug · ${entries.length} ${isOpen ? '▼' : '▲'}`}
          </Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => void run(shareVoiceDebugReport)}
        >
          <Text style={styles.text}>Share</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => void run(copyVoiceDebugReport)}
        >
          <Text style={styles.text}>Copy</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            resetVoiceDebugLog();
            setMessage('Cleared');
          }}
        >
          <Text style={styles.text}>Clear</Text>
        </Pressable>
      </View>
      {message ? <Text style={styles.text}>{message}</Text> : null}
      {isOpen ? (
        <ScrollView style={styles.log}>
          {entries.slice(-VISIBLE_LINES).map(entry => (
            <Text key={entry.id} style={styles.line}>
              {formatVoiceDebugEntry(entry)}
            </Text>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.textMain,
    zIndex: 1000,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    paddingVertical: 6,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.textMuted,
  },
  text: {
    color: theme.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  log: {
    height: 180,
    marginTop: 4,
  },
  line: {
    color: theme.bg,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
