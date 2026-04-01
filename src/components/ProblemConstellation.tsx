import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse, Image as SvgImage, Rect } from 'react-native-svg';
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

const ANSWER_BOX_SHADOW_DATA_URI =
    'data:image/png;base64,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';

void ANSWER_BOX_SHADOW_DATA_URI;

const ANSWER_BOX_SHADOW_SOURCE = require('../../assets/answer-box-shadow.png');

const AnswerBoxSvg = ({
    isActive,
    isWrongAnswerFill,
}: {
    isActive: boolean;
    isWrongAnswerFill?: boolean;
}) => (
    <Svg width="100%" height="100%" viewBox="0 0 195 100" style={StyleSheet.absoluteFill} pointerEvents="none" focusable={false}>
        <Rect
            x="0"
            y="0"
            width="195"
            height="100"
            rx="25"
            ry="25"
            fill={isWrongAnswerFill ? '#ffc5c5' : (isActive ? '#ffffff' : theme.bg)}
        />
        <SvgImage
            x={0}
            y={0}
            width={195}
            height={100}
            href={ANSWER_BOX_SHADOW_SOURCE}
            preserveAspectRatio="none"
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
                        <Ellipse cx="50%" cy="50%" rx={258 / 2} ry={172 / 2} stroke="#E7E5D9" strokeWidth="12" fill="none" />
                    </Svg>
                </View>
                <View style={[styles.ellipseSmall, { zIndex: -1 }]}>
                    <Svg width="100%" height="100%">
                        <Ellipse cx="50%" cy="50%" rx={141 / 2} ry={118 / 2} stroke="#DAD8CC" strokeWidth="12" fill="none" />
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
        width: 40,
        height: 40,
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
