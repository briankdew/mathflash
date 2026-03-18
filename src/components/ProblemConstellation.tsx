import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse, Defs, Filter, FeFlood, FeGaussianBlur, FeOffset, FeComposite, Rect } from 'react-native-svg';
import { ProblemDisplay, OperationMode, StartMode, SessionPhase } from '../lib/types';
import { isSessionPhasePreparing } from '../lib/sessionPhases';
import { sessionPrepMarks, sessionPrepTimeline } from '../lib/sessionPrepTimeline';
import { theme, getOperationTheme } from '../theme/colors';
import { constellationStyles as styles } from '../theme/ProblemConstellation.styles';
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    useSharedValue,
} from 'react-native-reanimated';

import { IconPlus, IconMinus, IconTimes, IconDivide } from './icons/MathIcons';

const AnswerBoxSvg = ({
    isActive,
    isWrongAnswerFill,
}: {
    isActive: boolean;
    isWrongAnswerFill?: boolean;
}) => (
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
        <Rect
            x="0"
            y="0"
            width="215"
            height="110"
            rx="25"
            ry="25"
            fill={isWrongAnswerFill ? '#ffc5c5' : (isActive ? '#ffffff' : theme.bg)}
            filter="url(#filterAnswerBox)"
        />
    </Svg>
);

interface ProblemConstellationProps {
    problem: ProblemDisplay | null;
    operation: OperationMode;
    startMode?: StartMode;
    phase: SessionPhase;
    shakeTrigger?: number; // pass a random value to trigger a shake
    showWrongAnswer?: boolean;
    showWrongAnswerFill?: boolean;
    renderInput?: React.ReactNode;
    showCorrect?: boolean;
    isActive?: boolean;
}

export function ProblemConstellation({
    problem,
    operation,
    startMode = 'full',
    phase,
    shakeTrigger = 0,
    showWrongAnswer = false,
    showWrongAnswerFill = false,
    renderInput,
    showCorrect = false,
    isActive = false,
}: ProblemConstellationProps) {
    const opTheme = getOperationTheme(operation);
    const isPreparing = isSessionPhasePreparing(phase);

    const dynamicScale = 1; // Locked to 1 to honor exact Figma coordinates

    const answerTranslateX = useSharedValue(0);
    const leftFlip = useSharedValue(0);
    const rightFlip = useSharedValue(0);
    const resultFlip = useSharedValue(0);
    const leftBackTextRotation = useSharedValue(-180);
    const rightBackTextRotation = useSharedValue(-180);
    const resultBackTextRotation = useSharedValue(-180);
    const [showBlankFinalBackText, setShowBlankFinalBackText] = React.useState(false);
    const textRevealOpacity = useSharedValue(1);
    const operatorRevealOpacity = useSharedValue(0);
    const hasPlayedFirstRevealRef = React.useRef(false);
    const [showProblemValues, setShowProblemValues] = React.useState(false);
    const flipTimeoutRefs = React.useRef<ReturnType<typeof setTimeout>[]>([]);

    React.useEffect(() => {
        if (shakeTrigger > 0) {
            answerTranslateX.value = withSequence(
                withTiming(10, { duration: 50 }),
                withRepeat(withTiming(-10, { duration: 100 }), 3, true),
                withTiming(0, { duration: 50 })
            );
        }
    }, [answerTranslateX, shakeTrigger]);

    React.useEffect(() => {
        if (!showWrongAnswer) {
            cancelAnimation(answerTranslateX);
            answerTranslateX.value = 0;
        }
    }, [answerTranslateX, showWrongAnswer]);

    React.useEffect(() => {
        if (phase === 'idle' || isPreparing) {
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
            operatorRevealOpacity.value = 0;
            hasPlayedFirstRevealRef.current = false;
            setShowProblemValues(false);
        }

        if (isPreparing) {
            const isMinStart = startMode === 'min';
            const prepCompleteAt = isMinStart ? sessionPrepMarks.totalPrepMin : sessionPrepMarks.totalPrep;
            const finalFlipAt = isMinStart ? sessionPrepMarks.finalFlipAtMin : sessionPrepMarks.finalFlipAt;

            const scheduleFlip = (angle: { value: number }, at: number, targetDeg: number = -90) => {
                const startId = setTimeout(() => {
                    angle.value = withTiming(targetDeg, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
                }, at);
                flipTimeoutRefs.current.push(startId);
            };

            if (!isMinStart) {
                scheduleFlip(leftFlip, sessionPrepMarks.leftFlipAt, -180);
                scheduleFlip(rightFlip, sessionPrepMarks.rightFlipAt, -180);
                scheduleFlip(resultFlip, sessionPrepMarks.resultFlipAt, -180);
            }

            const finalFlipId = setTimeout(() => {
                const finalTarget = isMinStart ? -180 : -360;
                leftFlip.value = withTiming(finalTarget, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
                rightFlip.value = withTiming(finalTarget, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
                resultFlip.value = withTiming(finalTarget, { duration: sessionPrepTimeline.flip, easing: Easing.linear });
            }, finalFlipAt);

            const blankBackTextId = setTimeout(() => {
                setShowBlankFinalBackText(true);
            }, finalFlipAt + sessionPrepTimeline.flip / 2);

            const reorientBackTextId = setTimeout(() => {
                // Keep card shells fixed; only reorient hidden back text for clean next-state reveal.
                const reorientDuration = Math.min(250, sessionPrepTimeline.pauseAfterFinalFlip);
                leftBackTextRotation.value = withTiming(0, { duration: reorientDuration, easing: Easing.linear });
                rightBackTextRotation.value = withTiming(0, { duration: reorientDuration, easing: Easing.linear });
                resultBackTextRotation.value = withTiming(0, { duration: reorientDuration, easing: Easing.linear });
            }, finalFlipAt + sessionPrepTimeline.flip + 100);

            const operatorColorDissolveId = setTimeout(() => {
                operatorRevealOpacity.value = withTiming(1, {
                    duration: sessionPrepTimeline.operatorColorDissolve,
                    easing: Easing.linear,
                });
            }, finalFlipAt);

            const preArmFirstRevealId = setTimeout(() => {
                // Prevent a one-frame flash before first-problem dissolve kicks in.
                if (!hasPlayedFirstRevealRef.current) {
                    textRevealOpacity.value = 0;
                }
                if (isMinStart) {
                    // Keep Min mode to a single visible flip, then quietly normalize shell orientation
                    // right before first-problem dissolve.
                    leftFlip.value = -360;
                    rightFlip.value = -360;
                    resultFlip.value = -360;
                }
            }, Math.max(0, prepCompleteAt - 20));

            flipTimeoutRefs.current.push(finalFlipId, blankBackTextId, reorientBackTextId, operatorColorDissolveId, preArmFirstRevealId);
        }

        return () => {
            flipTimeoutRefs.current.forEach(clearTimeout);
            flipTimeoutRefs.current = [];
        };
    }, [
        isPreparing,
        leftBackTextRotation,
        leftFlip,
        operatorRevealOpacity,
        phase,
        resultBackTextRotation,
        resultFlip,
        rightBackTextRotation,
        rightFlip,
        startMode,
        textRevealOpacity,
    ]);

    React.useEffect(() => {
        if (phase === 'idle') {
            textRevealOpacity.value = 1;
            operatorRevealOpacity.value = 0;
            hasPlayedFirstRevealRef.current = false;
            setShowProblemValues(false);
            return;
        }

        if (problem && !hasPlayedFirstRevealRef.current) {
            hasPlayedFirstRevealRef.current = true;
            leftFlip.value = -360;
            rightFlip.value = -360;
            resultFlip.value = -360;
            textRevealOpacity.value = 0;
            setShowProblemValues(true);
            textRevealOpacity.value = withTiming(1, { duration: sessionPrepTimeline.firstProblemDissolve, easing: Easing.linear });
            return;
        }

        if (problem) {
            setShowProblemValues(true);
        }
    }, [
        leftFlip,
        operatorRevealOpacity,
        phase,
        problem,
        resultFlip,
        rightFlip,
        textRevealOpacity,
    ]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: dynamicScale }
        ]
    }));

    const answerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: answerTranslateX.value }],
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

    const operatorMutedStyle = useAnimatedStyle(() => ({
        opacity: 1 - operatorRevealOpacity.value,
    }));

    const operatorStandardStyle = useAnimatedStyle(() => ({
        opacity: operatorRevealOpacity.value,
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
    const prepBackTextColors = operation === 'addsub'
        ? { ready: '#85A8CD', set: '#53789E', result: '#224A71' }
        : { ready: '#91AE85', set: '#49683B', result: '#325124' };
    const prepResultLabel = operation === 'addsub' ? 'add!' : 'multiply!';
    const mainOperatorStandardColors = operation === 'addsub'
        ? { circleFill: '#85a8cd', operatorFill: '#c7daef' }
        : { circleFill: '#91ae85', operatorFill: '#cdddc6' };
    const mainOperatorMutedColors = { circleFill: '#dad8cc', operatorFill: '#cdcbbe' };
    const secondaryOperatorStandardColors = operation === 'addsub'
        ? { circleFill: '#c7daef', operatorFill: '#6b90b6' }
        : { circleFill: '#cdddc6', operatorFill: '#79966c' };
    const secondaryOperatorMutedColors = { circleFill: '#e7e5d9', operatorFill: '#dad8cc' };

    const MainIcon = operation === 'addsub' ? IconPlus : IconTimes;
    const InvIcon = operation === 'addsub' ? IconMinus : IconDivide;

    // React Native scales the entire view using an absolute transform.
    // The absolute positions mimic the web's translation from the center.

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.anchor}>
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
                    <Animated.Text style={[localStyles.backTextBase, localStyles.operandBackText, { color: prepBackTextColors.ready }, leftBackTextAnimatedStyle, firstRevealTextStyle]}>
                        {(showBlankFinalBackText && !problem) || problem || startMode === 'min' ? '' : 'ready...'}
                    </Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardRight, rightCardAnimatedStyle, rightFrontVisibleStyle]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorR }, firstRevealTextStyle]}>{showBlankFinalBackText && !problem ? '' : valR}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardRight, localStyles.rightCardTopShadow, rightCardAnimatedStyle, rightBackVisibleStyle, problem && localStyles.hiddenLayer]}>
                    <Animated.Text style={[localStyles.backTextBase, localStyles.operandBackText, { color: prepBackTextColors.set }, rightBackTextAnimatedStyle, firstRevealTextStyle]}>
                        {(showBlankFinalBackText && !problem) || problem || startMode === 'min' ? '' : 'set...'}
                    </Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.cardResult, resultCardAnimatedStyle, resultFrontVisibleStyle]}>
                    <Animated.Text style={[styles.cardText, { color: idleColorRes }, firstRevealTextStyle]}>{showBlankFinalBackText && !problem ? '' : valRes}</Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.cardResult, localStyles.resultCardTopShadow, resultCardAnimatedStyle, resultBackVisibleStyle, problem && localStyles.hiddenLayer]}>
                    <Animated.Text style={[localStyles.backTextBase, localStyles.resultBackText, { color: prepBackTextColors.result }, resultBackTextAnimatedStyle, firstRevealTextStyle]}>
                        {(showBlankFinalBackText && !problem) || problem || startMode === 'min' ? '' : prepResultLabel}
                    </Animated.Text>
                </Animated.View>

                <Animated.View style={[styles.cardAnswer, answerAnimatedStyle]}>
                    <AnswerBoxSvg isActive={isActive && !!problem} isWrongAnswerFill={showWrongAnswerFill} />
                    {renderInput}
                </Animated.View>

                {/* Operator Circles */}
                <View style={[styles.circle, styles.circleMain]}>
                    <Animated.View style={[localStyles.operatorLayer, operatorMutedStyle]}>
                        <MainIcon {...mainOperatorMutedColors} />
                    </Animated.View>
                    <Animated.View style={[localStyles.operatorLayer, operatorStandardStyle]}>
                        <MainIcon {...mainOperatorStandardColors} />
                    </Animated.View>
                </View>

                <View style={[styles.circle, styles.circleInvLeft]}>
                    <Animated.View style={[localStyles.operatorLayer, operatorMutedStyle]}>
                        <InvIcon {...secondaryOperatorMutedColors} />
                    </Animated.View>
                    <Animated.View style={[localStyles.operatorLayer, operatorStandardStyle]}>
                        <InvIcon {...secondaryOperatorStandardColors} />
                    </Animated.View>
                </View>

                <View style={[styles.circle, styles.circleInvRight]}>
                    <Animated.View style={[localStyles.operatorLayer, operatorMutedStyle]}>
                        <InvIcon {...secondaryOperatorMutedColors} />
                    </Animated.View>
                    <Animated.View style={[localStyles.operatorLayer, operatorStandardStyle]}>
                        <InvIcon {...secondaryOperatorStandardColors} />
                    </Animated.View>
                </View>
            </View>
        </Animated.View>
    );
}

const localStyles = StyleSheet.create({
    hiddenLayer: {
        opacity: 0,
    },
    operatorLayer: {
        position: 'absolute',
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
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
    backTextBase: {
        zIndex: 10,
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
    },
    operandBackText: {
        fontFamily: 'Nunito_700Bold',
        fontWeight: '700',
        fontSize: 40,
    },
    resultBackText: {
        fontFamily: 'Nunito_800ExtraBold_Italic',
        fontSize: 43,
    },
});
