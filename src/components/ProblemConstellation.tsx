import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Ellipse, Defs, Filter, FeDropShadow, FeFlood, FeGaussianBlur, FeOffset, FeComposite, Rect, FeBlend, FeColorMatrix } from 'react-native-svg';
import { ProblemDisplay, OperationMode } from '../lib/types';
import { theme, getOperationTheme } from '../theme/colors';
import { constellationStyles as styles } from '../theme/ProblemConstellation.styles';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, useSharedValue, withSpring } from 'react-native-reanimated';

import { IconPlus, IconMinus, IconTimes, IconDivide } from './icons/MathIcons';

const AnswerBoxSvg = ({ isActive }: { isActive: boolean }) => (
    <Svg width="100%" height="100%" viewBox="0 0 215 110" style={StyleSheet.absoluteFill} pointerEvents="none" focusable={false}>
        <Defs>
            <Filter id="filterAnswerBox" x="-0.027907" y="-0.054545" width="1.0558" height="1.1364">
                <FeFlood floodColor="#000000" floodOpacity="0.7" in="SourceGraphic" result="flood" />
                <FeGaussianBlur in="SourceGraphic" result="blur" stdDeviation="3" />
                <FeOffset dx="0" dy="4" in="blur" result="offset" />
                <FeComposite in="flood" in2="offset" operator="out" result="comp1" />
                <FeComposite in="comp1" in2="SourceGraphic" operator="atop" result="comp2" />
            </Filter>
        </Defs>
        <Rect x="0" y="0" width="215" height="110" rx="25" ry="25" fill={isActive ? "#ffffff" : theme.bg} filter="url(#filterAnswerBox)" />
    </Svg>
);

interface ProblemConstellationProps {
    problem: ProblemDisplay | null;
    operation: OperationMode;
    shakeTrigger?: number; // pass a random value to trigger a shake
    renderInput?: React.ReactNode;
    showCorrect?: boolean;
    isActive?: boolean;
    isStadiumActive?: boolean;
    onToggleOperation?: () => void;
}

export function ProblemConstellation({ problem, operation, shakeTrigger = 0, renderInput, showCorrect = false, isActive = false, isStadiumActive = true, onToggleOperation }: ProblemConstellationProps) {
    const opTheme = getOperationTheme(operation);
    const { width } = useWindowDimensions();

    const dynamicScale = 1; // Locked to 1 to honor exact Figma coordinates

    // We only animate the problem constellation to react to errors
    const translateX = useSharedValue(0);

    React.useEffect(() => {
        if (shakeTrigger > 0) {
            translateX.value = withSequence(
                withTiming(10, { duration: 50 }),
                withRepeat(withTiming(-10, { duration: 100 }), 3, true),
                withTiming(0, { duration: 50 })
            );
        }
    }, [shakeTrigger, translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: dynamicScale },
            { translateX: translateX.value }
        ]
    }));

    const valL = problem ? (problem.missing === 'left' ? (showCorrect ? problem.left : '') : problem.left) : '--';
    const valR = problem ? (problem.missing === 'right' ? (showCorrect ? problem.right : '') : problem.right) : '--';
    const valRes = problem ? (problem.missing === 'result' ? (showCorrect ? problem.result : '') : problem.result) : '---';

    const idleColorL = problem ? opTheme.textOperand : '#c0beb1';
    const idleColorR = problem ? opTheme.textOperand : '#c0beb1';
    const idleColorRes = problem ? opTheme.textResult : '#a7a597';

    const MainIcon = operation === 'addsub' ? IconPlus : IconTimes;
    const InvIcon = operation === 'addsub' ? IconMinus : IconDivide;

    // React Native scales the entire view using an absolute transform.
    // The absolute positions mimic the web's translation from the center.

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.anchor}>
                {/* Operation Mode Label */}
                <View style={styles.operationLabelContainer}>
                    {isStadiumActive && (
                        <Svg width="330" height="35" viewBox="0 0 330 35" style={{ position: 'absolute' }}>
                            <Defs>
                                <Filter id="stadiumShadow" x="-0.03" y="-0.15" width="1.06" height="1.3" filterUnits="objectBoundingBox">
                                    <FeFlood floodOpacity="0" result="BackgroundImageFix" />
                                    <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                    <FeOffset dy="1.5" />
                                    <FeGaussianBlur stdDeviation="1.5" />
                                    <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1" />
                                    <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0" />
                                    <FeBlend mode="normal" in2="shape" result="effect1_innerShadow" />
                                </Filter>
                            </Defs>
                            <Rect width="330" height="35" rx="17.5" fill="#FFFFFF" filter="url(#stadiumShadow)" />
                        </Svg>
                    )}
                    {isActive ? (
                        <View style={styles.operationLabel}>
                            <Text style={[styles.operationTextLeft, { color: opTheme.logoMath }]}>{operation === 'addsub' ? 'addition' : 'multiplication'}</Text>
                            <Text style={[styles.operationTextRight, { color: opTheme.logoFlash }]}>{operation === 'addsub' ? 'subtraction' : 'division'}</Text>
                        </View>
                    ) : (
                        <TouchableOpacity activeOpacity={0.8} onPress={onToggleOperation} style={styles.operationLabel}>
                            <Text style={[styles.operationTextLeft, { color: opTheme.logoMath }]}>{operation === 'addsub' ? 'addition' : 'multiplication'}</Text>
                            <Text style={[styles.operationTextRight, { color: opTheme.logoFlash }]}>{operation === 'addsub' ? 'subtraction' : 'division'}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Ellipses */}
                <View style={[styles.ellipseLarge, { zIndex: -1 }]}>
                    <Svg width="100%" height="100%">
                        <Ellipse cx="50%" cy="50%" rx={(297 - 12) / 2} ry={(202 - 12) / 2} stroke="#E7E5D9" strokeWidth="12" fill="none" />
                    </Svg>
                </View>
                <View style={[styles.ellipseSmall, { zIndex: -1 }]}>
                    <Svg width="100%" height="100%">
                        <Ellipse cx="50%" cy="50%" rx={(167 - 12) / 2} ry={(137 - 12) / 2} stroke="#DAD8CC" strokeWidth="12" fill="none" />
                    </Svg>
                </View>

                {/* Cards */}
                <View style={[styles.card, styles.cardLeft]}>
                    <Text style={[styles.cardText, { color: idleColorL }]}>{valL}</Text>
                </View>
                <View style={[styles.card, styles.cardRight]}>
                    <Text style={[styles.cardText, { color: idleColorR }]}>{valR}</Text>
                </View>
                <View style={styles.cardResult}>
                    <Text style={[styles.cardText, { color: idleColorRes }]}>{valRes}</Text>
                </View>

                <View style={styles.cardAnswer}>
                    <AnswerBoxSvg isActive={isActive && !!problem} />
                    {renderInput}
                </View>

                {/* Operator Circles */}
                <View style={[styles.circle, styles.circleMain]}>
                    <MainIcon color={theme.operatorCircleBg} />
                </View>

                <View style={[styles.circle, styles.circleInvLeft]}>
                    <InvIcon color={theme.inverseCircleBg} />
                </View>

                <View style={[styles.circle, styles.circleInvRight]}>
                    <InvIcon color={theme.inverseCircleBg} />
                </View>
            </View>
        </Animated.View>
    );
}


