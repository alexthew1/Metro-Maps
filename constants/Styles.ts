import { StyleSheet } from 'react-native';
import { Colors } from './Colors';
import { normalizeFont } from '../utils/responsive';

export const GlobalStyles = StyleSheet.create({
    // Typography
    // Typography
    metroXL: {
        fontFamily: 'OpenSans_300Light',
        fontSize: normalizeFont(58),
        fontWeight: '300',
        lineHeight: normalizeFont(62),
        letterSpacing: -1.5,
        color: Colors.white,
    },
    metroLG: {
        fontFamily: 'OpenSans_300Light',
        fontSize: normalizeFont(42),
        fontWeight: '300',
        lineHeight: normalizeFont(46),
        letterSpacing: -0.5,
        color: Colors.white,
    },
    metroMD: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(24),
        fontWeight: '400',
        color: Colors.white,
    },
    metroSM: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(19),
        fontWeight: '400',
        color: Colors.white,
    },
    metroXS: {
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: normalizeFont(14),
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
