import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import Svg, { Defs, Filter, FeFlood, FeBlend, FeColorMatrix, FeOffset, FeGaussianBlur, FeComposite, Rect } from 'react-native-svg';
import { SessionOptions } from '../lib/types';
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

    // Track the toggle state independently so it doesn't flip when single chips are touched
    const [isAllMode, setIsAllMode] = React.useState(options.activeChips.length === 9);

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
        const nextVal = !isAllMode;
        setIsAllMode(nextVal);
        updateOptions({
            customSet: null,
            activeChips: nextVal ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []
        });
    };

    const setCustomSet = (set: '10s' | 'doubles') => {
        if (disabled) return;
        const isActivating = options.customSet !== set;
        if (isActivating) {
            setIsAllMode(false);
        }
        updateOptions({ customSet: isActivating ? set : null, activeChips: [] });
    };

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

            <View style={styles.selectorsRow}>
                <View style={styles.controlGroupSquare}>
                    <Text style={styles.label}>PO</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={cycleOrder} disabled={disabled}>
                        <Text style={styles.selectBtnText}>
                            {options.problemOrder === 'random' ? 'Ran' : 'Std'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.controlGroupSquare}>
                    <Text style={styles.label}>OO</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={cycleOperandOrder} disabled={disabled}>
                        <Text style={styles.selectBtnText}>
                            {options.operandOrder === 'random' ? 'Ran' : options.operandOrder === 'standard' ? 'Std' : 'Rev'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.controlGroupSquare}>
                    <Text style={styles.label}>MV</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={cycleMissing} disabled={disabled}>
                        <Text style={styles.selectBtnText}>{
                            options.missingValue === 'result' ? 'Res' :
                                options.missingValue === 'operand' ? 'Opd' : 'Ran'
                        }</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }} />

                <View style={[styles.controlGroupSquare, { alignItems: 'center' }]}>
                    <Text style={styles.label}>Custom</Text>
                    <View style={styles.chipGridWide}>
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
                    </View>
                </View>
            </View>

            <View style={[styles.controlGroup, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={[styles.label, { marginBottom: 0, marginRight: 15 }]}>Timer</Text>
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
        backgroundColor: 'transparent',
    },
    selectorsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: 352,
        alignSelf: 'center',
        gap: 15,
        marginBottom: 15,
    },
    controlGroup: {
        marginBottom: 15,
    },
    controlGroupSquare: {
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 5,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    selectBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.bg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.cardOperandBg,
    },
    selectBtnText: {
        fontSize: 24,
        color: '#ffffff',
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
