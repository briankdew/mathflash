import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ProblemDisplay, OperationMode } from '../lib/types';
import { theme, getOperationTheme } from '../theme/colors';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, useSharedValue, withSpring } from 'react-native-reanimated';

const IconPlus = ({ color }: { color: string }) => (
    <Svg viewBox="0 0 43 42.7" style={styles.iconSvg} color={color}>
        <Path d="m21.579367 0.023679266c-1.3058815 0 -2.3014984 0.3397539 -2.9868546 1.0192583c-0.67609406 0.6703242 -1.0141411 1.6253037 -1.0141411 2.8649423l0 13.456964l-13.7534275 0c-1.194742 0 -2.1347904 0.32598114 -2.8201468 0.9779377c-0.6760938 0.65195656 -1.0141416 1.5702095 -1.0141416 2.754753c0 1.1845436 0.33804774 2.1027908 1.0141416 2.7547512c0.6853564 0.6427727 1.6254048 0.9641628 2.8201468 0.9641628l13.7534275 0l0 13.883953c0 1.2396355 0.33804703 2.2129822 1.0141411 2.9200363c0.68535614 0.69786835 1.6531887 1.0468063 2.9035015 1.0468063c1.3151417 0 2.2968674 -0.348938 2.945177 -1.0468063c0.6575718 -0.70705414 0.98635674 -1.6804008 0.98635674 -2.9200363l0 -13.883953l13.739532 0c1.2503128 0 2.199623 -0.32139015 2.8479347 -0.9641628c0.6575699 -0.6519604 0.9863548 -1.5702076 0.9863548 -2.7547512c0 -1.1845436 -0.32878494 -2.1027966 -0.9863548 -2.754753c-0.6483116 -0.65195656 -1.5976219 -0.9779377 -2.8479347 -0.9779377l-13.739532 0l0 -13.456964c0 -1.2396386 -0.32878494 -2.1946182 -0.98635674 -2.8649423c-0.6483097 -0.6795044 -1.602251 -1.0192583 -2.861824 -1.0192583z" fill="currentColor" fillRule="evenodd" />
    </Svg>
);

const IconTimes = ({ color }: { color: string }) => (
    <Svg viewBox="-2.65 -2.45 43.7 42.7" style={styles.iconSvg} color={color}>
        <Path d="m3.7250946 0c-0.608165 0 -1.1753755 0.15159208 -1.7016313 0.4547796c-0.6760938 0.3948489 -1.1993718 0.91825175 -1.5698355 1.5702088c-0.37046212 0.6519568 -0.5140169 1.3865564 -0.43066284 2.2038019c0.0833541 0.81724167 0.4954932 1.5931625 1.2364191 2.3277655l12.628145 12.520349l-12.378083 12.272421c-0.9076341 0.899889 -1.3336656 1.8456821 -1.2780962 2.8373966c0.05556941 0.9825287 0.4260315 1.8273201 1.111388 2.5343704c0.6853665 0.70705414 1.5235289 1.0881271 2.5145154 1.1432228c0.057706118 0.0031814575 0.11525798 0.0047683716 0.17265725 0.0047683716c0.9375081 0 1.8338971 -0.42398834 2.689167 -1.2719536l12.461437 -12.355064l12.461437 12.355064c0.74092484 0.73460007 1.5096359 1.143219 2.3061295 1.2258644c0.14629745 0.01517868 0.29009247 0.022766113 0.43138504 0.022766113c0.6279831 0 1.2065887 -0.1499176 1.7358208 -0.4497528c0.6575737 -0.36729813 1.185482 -0.8861084 1.5837288 -1.5564346c0.39824677 -0.6795082 0.54180145 -1.4141121 0.43066406 -2.203804c-0.111141205 -0.78969574 -0.5371704 -1.5518494 -1.2780952 -2.2864437l-12.378086 -12.272421l12.628147 -12.520349c0.9724655 -0.9641633 1.4123878 -1.9237366 1.3197708 -2.8787162c-0.083351135 -0.96416306 -0.4815979 -1.7951789 -1.1947403 -2.4930506c-0.7038803 -0.707052 -1.5698357 -1.0881271 -2.5978699 -1.1432222c-0.067276 -0.0042437725 -0.13433075 -0.006365657 -0.20116425 -0.006365657c-0.9452133 0 -1.8459892 0.42451835 -2.7023354 1.2735517l-12.544792 12.437706l-12.544792 -12.437706c-0.74092484 -0.7345995 -1.5235271 -1.1569959 -2.347807 -1.267186c-0.19135046 -0.027712297 -0.37895823 -0.041566763 -0.5628216 -0.041566763z" fill="currentColor" fillRule="evenodd" />
    </Svg>
);

const IconMinus = ({ color }: { color: string }) => (
    <Svg viewBox="0 0 43.2 7.4" style={styles.iconSvg} color={color}>
        <Path d="m3.8342886 0c-1.1947422 0 -2.1347907 0.32598013 -2.820147 0.97793704c-0.6760938 0.65195686 -1.0141416 1.5702088 -1.0141416 2.7547522c0 1.1845434 0.33804774 2.102792 1.0141416 2.7547524c0.6853564 0.64277315 1.6254048 0.9641633 2.820147 0.9641633l35.508846 0c1.250309 0 2.2042503 -0.32139015 2.861824 -0.9641633c0.6575699 -0.6519604 0.9863548 -1.570209 0.9863548 -2.7547524c0 -1.1845434 -0.32878494 -2.1027951 -0.9863548 -2.7547522c-0.6575737 -0.6519569 -1.611515 -0.97793704 -2.861824 -0.97793704z" fill="currentColor" fillRule="evenodd" />
    </Svg>
);

const IconDivide = ({ color }: { color: string }) => (
    <Svg viewBox="0 0 43 42.7" style={styles.iconSvg} color={color}>
        <Path d="m20.99134 0c-1.4725895 0 -2.6256542 0.41321284 -3.459196 1.2396384c-0.8242798 0.817242 -1.2364178 1.9558741 -1.2364178 3.415893c0 1.469202 0.412138 2.6124244 1.2364178 3.429666c0.83354187 0.8172426 1.9866066 1.2258654 3.459196 1.2258654c1.5374203 0 2.7043762 -0.40862274 3.5008717 -1.2258654c0.79649544 -0.81724167 1.1947422 -1.960464 1.1947422 -3.429666c0 -1.5242975 -0.4121399 -2.6812935 -1.2364197 -3.4709878c-0.8242798 -0.78969455 -1.9773445 -1.1845435 -3.4591942 -1.1845435zm-17.157051 17.602867c-1.1947422 0 -2.1347907 0.32597923 -2.820147 0.9779358c-0.6760938 0.65195656 -1.0141416 1.5702095 -1.0141416 2.754753c0 1.1845436 0.33804774 2.1027908 1.0141416 2.7547512c0.6853564 0.6427746 1.6254048 0.96416473 2.820147 0.96416473l35.342136 0c1.2503128 0 2.199623 -0.32139015 2.847931 -0.96416473c0.6575737 -0.6519604 0.98635864 -1.5702076 0.98635864 -2.7547512c0 -1.1845436 -0.32878494 -2.1027966 -0.98635864 -2.754753c-0.6483078 -0.65195656 -1.5976181 -0.9779358 -2.847931 -0.9779358zm17.157051 15.743408c-1.4725895 0 -2.6256542 0.40861893 -3.459196 1.2258644c-0.8242798 0.8172455 -1.2364178 1.9604683 -1.2364178 3.4296684c0 1.4691963 0.412138 2.6124191 1.2364178 3.4296646c0.83354187 0.8172455 1.9866066 1.2258644 3.459196 1.2258644c1.5374203 0 2.7043762 -0.40861893 3.5008717 -1.2258644c0.79649544 -0.8172455 1.1947422 -1.9604683 1.1947422 -3.4296646c0 -1.5242958 -0.4121399 -2.6812935 -1.2364197 -3.4709892c-0.8242798 -0.78969955 -1.9773445 -1.1845436 -3.4591942 -1.1845436z" fill="currentColor" fillRule="evenodd" />
    </Svg>
);

interface ProblemConstellationProps {
    problem: ProblemDisplay | null;
    operation: OperationMode;
    shakeTrigger?: number; // pass a random value to trigger a shake
}

export function ProblemConstellation({ problem, operation, shakeTrigger = 0 }: ProblemConstellationProps) {
    const opTheme = getOperationTheme(operation);

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
        transform: [{ translateX: translateX.value }]
    }));

    const valL = problem ? (problem.missing === 'left' ? '?' : problem.left) : '--';
    const valR = problem ? (problem.missing === 'right' ? '?' : problem.right) : '--';
    const valRes = problem ? (problem.missing === 'result' ? '?' : problem.result) : '---';

    const idleColorL = problem ? opTheme.textOperand : theme.textMuted;
    const idleColorR = problem ? opTheme.textOperand : theme.textMuted;
    const idleColorRes = problem ? opTheme.textResult : theme.textMuted;

    const MainIcon = operation === 'addsub' ? IconPlus : IconTimes;
    const InvIcon = operation === 'addsub' ? IconMinus : IconDivide;

    // React Native scales the entire view using an absolute transform.
    // The absolute positions mimic the web's translation from the center.

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <Text style={[styles.opDisplay, { color: opTheme.btnBg }]}>
                {operation === 'addsub' ? 'addition / subtraction' : 'multiplication / division'}
            </Text>

            <View style={styles.anchor}>
                {/* Ellipses */}
                <View style={styles.ellipseLarge} />
                <View style={styles.ellipseSmall} />

                {/* Cards */}
                <View style={[styles.card, styles.cardLeft]}>
                    <Text style={[styles.cardText, { color: idleColorL }]}>{valL}</Text>
                </View>
                <View style={[styles.card, styles.cardRight]}>
                    <Text style={[styles.cardText, { color: idleColorR }]}>{valR}</Text>
                </View>
                <View style={[styles.cardResult, styles.cardResultPosition]}>
                    <Text style={[styles.cardText, { color: idleColorRes }]}>{valRes}</Text>
                </View>

                {/* Operator Circles */}
                <View style={[styles.circle, styles.circleMain]}>
                    <MainIcon color={theme.operatorCircleBg === '#100d00' ? '#ffffff' : theme.bg} />
                </View>

                <View style={[styles.circle, styles.circleInvLeft]}>
                    <InvIcon color={theme.inverseCircleBg === theme.bg ? theme.textMain : theme.bg} />
                </View>

                <View style={[styles.circle, styles.circleInvRight]}>
                    <InvIcon color={theme.inverseCircleBg === theme.bg ? theme.textMain : theme.bg} />
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 350,
        justifyContent: 'center',
        alignItems: 'center',
        // We scale down slightly for mobile so it fits the screen easily.
        // Or we handle scaling in a parent wrapper.
        transform: [{ scale: 0.8 }],
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
    },
    card: {
        position: 'absolute',
        width: 210,
        height: 150,
        backgroundColor: theme.cardOperandBg,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        // Center translations in React Native require taking half width/height:
        transform: [{ translateX: -105 }, { translateY: -75 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 2,
    },
    cardLeft: {
        left: -145,
        top: -85,
    },
    cardRight: {
        left: 145,
        top: -85,
    },
    cardResult: {
        position: 'absolute',
        width: 290,
        height: 150,
        backgroundColor: theme.cardResultBg,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ translateX: -145 }, { translateY: -75 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 2,
    },
    cardResultPosition: {
        left: 0,
        top: 85,
    },
    cardText: {
        fontSize: 100,
        fontWeight: 'bold',
    },
    ellipseLarge: {
        position: 'absolute',
        width: 409,
        height: 281,
        left: 0,
        top: 0,
        borderWidth: 16,
        borderColor: theme.ellipseLargeStroke,
        borderRadius: 409 / 2,
        transform: [{ translateX: -204.5 }, { translateY: -140.5 }],
        zIndex: -1,
    },
    ellipseSmall: {
        position: 'absolute',
        width: 227,
        height: 182,
        left: 0,
        top: 41.5,
        borderWidth: 16,
        borderColor: theme.ellipseSmallStroke,
        borderRadius: 227 / 2,
        transform: [{ translateX: -113.5 }, { translateY: -91 }],
        zIndex: -1,
    },
    circle: {
        position: 'absolute',
        width: 63,
        height: 63,
        borderRadius: 31.5,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ translateX: -31.5 }, { translateY: -31.5 }],
        zIndex: 3,
    },
    circleMain: {
        left: 0,
        top: -41.5,
        backgroundColor: theme.operatorCircleBg,
    },
    circleInvLeft: {
        left: -186.5,
        top: 41.5,
        backgroundColor: theme.inverseCircleBg,
    },
    circleInvRight: {
        left: 186.5,
        top: 41.5,
        backgroundColor: theme.inverseCircleBg,
    },
    iconSvg: {
        width: 40,
        height: 40,
    }
});
