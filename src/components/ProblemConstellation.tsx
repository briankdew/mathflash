import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Ellipse, Defs, Filter, FeDropShadow, FeFlood, FeGaussianBlur, FeOffset, FeComposite, Rect, FeBlend, FeColorMatrix } from 'react-native-svg';
import { ProblemDisplay, OperationMode } from '../lib/types';
import { sessionPrepMarks, sessionPrepTimeline } from '../lib/sessionPrepTimeline';
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
    const leftFlip = useSharedValue(0);
    const rightFlip = useSharedValue(0);
    const resultFlip = useSharedValue(0);
    const leftBackTextRotation = useSharedValue(-180);
    const rightBackTextRotation = useSharedValue(-180);
    const resultBackTextRotation = useSharedValue(-180);
    const [showBlankFinalBackText, setShowBlankFinalBackText] = React.useState(false);
    const textRevealOpacity = useSharedValue(1);
    const hasPlayedFirstRevealRef = React.useRef(false);
    const [showProblemValues, setShowProblemValues] = React.useState(false);
    const revealFrameRef = React.useRef<number | null>(null);
    const flipTimeoutRefs = React.useRef<ReturnType<typeof setTimeout>[]>([]);

    React.useEffect(() => {
        if (shakeTrigger > 0) {
            translateX.value = withSequence(
                withTiming(10, { duration: 50 }),
                withRepeat(withTiming(-10, { duration: 100 }), 3, true),
                withTiming(0, { duration: 50 })
            );
        }
    }, [shakeTrigger, translateX]);

    React.useEffect(() => {
        flipTimeoutRefs.current.forEach(clearTimeout);
        flipTimeoutRefs.current = [];

        leftFlip.value = 0;
        rightFlip.value = 0;
        resultFlip.value = 0;
        leftBackTextRotation.value = -180;
        rightBackTextRotation.value = -180;
        resultBackTextRotation.value = -180;
        setShowBlankFinalBackText(false);
        textRevealOpacity.value = 1;
        hasPlayedFirstRevealRef.current = false;
        setShowProblemValues(false);
        if (revealFrameRef.current !== null) {
            cancelAnimationFrame(revealFrameRef.current);
            revealFrameRef.current = null;
        }

        if (isActive) {
            const scheduleFlip = (angle: { value: number }, at: number, targetDeg: number = -90) => {
                const startId = setTimeout(() => {
                    angle.value = withTiming(targetDeg, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
                }, at);
                flipTimeoutRefs.current.push(startId);
            };

            scheduleFlip(leftFlip, sessionPrepMarks.leftFlipAt, -180);
            scheduleFlip(rightFlip, sessionPrepMarks.rightFlipAt, -180);
            scheduleFlip(resultFlip, sessionPrepMarks.resultFlipAt, -180);

            const finalFlipId = setTimeout(() => {
                leftFlip.value = withTiming(-360, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
                rightFlip.value = withTiming(-360, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
                resultFlip.value = withTiming(-360, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
            }, sessionPrepMarks.finalFlipAt);

            const blankBackTextId = setTimeout(() => {
                setShowBlankFinalBackText(true);
            }, sessionPrepMarks.finalFlipAt + sessionPrepTimeline.flip / 2);

            const reorientBackTextId = setTimeout(() => {
                // Keep card shells fixed; only reorient hidden back text for clean next-state reveal.
                const reorientDuration = Math.min(250, sessionPrepTimeline.pauseAfterFinalFlip);
                leftBackTextRotation.value = withTiming(0, { duration: reorientDuration, easing: Easing.linear });
                rightBackTextRotation.value = withTiming(0, { duration: reorientDuration, easing: Easing.linear });
                resultBackTextRotation.value = withTiming(0, { duration: reorientDuration, easing: Easing.linear });
            }, sessionPrepMarks.finalFlipAt + sessionPrepTimeline.flip + 100);

            const preArmFirstRevealId = setTimeout(() => {
                // Prevent a one-frame flash before first-problem dissolve kicks in.
                if (!hasPlayedFirstRevealRef.current) {
                    textRevealOpacity.value = 0;
                }
            }, Math.max(0, sessionPrepMarks.totalPrep - 20));

            flipTimeoutRefs.current.push(finalFlipId, blankBackTextId, reorientBackTextId, preArmFirstRevealId);
        }

        return () => {
            flipTimeoutRefs.current.forEach(clearTimeout);
            flipTimeoutRefs.current = [];
        };
    }, [isActive]);

    React.useEffect(() => {
        if (!isActive) {
            textRevealOpacity.value = 1;
            hasPlayedFirstRevealRef.current = false;
            setShowProblemValues(false);
            if (revealFrameRef.current !== null) {
                cancelAnimationFrame(revealFrameRef.current);
                revealFrameRef.current = null;
            }
            return;
        }

        if (problem && !hasPlayedFirstRevealRef.current) {
            hasPlayedFirstRevealRef.current = true;
            setShowProblemValues(false);
            textRevealOpacity.value = 0;
            revealFrameRef.current = requestAnimationFrame(() => {
                setShowProblemValues(true);
                textRevealOpacity.value = withTiming(1, { duration: sessionPrepTimeline.firstProblemDissolve, easing: Easing.linear });
                revealFrameRef.current = null;
            });
            return;
        }

        if (problem) {
            setShowProblemValues(true);
        }
    }, [isActive, problem, textRevealOpacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: dynamicScale },
            { translateX: translateX.value }
        ]
    }));

    const leftCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ perspective: 1000 }, { rotateX: `${leftFlip.value}deg` }],
        transformStyle: 'preserve-3d',
    }));

    const leftFrontVisibleStyle = useAnimatedStyle(() => {
        const wrapped = ((leftFlip.value % 360) + 360) % 360;
        const isFrontVisible = wrapped < 90 || wrapped > 270;
        return { opacity: isFrontVisible ? 1 : 0 };
    });

    const leftBackVisibleStyle = useAnimatedStyle(() => {
        const wrapped = ((leftFlip.value % 360) + 360) % 360;
        const isFrontVisible = wrapped < 90 || wrapped > 270;
        return { opacity: isFrontVisible ? 0 : 1 };
    });

    const rightCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ perspective: 1000 }, { rotateX: `${rightFlip.value}deg` }],
        transformStyle: 'preserve-3d',
    }));

    const rightFrontVisibleStyle = useAnimatedStyle(() => {
        const wrapped = ((rightFlip.value % 360) + 360) % 360;
        const isFrontVisible = wrapped < 90 || wrapped > 270;
        return { opacity: isFrontVisible ? 1 : 0 };
    });

    const rightBackVisibleStyle = useAnimatedStyle(() => {
        const wrapped = ((rightFlip.value % 360) + 360) % 360;
        const isFrontVisible = wrapped < 90 || wrapped > 270;
        return { opacity: isFrontVisible ? 0 : 1 };
    });

    const resultCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ perspective: 1000 }, { rotateX: `${resultFlip.value}deg` }],
        transformStyle: 'preserve-3d',
    }));

    const resultFrontVisibleStyle = useAnimatedStyle(() => {
        const wrapped = ((resultFlip.value % 360) + 360) % 360;
        const isFrontVisible = wrapped < 90 || wrapped > 270;
        return { opacity: isFrontVisible ? 1 : 0 };
    });

    const resultBackVisibleStyle = useAnimatedStyle(() => {
        const wrapped = ((resultFlip.value % 360) + 360) % 360;
        const isFrontVisible = wrapped < 90 || wrapped > 270;
        return { opacity: isFrontVisible ? 0 : 1 };
    });

    const leftBackTextAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateX: `${leftBackTextRotation.value}deg` }],
    }));

    const rightBackTextAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateX: `${rightBackTextRotation.value}deg` }],
    }));

    const resultBackTextAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateX: `${resultBackTextRotation.value}deg` }],
    }));

    const firstRevealTextStyle = useAnimatedStyle(() => ({
        opacity: textRevealOpacity.value,
    }));

    const valL = problem
        ? (showProblemValues ? (problem.missing === 'left' ? (showCorrect ? problem.left : '') : problem.left) : '')
        : '--';
    const valR = problem
        ? (showProblemValues ? (problem.missing === 'right' ? (showCorrect ? problem.right : '') : problem.right) : '')
        : '--';
    const valRes = problem
        ? (showProblemValues ? (problem.missing === 'result' ? (showCorrect ? problem.result : '') : problem.result) : '')
        : '---';

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
                <Animated.View style={[styles.card, styles.cardLeft, leftCardAnimatedStyle, leftFrontVisibleStyle]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorL }, firstRevealTextStyle]}>{showBlankFinalBackText && !problem ? '' : valL}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardLeft, localStyles.leftCardTopShadow, leftCardAnimatedStyle, leftBackVisibleStyle, problem && localStyles.hiddenLayer]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorL }, leftBackTextAnimatedStyle, firstRevealTextStyle]}>{(showBlankFinalBackText && !problem) || problem ? '' : '1'}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardRight, rightCardAnimatedStyle, rightFrontVisibleStyle]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorR }, firstRevealTextStyle]}>{showBlankFinalBackText && !problem ? '' : valR}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardRight, localStyles.rightCardTopShadow, rightCardAnimatedStyle, rightBackVisibleStyle, problem && localStyles.hiddenLayer]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorR }, rightBackTextAnimatedStyle, firstRevealTextStyle]}>{(showBlankFinalBackText && !problem) || problem ? '' : '1'}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.cardResult, resultCardAnimatedStyle, resultFrontVisibleStyle]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorRes }, firstRevealTextStyle]}>{showBlankFinalBackText && !problem ? '' : valRes}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.cardResult, localStyles.resultCardTopShadow, resultCardAnimatedStyle, resultBackVisibleStyle, problem && localStyles.hiddenLayer]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorRes }, resultBackTextAnimatedStyle, firstRevealTextStyle]}>{(showBlankFinalBackText && !problem) || problem ? '' : '1'}</Animated.Text>
                </Animated.View>

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

const localStyles = StyleSheet.create({
    hiddenLayer: {
        opacity: 0,
    },
    leftCardTopShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
    rightCardTopShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
    resultCardTopShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
});
