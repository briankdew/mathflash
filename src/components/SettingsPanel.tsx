import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Defs, Filter, FeFlood, FeBlend, FeColorMatrix, FeOffset, FeGaussianBlur, FeComposite, Rect } from 'react-native-svg';
import { SessionOptions } from '../lib/types';
import { SessionOptionsUpdate } from '../lib/sessionOptions';
import { theme, palette } from '../theme/colors';

const InnerShadowBox = ({ width, height, rx, fill }: { width: number; height: number; rx: number, fill: string }) => (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        <Defs>
            <Filter id="chipInnerShadow" x="-0.2" y="-0.2" width="1.4" height="1.4" filterUnits="objectBoundingBox">
                <FeFlood floodOpacity="0" result="BackgroundImageFix" />
                <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <FeOffset dy="3" />
                <FeGaussianBlur stdDeviation="1.6" />
                <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1" />
                <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0" />
                <FeBlend mode="normal" in2="shape" result="effect1_innerShadow" />
            </Filter>
        </Defs>
        <Rect width={width} height={height} rx={rx} fill={fill} filter="url(#chipInnerShadow)" />
    </Svg>
);

interface SettingsPanelProps {
    options: SessionOptions;
    updateOptions: (update: SessionOptionsUpdate) => void;
    useTimer: boolean;
    setUseTimer: (val: boolean) => void;
    disabled?: boolean;
}

export function SettingsPanel({
    options,
    updateOptions,
    useTimer,
    setUseTimer,
    disabled,
}: SettingsPanelProps) {
    const isAddSubOperation = options.operation === 'addsub';
    const isAllMode = !options.customSet && options.activeChips.length === 9;

    const cycleOrder = () => {
        if (disabled) return;
        updateOptions({ type: 'cycleProblemOrder' });
    };

    const cycleOperandOrder = () => {
        if (disabled) return;
        updateOptions({ type: 'cycleOperandOrder' });
    };

    const cycleMissing = () => {
        if (disabled) return;
        updateOptions({ type: 'cycleMissingValue' });
    };

    const cyclePracticeCycles = () => {
        if (disabled) return;
        updateOptions({ type: 'cyclePracticeCycles' });
    };

    const toggleSetsMode = () => {
        if (disabled || options.practiceCycles <= 1) return;
        updateOptions({ type: 'toggleSetsMode' });
    };

    const toggleChip = (val: number) => {
        if (disabled) return;
        updateOptions({ type: 'toggleChip', value: val });
    };

    const toggleAllChips = () => {
        if (disabled) return;
        updateOptions({ type: 'toggleAllChips' });
    };

    const setCustomSet = (set: '10s' | 'doubles' | 'squares') => {
        if (disabled) return;
        updateOptions({ type: 'toggleCustomSet', customSet: set });
    };

    const setsDisplayValue =
        options.practiceCycles <= 1
            ? '1'
            : options.setsMode === 'single'
                ? '1'
                : String(options.practiceCycles);

    return (
        <View style={styles.container}>
            <View style={styles.controlGroup}>
                <View style={styles.digitGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                        const isActive = !options.customSet && options.activeChips.includes(num);
                        return (
                            <TouchableOpacity key={num}
                                style={[styles.digitBox, isActive && styles.chipActive, disabled && styles.chipDisabled]}
                                onPress={() => toggleChip(num)} disabled={disabled}
                            >
                                {isActive && <InnerShadowBox width={64} height={44} rx={10} fill="#C0BEB1" />}
                                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{num}</Text>
                            </TouchableOpacity>
                        )
                    })}
                    <TouchableOpacity
                        style={[styles.digitBox, isAllMode && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={toggleAllChips} disabled={disabled}
                    >
                        {isAllMode && <InnerShadowBox width={64} height={44} rx={10} fill="#C0BEB1" />}
                        <Text style={[styles.chipTextAllClr, isAllMode && styles.chipTextActive]}>
                            {isAllMode ? "Clear\nAll" : "Select\nAll"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.customRow}>
                {isAddSubOperation ? (
                    <>
                        <TouchableOpacity
                            style={[styles.digitBox, options.customSet === '10s' && styles.chipActive, disabled && styles.chipDisabled]}
                            onPress={() => setCustomSet('10s')} disabled={disabled}
                        >
                            {options.customSet === '10s' && <InnerShadowBox width={64} height={44} rx={10} fill="#C0BEB1" />}
                            <Text style={[styles.chipText, options.customSet === '10s' && styles.chipTextActive]}>10's</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.digitBox, options.customSet === 'doubles' && styles.chipActive, disabled && styles.chipDisabled]}
                            onPress={() => setCustomSet('doubles')} disabled={disabled}
                        >
                            {options.customSet === 'doubles' && <InnerShadowBox width={64} height={44} rx={10} fill="#C0BEB1" />}
                            <Text style={[styles.chipTextMath, options.customSet === 'doubles' && styles.chipTextActiveMath]}>
                                n+n
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={[styles.digitBox, options.customSet === 'squares' && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={() => setCustomSet('squares')} disabled={disabled}
                    >
                        {options.customSet === 'squares' && <InnerShadowBox width={64} height={44} rx={10} fill="#C0BEB1" />}
                        <Text style={[styles.chipTextMath, options.customSet === 'squares' && styles.chipTextActiveMath]}>
                            n²
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.compactSettingBtn, disabled && styles.chipDisabled]}
                    onPress={cyclePracticeCycles}
                    disabled={disabled}
                >
                    <Text style={styles.compactSettingLabel}>CYC</Text>
                    <Text style={styles.compactSettingValue}>{options.practiceCycles}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.compactSettingBtn, (disabled || options.practiceCycles <= 1) && styles.chipDisabled]}
                    onPress={toggleSetsMode}
                    disabled={disabled || options.practiceCycles <= 1}
                >
                    <Text style={styles.compactSettingLabel}>SETS</Text>
                    <Text style={styles.compactSettingValue}>{setsDisplayValue}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.settingsRow}>
                <View style={styles.settingItem}>
                    <Text style={styles.label}>PO</Text>
                    <TouchableOpacity style={[styles.selectBtn, disabled && styles.chipDisabled]} onPress={cycleOrder} disabled={disabled}>
                        <Text style={styles.selectBtnText}>{options.problemOrder === 'random' ? 'Ran' : 'Std'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.label}>OO</Text>
                    <TouchableOpacity style={[styles.selectBtn, disabled && styles.chipDisabled]} onPress={cycleOperandOrder} disabled={disabled}>
                        <Text style={styles.selectBtnText}>
                            {options.operandOrder === 'random' ? 'Ran' : options.operandOrder === 'standard' ? 'Std' : 'Rev'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.label}>MV</Text>
                    <TouchableOpacity style={[styles.selectBtn, disabled && styles.chipDisabled]} onPress={cycleMissing} disabled={disabled}>
                        <Text style={styles.selectBtnText}>
                            {options.missingValue === 'result' ? 'Res' : options.missingValue === 'operand' ? 'Opd' : 'Ran'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.label}>TIMER</Text>
                    <TouchableOpacity
                        style={[styles.timerBox, useTimer && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={() => setUseTimer(!useTimer)} disabled={disabled}
                    >
                        {useTimer && <InnerShadowBox width={44} height={44} rx={10} fill="#C0BEB1" />}
                        <Text style={[styles.chipTextAllClr, useTimer && styles.chipTextActive]}>
                            {useTimer ? "On" : "Off"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.label}>START</Text>
                    <TouchableOpacity
                        style={[styles.timerBox, options.startMode === 'full' && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={() => updateOptions({ type: 'toggleStartMode' })}
                        disabled={disabled}
                    >
                        {options.startMode === 'full' && <InnerShadowBox width={44} height={44} rx={10} fill="#C0BEB1" />}
                        <Text style={[styles.chipTextAllClr, options.startMode === 'full' && styles.chipTextActive]}>
                            {options.startMode === 'full' ? "Full" : "Min"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.label}>REPORT</Text>
                    <TouchableOpacity
                        style={[styles.timerBox, options.autoShowPerformanceReport && styles.chipActive, disabled && styles.chipDisabled]}
                        onPress={() => updateOptions({ type: 'toggleAutoShowPerformanceReport' })}
                        disabled={disabled}
                    >
                        {options.autoShowPerformanceReport && <InnerShadowBox width={44} height={44} rx={10} fill="#C0BEB1" />}
                        <Text style={[styles.chipTextAllClr, options.autoShowPerformanceReport && styles.chipTextActive]}>
                            {options.autoShowPerformanceReport ? "On" : "Off"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        paddingHorizontal: 20,
        backgroundColor: 'transparent',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: 6,
        width: 352,
        alignSelf: 'center',
    },
    controlGroup: {
        marginBottom: 8,
    },
    customRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        width: 352,
        alignSelf: 'center',
        marginBottom: 16, // Double spacing (8 -> 16) before row four
    },
    settingItem: {
        alignItems: 'center',
        marginTop: -2,
    },
    controlGroupSquare: {
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        color: theme.textMuted,
        marginTop: -3,
        marginBottom: 5,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    selectBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#C0BEB1', // Temporary visibility update: matching selected chip
        borderRadius: 10,
    },
    selectBtnText: {
        fontSize: 16, // Matching 'Clear/Select All' button size for fit
        color: '#615e4e', // Matching selected chip text color
        fontFamily: 'NotoSans_500Medium',
    },
    compactSettingBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#C0BEB1',
        borderRadius: 10,
    },
    compactSettingLabel: {
        position: 'absolute',
        top: 5,
        fontSize: 8,
        lineHeight: 9,
        letterSpacing: 0.2,
        color: '#615e4e',
        fontFamily: 'Archivo_400Regular',
    },
    compactSettingValue: {
        marginTop: 9,
        fontSize: 16,
        color: '#615e4e',
        fontFamily: 'NotoSans_500Medium',
    },
    digitGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        width: 352,
        alignSelf: 'center',
    },
    digitBox: {
        width: 64,
        height: 44, justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: palette.bg, // Matches screen background
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 3,
    },
    timerBox: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: palette.bg,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 3,
    },
    chipGridWide: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.beige[1],
        borderRadius: 10,
    },
    chipActive: {
        backgroundColor: '#C0BEB1',
        shadowOpacity: 0,
        elevation: 0,
    },
    chipText: {
        fontSize: 22,
        color: palette.beige[3], // Beige when unselected
        fontFamily: 'NotoSans_500Medium',
    },
    chipTextActive: {
        color: '#615e4e', // Darker beige for contrast when selected
    },
    chipTextMath: {
        fontSize: 22,
        color: palette.beige[3], // Updated to match unselected digits
        fontFamily: 'LibreBaskerville_400Regular_Italic',
    },
    chipTextActiveMath: {
        color: '#615e4e',
    },
    chipTextAllClr: {
        fontFamily: 'NotoSans_500Medium',
        fontSize: 16,
        lineHeight: 17,
        color: palette.beige[3], // Updated to match unselected digits
        textAlign: 'center',
    },
    chipDisabled: {
        opacity: 0.5,
    }
});
