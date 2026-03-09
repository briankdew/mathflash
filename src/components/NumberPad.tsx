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
                            d="m44.027 37c-0.57619 0-1.1-0.15061-1.5715-0.4518-0.47143-0.30118-0.87731-0.68748-1.2178-1.1589l-5.6964-8.0143c-0.28813-0.4182-0.43217-0.87643-0.43217-1.3746 0-0.4979 0.14401-0.95642 0.43217-1.3754l5.6964-8.0143c0.3405-0.47143 0.74637-0.85773 1.2178-1.1589 0.47143-0.30118 0.99527-0.4518 1.5715-0.4518h16.5c0.64823 0 1.2032 0.23078 1.6649 0.69222 0.4615 0.4618 0.69222 1.0167 0.69222 1.6649v17.286c0 0.64822-0.23072 1.2031-0.69222 1.6645-0.46174 0.46179-1.0167 0.69263-1.6649 0.69263zm-0.43217-2.3572h16.932v-17.286h-16.932l-6.0499 8.6428zm8.2893-6.9929 3.575 3.575c0.23575 0.23575 0.51075 0.35359 0.82502 0.35359 0.31427 0 0.58927-0.11803 0.82502-0.35359 0.23568-0.23568 0.35359-0.51724 0.35359-0.84465s-0.11803-0.6089-0.35359-0.84465l-3.575-3.5357 3.5357-3.5357c0.23575-0.23575 0.35359-0.51075 0.35359-0.82502 0-0.31427-0.11802-0.58927-0.35359-0.82502-0.23568-0.23568-0.51724-0.35352-0.84465-0.35352-0.32729 0-0.6089 0.11802-0.84458 0.35352l-3.4964 3.5358-3.575-3.575c-0.23568-0.23575-0.51069-0.35359-0.82502-0.35359-0.31427 0-0.58927 0.11803-0.82495 0.35359-0.23575 0.23568-0.35359 0.51724-0.35359 0.84465s0.11802 0.6089 0.35359 0.84465l3.575 3.5357-3.575 3.5357c-0.23575 0.23575-0.35359 0.51075-0.35359 0.82502 0 0.31427 0.11802 0.58927 0.35359 0.82502 0.23568 0.23568 0.51729 0.35352 0.84465 0.35352 0.32741 0 0.6089-0.11802 0.84465-0.35352z"
                            fill={palette.beige[7]}
                            stroke={palette.beige[7]}
                            strokeWidth={0.78569}
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
        backgroundColor: palette.beige[0],
    },
    wideButton: {
        width: 210,
    },
    buttonText: {
        fontSize: 30,
        fontFamily: 'Nunito_700Bold',
        color: palette.beige[7],
    },
});
