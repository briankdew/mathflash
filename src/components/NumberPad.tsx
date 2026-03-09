import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../theme/colors';

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
            <View style={styles.row}>
                {renderButton('0', () => onDigit('0'), styles.wideButton)}
                <TouchableOpacity
                    style={[styles.button, styles.actionButton]}
                    onPress={onClear}
                    disabled={disabled}
                    activeOpacity={0.6}
                >
                    <Svg width={100} height={52} viewBox="0 0 100 52" fill="none" style={StyleSheet.absoluteFill}>
                        <Path
                            d="m66.028 40h-26.028l-14-13.98 14-14.02h26.028zm-2.2455-2.2259v-23.509h-22.806l-11.755 11.755 11.755 11.755zm-5.0767-6.3068-1.523 1.5425-5.4672-5.4672-5.4672 5.4672-1.523-1.5425 5.4282-5.4477-5.4282-5.4672 1.523-1.5621 5.4672 5.4672 5.4672-5.4672 1.523 1.5621-5.4477 5.4672z"
                            fill={palette.beige[7]}
                        />
                    </Svg>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 330,
        paddingHorizontal: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
    },
    button: {
        width: 100,
        height: 52,
        marginHorizontal: 5,
        borderRadius: 14,
        backgroundColor: palette.beige[0],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
    },
    actionButton: {
        backgroundColor: palette.beige[1],
    },
    wideButton: {
        width: 210,
    },
    buttonText: {
        fontSize: 28,
        fontFamily: 'Nunito_700Bold',
        color: palette.beige[7],
    },
});
