import { StyleSheet } from 'react-native';
import { theme } from './colors';

export const appStyles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
        maxHeight: 852, // iPhone 14 Pro design constraint
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(255, 0, 0, 0.2)', // Faint red "floor" line
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
    },
    inputArea: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    statsBlock: {
        width: '100%',
        alignItems: 'center',
    },
    keypadBlock: {
        width: '100%',
        alignItems: 'center',
        marginTop: 9, // Reduced 2px (1 to offset stats shift, 1 to move up)
    },
    textInput: {
        width: '100%',
        height: '100%',
        fontSize: 98,
        fontFamily: 'Nunito_700Bold',
        fontWeight: '700',
        textAlign: 'center',
        color: '#777565',
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    sessionControl: {
        width: '100%',
        alignItems: 'center',
    },
    startBtn: {
        width: 215,
        height: 35,
        justifyContent: 'center',
        borderRadius: 17.5,
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
        fontSize: 15,
        fontFamily: 'Archivo_400Regular',
        fontWeight: 'normal',
    },
    countText: {
        fontSize: 16,
        fontFamily: 'Archivo_400Regular',
        color: theme.textMuted,
    }
});
