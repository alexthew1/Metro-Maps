import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

interface AboutSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function AboutSheet({ visible, onClose }: AboutSheetProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        if (defaultFont.includes('700Bold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
            transform: [
                { perspective: 1000 },
                { rotateY: withTiming(visible ? '0deg' : '-90deg', { 
                    duration: 250, 
                    easing: Easing.out(Easing.cubic) 
                }) }
            ],
            pointerEvents: visible ? 'auto' : 'none',
        };
    }, [visible]);

    useEffect(() => {
        const backAction = () => {
            if (visible) {
                onClose();
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [visible, onClose]);

    return (
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.appName, { color: colors.textDim, fontFamily: getFont('OpenSans_600SemiBold') }]}>MetroMaps</Text>
                <Text style={[styles.title, { color: colors.text, fontFamily: getFont('OpenSans_300Light') }]}>{t('about')}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Version')}</Text>
                    <Text style={[styles.value, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>1.6</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Creator')}</Text>
                    <Text style={[styles.value, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>Alexander Batchler</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('License')}</Text>
                    <Text style={[styles.value, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>MIT License</Text>
                </View>

                <View style={[styles.infoRow, { marginTop: verticalScale(30) }]}>
                    <Text style={[styles.description, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>
                        {t('MetroMaps is a Windows Phone inspired mapping application bringing the classic Metro design language to modern devices.')}
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={[styles.backButton, { marginBottom: insets.bottom + 20, borderColor: colors.text }]} onPress={onClose}>
                <Text style={[styles.backButtonText, { color: colors.text, fontFamily: getFont('OpenSans_600SemiBold') }]}>{t('back')}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 80,
    },
    header: {
        marginBottom: verticalScale(30),
        paddingHorizontal: horizontalScale(20),
        marginTop: verticalScale(10),
    },
    appName: {
        fontSize: normalizeFont(12),
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: verticalScale(5),
    },
    title: {
        fontSize: normalizeFont(42),
    },
    content: {
        paddingHorizontal: horizontalScale(20),
    },
    infoRow: {
        marginBottom: verticalScale(20),
    },
    label: {
        fontSize: normalizeFont(14),
        marginBottom: verticalScale(4),
    },
    value: {
        fontSize: normalizeFont(24),
    },
    description: {
        fontSize: normalizeFont(14),
        lineHeight: normalizeFont(22),
    },
    backButton: {
        position: 'absolute',
        bottom: 0,
        left: horizontalScale(20),
        right: horizontalScale(20),
        borderWidth: 2,
        paddingVertical: verticalScale(12),
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: normalizeFont(16),
    }
});
