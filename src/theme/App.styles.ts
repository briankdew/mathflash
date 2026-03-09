import { StyleSheet } from 'react-native';
import { theme } from './colors';

export const appStyles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
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
        marginTop: 10, // Exactly 10px below the header
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    inputArea: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
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
        marginBottom: 10,
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
