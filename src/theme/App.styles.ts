import { StyleSheet } from 'react-native';
import { theme } from './colors';

export const appStyles = StyleSheet.create({
    gestureRoot: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
        maxHeight: 759, // Current base-layout height constraint
        borderBottomWidth: 2,
        borderBottomColor: theme.floorLine, // Faint red "floor" line
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20, // Reduced to see floor more clearly
    },
    modalSafeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mainLayout: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    panelCenter: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
        alignItems: 'center',
    },
    constellationWrapper: {
        width: '100%',
        alignItems: 'center',
        marginTop: 0,
        marginBottom: 10,
    },
    inputArea: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    statsBlock: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    keypadBlock: {
        width: '100%',
        alignItems: 'center',
        marginTop: 0,
    },
    textInput: {
        width: '100%',
        height: '100%',
        fontSize: 90,
        fontFamily: 'Nunito_700Bold',
        fontWeight: '700',
        textAlign: 'center',
        color: theme.textMuted,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    sessionControl: {
        width: '100%',
        alignItems: 'center',
    },
    startBtn: {
        width: 215,
        height: 40,
        justifyContent: 'center',
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
        marginBottom: 15,
    },
    startBtnText: {
        color: '#fff',
        fontSize: 19,
        fontFamily: 'Archivo_400Regular',
        fontWeight: 'normal',
    },
    countText: {
        fontSize: 16,
        lineHeight: 16,
        fontFamily: 'Archivo_400Regular',
        color: theme.textMuted,
    },
    statsLabelText: {
        marginRight: 3,
        textAlign: 'right',
    },
    statsCountText: {
        fontSize: 16,
        lineHeight: 16,
        fontFamily: 'Nunito_700Bold',
        textAlign: 'left',
        color: theme.textMuted,
    },
    reportLinkBtn: {
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.72)',
    },
    reportLinkText: {
        fontSize: 13,
        fontFamily: 'Archivo_400Regular',
        color: theme.textMuted,
    },
    voiceStatusText: {
        minHeight: 16,
        marginTop: 4,
        fontSize: 12,
        fontFamily: 'Archivo_400Regular',
        color: theme.textMuted,
    }
});
