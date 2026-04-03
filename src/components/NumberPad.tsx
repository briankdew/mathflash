import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../theme/colors';

const BACKSPACE_ICON_VIEWBOX_X = 34;
const BACKSPACE_ICON_VIEWBOX_Y = 14;
const BACKSPACE_ICON_VIEWBOX_WIDTH = 33;
const BACKSPACE_ICON_VIEWBOX_HEIGHT = 24;
const BACKSPACE_ICON_HEIGHT = 24;
const BACKSPACE_ICON_WIDTH =
    (BACKSPACE_ICON_VIEWBOX_WIDTH * BACKSPACE_ICON_HEIGHT) / BACKSPACE_ICON_VIEWBOX_HEIGHT;

interface NumberPadProps {
    onDigit: (digit: string) => void;
    onClear: () => void;
    disabled?: boolean;
}

export function NumberPad({ onDigit, onClear, disabled = false }: NumberPadProps) {
    const renderButton = (label: string, onPress: () => void, style?: object) => (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.6}
        >
            <Text style={styles.buttonText}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {renderButton('1', () => onDigit('1'))}
                {renderButton('2', () => onDigit('2'))}
                {renderButton('3', () => onDigit('3'))}
            </View>
            <View style={styles.row}>
                {renderButton('4', () => onDigit('4'))}
                {renderButton('5', () => onDigit('5'))}
                {renderButton('6', () => onDigit('6'))}
            </View>
            <View style={styles.row}>
                {renderButton('7', () => onDigit('7'))}
                {renderButton('8', () => onDigit('8'))}
                {renderButton('9', () => onDigit('9'))}
            </View>
            <View style={[styles.row, styles.lastRow]}>
                {renderButton('0', () => onDigit('0'), styles.wideButton)}
                <TouchableOpacity
                    style={[styles.button, styles.actionButton]}
                    onPress={onClear}
                    disabled={disabled}
                    activeOpacity={0.6}
                >
                    <Svg
                        width={BACKSPACE_ICON_WIDTH}
                        height={BACKSPACE_ICON_HEIGHT}
                        viewBox={`${BACKSPACE_ICON_VIEWBOX_X} ${BACKSPACE_ICON_VIEWBOX_Y} ${BACKSPACE_ICON_VIEWBOX_WIDTH} ${BACKSPACE_ICON_VIEWBOX_HEIGHT}`}
                        fill="none"
                    >
                        <Path
                            d="m48.087 21.321 9.3579 9.3579m0-9.3579-9.3579 9.3579m-5.0406 5.6407c-0.54054 0-1.0319-0.14129-1.4743-0.42384-0.44226-0.28254-0.82302-0.64494-1.1424-1.0872l-5.3439-7.5184c-0.2703-0.39232-0.40543-0.8222-0.40543-1.2895 0-0.46709 0.1351-0.89724 0.40543-1.2903l5.3439-7.5184c0.31943-0.44226 0.70019-0.80466 1.1424-1.0872 0.44226-0.28254 0.93369-0.42384 1.4743-0.42384l17.824 1.3e-5c0.60812 0 1.1288 0.2165 1.5619 0.64939 0.43294 0.43323 0.64939 0.95379 0.64939 1.5619v16.216c0 0.60811-0.21644 1.1287-0.64939 1.5615-0.43317 0.43322-0.95379 0.64977-1.5619 0.64977z"
                            fill="none"
                            stroke={palette.beige[7]}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3.36}
                        />
                    </Svg>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 320,
        height: 222,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    lastRow: {
        marginBottom: 0,
    },
    button: {
        width: 100,
        height: 48,
        borderRadius: 14,
        backgroundColor: palette.beige[1],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 3,
    },
    actionButton: {
        backgroundColor: palette.bg,
    },
    wideButton: {
        width: 210,
    },
    buttonText: {
        fontSize: 33,
        fontFamily: 'Nunito_700Bold',
        color: palette.beige[7],
    },
});
