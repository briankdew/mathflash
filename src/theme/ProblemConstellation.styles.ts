import { StyleSheet } from 'react-native';
import { theme } from './colors';

export const constellationStyles = StyleSheet.create({
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
        zIndex: 10,
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
