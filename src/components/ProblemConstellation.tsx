import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { ProblemDisplay, OperationMode, StartMode, SessionPhase } from '../lib/types';
import { isSessionPhasePreparing } from '../lib/sessionPhases';
import { sessionPrepMarks, sessionPrepTimeline } from '../lib/sessionPrepTimeline';
import { palette, theme, getOperationTheme } from '../theme/colors';
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

type ProblemSlot = 'left' | 'right' | 'result';

function getProblemSlotFallback(slot: ProblemSlot) {
    return slot === 'result' ? '---' : '--';
}

function getProblemSlotValue(
    problem: ProblemDisplay | null,
    slot: ProblemSlot,
    showProblemValues: boolean,
    showCorrect: boolean
) {
    if (!problem) {
        return getProblemSlotFallback(slot);
    }

    if (!showProblemValues) {
        return '';
    }

    if (problem.missing === slot && !showCorrect) {
        return '';
    }

    return problem[slot];
}

function getAnswerHostFill(isActive: boolean, showWrongAnswerFill: boolean) {
    if (showWrongAnswerFill) {
        return theme.statusError;
    }

    if (isActive) {
        return '#ffffff';
    }

    return theme.bg;
}

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

    const leftCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ perspective: 1000 }, { rotateX: `${leftFlip.value}deg` }],
        transformStyle: 'preserve-3d',
    }));

    const leftFrontCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: problem?.missing === 'left' ? answerTranslateX.value : 0 },
            { perspective: 1000 },
            { rotateX: `${leftFlip.value}deg` },
        ],
        transformStyle: 'preserve-3d',
    }), [problem?.missing]);

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

    const rightFrontCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: problem?.missing === 'right' ? answerTranslateX.value : 0 },
            { perspective: 1000 },
            { rotateX: `${rightFlip.value}deg` },
        ],
        transformStyle: 'preserve-3d',
    }), [problem?.missing]);

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

    const resultFrontCardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: problem?.missing === 'result' ? answerTranslateX.value : 0 },
            { perspective: 1000 },
            { rotateX: `${resultFlip.value}deg` },
        ],
        transformStyle: 'preserve-3d',
    }), [problem?.missing]);

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

    const slotDisplayValues = {
        left: getProblemSlotValue(problem, 'left', showProblemValues, showCorrect),
        right: getProblemSlotValue(problem, 'right', showProblemValues, showCorrect),
        result: getProblemSlotValue(problem, 'result', showProblemValues, showCorrect),
    };

    const slotTextColors = {
        left: problem ? opTheme.textOperand : palette.beige[3],
        right: problem ? opTheme.textOperand : palette.beige[3],
        result: problem ? opTheme.textResult : palette.beige[4],
    };
    const prepBackTextColors = opTheme.prepBackText;
    const prepResultLabel = operation === 'addsub' ? 'add!' : 'multiply!';
    const shouldShowPrepBackText = !problem && startMode !== 'min' && !showBlankFinalBackText;
    const answerHostFill = getAnswerHostFill(isActive && !!problem, showWrongAnswerFill);
    const mainOperatorStandardColors = opTheme.mainOperator;
    const mainOperatorMutedColors = { circleFill: palette.beige[2], operatorFill: palette.beige[3] };
    const secondaryOperatorStandardColors = opTheme.secondaryOperator;
    const secondaryOperatorMutedColors = { circleFill: palette.beige[1], operatorFill: palette.beige[2] };

    const MainIcon = operation === 'addsub' ? IconPlus : IconTimes;
    const InvIcon = operation === 'addsub' ? IconMinus : IconDivide;

    const renderProblemCard = ({
        key,
        frontContainerStyle,
        backContainerStyle,
        frontTextStyle,
        frontContent,
        backTextStyle,
        backValue,
    }: {
        key: ProblemSlot;
        frontContainerStyle: React.ComponentProps<typeof Animated.View>['style'];
        backContainerStyle: React.ComponentProps<typeof Animated.View>['style'];
        frontTextStyle: React.ComponentProps<typeof Animated.Text>['style'];
        frontContent: React.ReactNode;
        backTextStyle: React.ComponentProps<typeof Animated.Text>['style'];
        backValue: string;
    }) => (
        <React.Fragment key={key}>
            <Animated.View style={frontContainerStyle}>
                {frontContent}
            </Animated.View>
            <Animated.View style={backContainerStyle}>
                <Animated.Text style={backTextStyle}>{backValue}</Animated.Text>
            </Animated.View>
        </React.Fragment>
    );

    const problemCards: Parameters<typeof renderProblemCard>[0][] = [
        {
            key: 'left',
            frontContainerStyle: [
                styles.card,
                styles.cardLeft,
                problem?.missing === 'left' && { backgroundColor: answerHostFill },
                leftFrontCardAnimatedStyle,
                leftFrontVisibleStyle,
            ],
            backContainerStyle: [
                styles.card,
                styles.cardLeft,
                localStyles.leftCardTopShadow,
                leftCardAnimatedStyle,
                leftBackVisibleStyle,
                problem && localStyles.hiddenLayer,
            ],
            frontTextStyle: [styles.cardText, { color: slotTextColors.left }, firstRevealTextStyle],
            backTextStyle: [
                localStyles.backTextBase,
                localStyles.operandBackText,
                { color: prepBackTextColors.ready },
                leftBackTextAnimatedStyle,
                firstRevealTextStyle,
            ],
            frontContent:
                problem?.missing === 'left' && !showCorrect ? (
                    renderInput
                ) : (
                    <Animated.Text style={[styles.cardText, { color: slotTextColors.left }, firstRevealTextStyle]}>
                        {showBlankFinalBackText && !problem ? '' : slotDisplayValues.left}
                    </Animated.Text>
                ),
            backValue: shouldShowPrepBackText ? 'ready...' : '',
        },
        {
            key: 'right',
            frontContainerStyle: [
                styles.card,
                styles.cardRight,
                problem?.missing === 'right' && { backgroundColor: answerHostFill },
                rightFrontCardAnimatedStyle,
                rightFrontVisibleStyle,
            ],
            backContainerStyle: [
                styles.card,
                styles.cardRight,
                localStyles.rightCardTopShadow,
                rightCardAnimatedStyle,
                rightBackVisibleStyle,
                problem && localStyles.hiddenLayer,
            ],
            frontTextStyle: [styles.cardText, { color: slotTextColors.right }, firstRevealTextStyle],
            backTextStyle: [
                localStyles.backTextBase,
                localStyles.operandBackText,
                { color: prepBackTextColors.set },
                rightBackTextAnimatedStyle,
                firstRevealTextStyle,
            ],
            frontContent:
                problem?.missing === 'right' && !showCorrect ? (
                    renderInput
                ) : (
                    <Animated.Text style={[styles.cardText, { color: slotTextColors.right }, firstRevealTextStyle]}>
                        {showBlankFinalBackText && !problem ? '' : slotDisplayValues.right}
                    </Animated.Text>
                ),
            backValue: shouldShowPrepBackText ? 'set...' : '',
        },
        {
            key: 'result',
            frontContainerStyle: [
                styles.cardResult,
                problem?.missing === 'result' && { backgroundColor: answerHostFill },
                resultFrontCardAnimatedStyle,
                resultFrontVisibleStyle,
            ],
            backContainerStyle: [
                styles.cardResult,
                localStyles.resultCardTopShadow,
                resultCardAnimatedStyle,
                resultBackVisibleStyle,
                problem && localStyles.hiddenLayer,
            ],
            frontTextStyle: [styles.cardText, { color: slotTextColors.result }, firstRevealTextStyle],
            backTextStyle: [
                localStyles.backTextBase,
                localStyles.resultBackText,
                { color: prepBackTextColors.result },
                resultBackTextAnimatedStyle,
                firstRevealTextStyle,
            ],
            frontContent:
                problem?.missing === 'result' && !showCorrect ? (
                    renderInput
                ) : (
                    <Animated.Text style={[styles.cardText, { color: slotTextColors.result }, firstRevealTextStyle]}>
                        {showBlankFinalBackText && !problem ? '' : slotDisplayValues.result}
                    </Animated.Text>
                ),
            backValue: shouldShowPrepBackText ? prepResultLabel : '',
        },
    ];

    // React Native scales the entire view using an absolute transform.
    // The absolute positions mimic the web's translation from the center.

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.anchor}>
                {/* Ellipses */}
                <View style={[styles.ellipseLarge, { zIndex: -1 }]}>
                    <Svg width="100%" height="100%">
                        <Ellipse cx="50%" cy="50%" rx={258 / 2} ry={172 / 2} stroke={theme.ellipseLargeStroke} strokeWidth="12" fill="none" />
                    </Svg>
                </View>
                <View style={[styles.ellipseSmall, { zIndex: -1 }]}>
                    <Svg width="100%" height="100%">
                        <Ellipse cx="50%" cy="50%" rx={141 / 2} ry={118 / 2} stroke={theme.ellipseSmallStroke} strokeWidth="12" fill="none" />
                    </Svg>
                </View>

                {/* Cards */}
                {problemCards.map(renderProblemCard)}
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
