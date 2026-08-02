import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, BackHandler } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withTiming, useSharedValue, Easing } from 'react-native-reanimated';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

interface OptionsMenuProps {
    active: boolean;
    onClose: () => void;
    showLabels?: boolean;
    onShowLabelsChange?: (val: boolean) => void;
    showsBuildings?: boolean;
    onShowsBuildingsChange?: (val: boolean) => void;
}

export function OptionsMenu({ active, onClose, showLabels = true, onShowLabelsChange, showsBuildings = true, onShowsBuildingsChange }: OptionsMenuProps) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
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
            opacity: withTiming(active ? 1 : 0, { duration: 200 }),
            pointerEvents: active ? 'auto' : 'none',
        };
    }, [active]);

    // Hardware Back Button Handler
    useEffect(() => {
        const backAction = () => {
            if (active) {
                onClose();
                return true; // Prevent default behavior (exit app)
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [active, onClose]);

    return (
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top + 20, backgroundColor: isDark ? 'rgba(31,31,31,0.85)' : 'rgba(255,255,255,0.9)' }]}>
            {/* Background overlay - blocks touches but does NOT close menu */}
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} />

            <View pointerEvents="box-none" style={{ padding: 20 }}>

                <Text style={[GlobalStyles.metroXL, { marginBottom: 30, marginLeft: -2, color: colors.text, fontFamily: getFont('OpenSans_300Light') }]}>{t('map options')}</Text>


                {/* Settings / Features List */}
                <View style={{ gap: 20 }}>
                    {/* Street Labels Toggle */}
                    <MetroCheckbox
                        label={t('Street Labels')}
                        value={showLabels || false}
                        onValueChange={(val) => onShowLabelsChange?.(val)}
                        colors={colors}
                        getFont={getFont}
                    />

                    {/* 3D Buildings Toggle */}
                    <MetroCheckbox
                        label={t('3D Buildings')}
                        value={showsBuildings || false}
                        onValueChange={(val) => onShowsBuildingsChange?.(val)}
                        colors={colors}
                        getFont={getFont}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

function MetroCheckbox({ label, value, onValueChange, colors, getFont }: { label: string, value: boolean, onValueChange: (val: boolean) => void, colors: any, getFont: (font: string) => string }) {
    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
            <View style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                borderColor: colors.text,
                backgroundColor: value ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {value && (
                    <MaterialCommunityIcons name="check" size={18} color={colors.background} />
                )}
            </View>
            <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 55,
    }
});
