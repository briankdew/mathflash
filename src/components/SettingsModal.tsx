import React from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { SettingsPanel } from './SettingsPanel';
import { SessionOptions } from '../lib/types';
import { theme } from '../theme/colors';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    options: SessionOptions;
    updateOptions: (opts: Partial<SessionOptions>) => void;
    useTimer: boolean;
    setUseTimer: (val: boolean) => void;
    disabled?: boolean;
}

export function SettingsModal({
    visible,
    onClose,
    options,
    updateOptions,
    useTimer,
    setUseTimer,
    disabled
}: SettingsModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalSafeArea}>
                <ScrollView>
                    <SettingsPanel
                        options={options}
                        updateOptions={updateOptions}
                        useTimer={useTimer}
                        setUseTimer={setUseTimer}
                        disabled={disabled}
                        onClose={onClose}
                    />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalSafeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
});
