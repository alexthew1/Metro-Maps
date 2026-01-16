import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const GlobalStyles = StyleSheet.create({
    // Typography
    metroXL: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 58,
        fontWeight: '300',
        lineHeight: 58,
        letterSpacing: -1.5,
        color: Colors.white,
    },
    metroLG: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 42,
        fontWeight: '300',
        lineHeight: 46,
        letterSpacing: -0.5,
        color: Colors.white,
    },
    metroMD: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 24,
        fontWeight: '400',
        color: Colors.white,
    },
    metroSM: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 19,
        fontWeight: '400',
        color: Colors.white,
    },
    metroXS: {
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'lowercase',
        color: Colors.white,
    },

    // Utils
    noCorners: {
        borderRadius: 0,
    },
    accentText: {
        color: Colors.accent,
    },
    dimText: {
        color: Colors.textDim,
    },
});
