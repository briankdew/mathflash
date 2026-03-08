import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Ellipse, Defs, Filter, FeDropShadow, FeFlood, FeGaussianBlur, FeOffset, FeComposite, Rect, FeBlend, FeColorMatrix } from 'react-native-svg';
import { ProblemDisplay, OperationMode } from '../lib/types';
import { theme, getOperationTheme } from '../theme/colors';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, useSharedValue, withSpring } from 'react-native-reanimated';

const IconPlus = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filter40" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path
            d="m 7.1999999,2.0799999 c -0.57933,0 -1.049,0.46964 -1.049,1.049 v 3.022 h -3.022 c -0.57933,0 -1.049,0.46964 -1.049,1.049 0,0.57936 0.46964,1.049 1.049,1.049 h 3.022 V 11.271 c 0,0.57933 0.46964,1.049 1.049,1.049 0.57933,0 1.049,-0.46964 1.049,-1.049 V 8.2489999 H 11.271 c 0.57933,0 1.049,-0.46964 1.049,-1.049 0,-0.57936 -0.46964,-1.049 -1.049,-1.049 H 8.2489999 v -3.022 c 0,-0.57933 -0.46964,-1.049 -1.049,-1.049 z"
            fill="currentColor"
            strokeLinejoin="round"
            strokeMiterlimit="0"
            strokeWidth="0.035331"
            filter="url(#filter40)"
        />
    </Svg>
);

const IconTimes = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filterTimes" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path d="m11.052 3.3477a1.0496 1.0496 0 0 0-1.4844 5e-7l-2.3679 2.3679-2.3679-2.3679a1.0496 1.0496 0 0 0-1.4844 6e-7 1.0496 1.0496 0 0 0 3e-7 1.4844l2.3679 2.3679-2.3679 2.3679a1.0496 1.0496 0 0 0 0 1.4844 1.0496 1.0496 0 0 0 1.4844 0l2.3679-2.3679 2.3679 2.3679a1.0496 1.0496 0 0 0 1.4844 0 1.0496 1.0496 0 0 0 0-1.4844l-2.3679-2.3679 2.3679-2.3679a1.0496 1.0496 0 0 0 0-1.4844z" strokeLinejoin="round" strokeMiterlimit="0" strokeWidth="0.035352" fill="currentColor" filter="url(#filterTimes)" />
    </Svg>
);

const IconMinus = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filterMinus" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path d="m3.8763 6.1504a1.0496 1.0496 0 0 0-1.0496 1.0496 1.0496 1.0496 0 0 0 1.0496 1.0496h6.6475a1.0496 1.0496 0 0 0 1.0496-1.0496 1.0496 1.0496 0 0 0-1.0496-1.0496z" fill="currentColor" filter="url(#filterMinus)" />
    </Svg>
);

const IconDivide = ({ color }: { color: string }) => (
    <Svg width={45} height={45} viewBox="0 0 14.4 14.4" color={color}>
        <Defs>
            <Filter id="filterDivide" x="-0.047" y="-0.047" width="1.09" height="1.29">
                <FeDropShadow dx="0" dy=".75" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.35" />
            </Filter>
        </Defs>
        <Path d="m3.2015 6.1504a1.0496 1.0496 0 0 0-1.0496 1.0496 1.0496 1.0496 0 0 0 1.0496 1.0496h7.9969a1.0496 1.0496 0 0 0 1.0496-1.0496 1.0496 1.0496 0 0 0-1.0496-1.0496zm5.0039 4.1347a1.0746 1.0746 0 0 1-1.0746 1.0746 1.0746 1.0746 0 0 1-1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746 1.0746zm0.13824-6.1702a1.0746 1.0746 0 0 1-1.0746 1.0746 1.0746 1.0746 0 0 1-1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746-1.0746 1.0746 1.0746 0 0 1 1.0746 1.0746z" fill="currentColor" filter="url(#filterDivide)" />
    </Svg>
);

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
        <Rect x="0" y="0" width="215" height="110" rx="25" ry="25" fill="#ffffff" filter="url(#filterAnswerBox)" />
    </Svg>
);

interface ProblemConstellationProps {
    problem: ProblemDisplay | null;
    operation: OperationMode;
    shakeTrigger?: number; // pass a random value to trigger a shake
    renderInput?: React.ReactNode;
    showCorrect?: boolean;
    isActive?: boolean;
    onToggleOperation?: () => void;
}

export function ProblemConstellation({ problem, operation, shakeTrigger = 0, renderInput, showCorrect = false, isActive = false, onToggleOperation }: ProblemConstellationProps) {
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
                    {!isActive && (
                        <Svg width="330" height="35" viewBox="0 0 330 35" style={{ position: 'absolute' }}>
                            <Defs>
                                <Filter id="stadiumShadow" x="-0.03" y="-0.15" width="1.06" height="1.3" filterUnits="objectBoundingBox">
                                    <FeFlood floodOpacity="0" result="BackgroundImageFix" />
                                    <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                    <FeOffset dy="1" />
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

                <View style={[styles.cardAnswer, !isActive && styles.idleAnswerBox]}>
                    {isActive && <AnswerBoxSvg isActive={isActive} />}
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

const styles = StyleSheet.create({
    container: {
        height: 420, // Bounding box calculated so top of stadium is perfectly Y=0
        alignItems: 'center',
        width: '100%',
    },
    opDisplay: {
        position: 'absolute',
        top: -20,
        fontSize: 24,
        fontFamily: 'serif',
        fontWeight: 'bold',
    },
    anchor: {
        width: 0,
        height: 0,
        position: 'relative',
        top: 162.5, // Pushes the center (0,0) down so that -162.5 (stadium top) sits perfectly at bounds top
    },
    operationLabelContainer: {
        position: 'absolute',
        top: -162.5, // 10px precisely above the -117.5 operand card bound
        left: -165, // Centers the 330px width shape horizontally
        width: 330,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    operationLabel: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'baseline',
    },
    operationTextLeft: {
        fontSize: 30,
        fontFamily: 'Fredoka_400Regular',
    },
    operationTextRight: {
        fontSize: 30,
        fontFamily: 'Fredoka_400Regular',
    },
    card: {
        position: 'absolute',
        width: 155,
        height: 110,
        backgroundColor: '#DAD8CC',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        // Figma Shadow: X:0, Y:3, Blur:6, Color: #000 50%
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
        zIndex: 2,
    },
    cardLeft: {
        // Top calculation: Bottom tangent is -7.5. Height 110. Top = -7.5 - 110 = -117.5
        top: -117.5,
        // Left calculation: Circle right edge -22.5. Gap 9. Card right edge -31.5. Width 155. Left = -186.5
        left: -186.5,
    },
    cardRight: {
        top: -117.5,
        // Left calculation: Circle left edge 22.5. Gap 9. Card left edge 31.5
        left: 31.5,
    },
    cardResult: {
        position: 'absolute',
        top: 7.5, // 15 down from operand cards bottom (-7.5)
        left: -107.5, // Center of width 215
        width: 215,
        height: 110,
        backgroundColor: '#C0BEB1',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
        zIndex: 2,
    },
    cardAnswer: {
        position: 'absolute',
        top: 147.5, // 30 down from result card bottom (7.5 + 110 + 30)
        left: -107.5,
        width: 215,
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    idleAnswerBox: {
        backgroundColor: theme.bg,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
    cardText: {
        fontSize: 98,
        fontWeight: '700',
        fontFamily: 'Nunito_700Bold',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
    },
    ellipseLarge: {
        position: 'absolute',
        width: 297,
        height: 202,
        left: 0,
        top: 0,
        transform: [{ translateX: -148.5 }, { translateY: -101 }],
        zIndex: -1,
    },
    ellipseSmall: {
        position: 'absolute',
        width: 167,
        height: 137,
        left: 0,
        top: 32.5,
        transform: [{ translateX: -83.5 }, { translateY: -68.5 }],
        zIndex: -1,
    },
    circle: {
        position: 'absolute',
        width: 45, // From Figma W
        height: 45, // From Figma H
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ translateX: -22.5 }, { translateY: -22.5 }],
        zIndex: 3,
    },
    circleMain: {
        left: 0,
        // Centering logic based on your confirmed math:
        // Center of Small Ellipse: 32.5
        // Top Apogee of small path (125 / 2): 62.5
        // Result: 32.5 - 62.5 = -30
        top: -30,
        backgroundColor: theme.operatorCircleBg,
    },
    circleInvLeft: {
        // Horizontal: Visual edge at -116.5, center at -139
        left: -139,
        // Vertical: Visual top at 7.5, center at 30
        top: 30,
        backgroundColor: theme.inverseCircleBg,
    },
    circleInvRight: {
        // Horizontal: Visual edge at 116.5, center at 139
        left: 139,
        // Vertical: Visual top at 7.5, center at 30
        top: 30,
        backgroundColor: theme.inverseCircleBg,
    }
});
