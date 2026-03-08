import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SessionOptions } from '../lib/types';
import { theme } from '../theme/colors';

// Since Picker isn't built into basic RN in modern Expo without @react-native-picker/picker,
// we'll build a simple custom select row or just rely on a standard UI. For simplicity,
// we'll abstract the selections into custom buttons or use simple Text fields that cycle values on press.

interface SettingsPanelProps {
    options: SessionOptions;
    updateOptions: (opts: Partial<SessionOptions>) => void;
    useTimer: boolean;
    setUseTimer: (val: boolean) => void;
    disabled?: boolean;
    onClose?: () => void;
}

export function SettingsPanel({
    options,
    updateOptions,
    useTimer,
    setUseTimer,
    disabled,
    onClose
}: SettingsPanelProps) {


    const cycleOrder = () => {
        if (disabled) return;
        updateOptions({ problemOrder: options.problemOrder === 'random' ? 'standard' : 'random' });
    };

    const cycleOperandOrder = () => {
        if (disabled) return;
        const orders: SessionOptions['operandOrder'][] = ['random', 'standard', 'reverse'];
        const nextIdx = (orders.indexOf(options.operandOrder) + 1) % orders.length;
        updateOptions({ operandOrder: orders[nextIdx] });
    };

    const cycleMissing = () => {
        if (disabled) return;
        const missingOps: SessionOptions['missingValue'][] = ['random', 'result', 'operand'];
        const nextIdx = (missingOps.indexOf(options.missingValue) + 1) % missingOps.length;
        updateOptions({ missingValue: missingOps[nextIdx] });
    };

    const toggleChip = (val: number) => {
        if (disabled) return;

        // Changing standard chips removes custom set
        if (options.customSet) {
            updateOptions({ customSet: null, activeChips: [val] });
            return;
        }

        const current = new Set(options.activeChips);
        if (current.has(val)) {
            current.delete(val);
        } else {
            current.add(val);
        }
        updateOptions({ activeChips: Array.from(current).sort((a, b) => a - b) });
    };

    const toggleAllChips = () => {
        if (disabled) return;
        updateOptions({ customSet: null });
        if (options.activeChips.length === 9) {
            updateOptions({ activeChips: [] });
        } else {
            updateOptions({ activeChips: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
        }
    };

    const setCustomSet = (set: '10s' | 'doubles') => {
        if (disabled) return;
        updateOptions({ customSet: options.customSet === set ? null : set, activeChips: [] });
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Settings</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>Done</Text>
                    </TouchableOpacity>
                )}
            </View>


            <View style={styles.controlGroup}>
                <Text style={styles.label}>Problem order</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={cycleOrder} disabled={disabled}>
                    <Text style={styles.selectBtnText}>
                        {options.problemOrder === 'random' ? 'Random' : 'Standard'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.controlGroup}>
                <Text style={styles.label}>Operand order</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={cycleOperandOrder} disabled={disabled}>
                    <Text style={styles.selectBtnText}>{options.operandOrder}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.controlGroup}>
                <Text style={styles.label}>Missing value</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={cycleMissing} disabled={disabled}>
                    <Text style={styles.selectBtnText}>{
                        options.missingValue === 'result' ? 'Result only' :
                            options.missingValue === 'operand' ? 'Operand only' : 'Random'
                    }</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.controlGroup}>
                <Text style={styles.label}>Problem set</Text>
                <View style={styles.chipGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                        const isActive = !options.customSet && options.activeChips.includes(num);
                        return (
                            <TouchableOpacity key={num}
                                style={[styles.chip, isActive && styles.chipActive, disabled && styles.chipDisabled]}
                                onPress={() => toggleChip(num)} disabled={disabled}
                            >
                                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{num}</Text>
                            </TouchableOpacity>
                        )
                    })}
                    <TouchableOpacity
                        style={[styles.chip, !options.customSet && options.activeChips.length > 0 && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={toggleAllChips} disabled={disabled}
                    >
                        <Text style={[styles.chipText, !options.customSet && options.activeChips.length > 0 && styles.chipTextActive]}>
                            {!options.customSet && options.activeChips.length === 9 ? 'Clr' : 'All'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.controlGroup}>
                <Text style={styles.label}>Custom problem sets</Text>
                <View style={styles.chipGridWide}>
                    <TouchableOpacity
                        style={[styles.chipWide, options.customSet === '10s' && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={() => setCustomSet('10s')} disabled={disabled}
                    >
                        <Text style={[styles.chipText, options.customSet === '10s' && styles.chipTextActive]}>10's</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chipWide, options.customSet === 'doubles' && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={() => setCustomSet('doubles')} disabled={disabled}
                    >
                        <Text style={[styles.chipText, options.customSet === 'doubles' && styles.chipTextActive, { fontFamily: 'serif', fontStyle: 'italic' }]}>
                            n + n
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.controlGroup, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={[styles.label, { marginBottom: 0, marginRight: 15 }]}>Session timer</Text>
                <Switch
                    value={useTimer}
                    onValueChange={setUseTimer}
                    disabled={disabled}
                    trackColor={{ false: theme.cardOperandBg, true: theme.textMuted }}
                />
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        marginVertical: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'condensedBold' as any,
        color: theme.textMuted,
        textTransform: 'uppercase',
    },
    closeBtn: {
        padding: 8,
        backgroundColor: theme.bg,
        borderRadius: 4,
    },
    closeBtnText: {
        fontWeight: 'bold',
        color: theme.textMain,
    },
    controlGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: 5,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    selectBtn: {
        padding: 12,
        backgroundColor: theme.bg,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.cardOperandBg,
    },
    selectBtnText: {
        fontSize: 16,
        color: theme.textMain,
        textTransform: 'capitalize',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.cardOperandBg,
        borderRadius: 4,
    },
    chipWide: {
        flex: 1,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.cardOperandBg,
        borderRadius: 4,
    },
    chipGridWide: {
        flexDirection: 'row',
        gap: 8,
    },
    chipActive: {
        backgroundColor: theme.textMuted,
        borderColor: theme.textMuted,
    },
    chipText: {
        fontSize: 16,
        color: theme.textMuted,
        fontWeight: 'bold',
    },
    chipTextActive: {
        color: '#fff',
    },
    chipDisabled: {
        opacity: 0.5,
    }
});
