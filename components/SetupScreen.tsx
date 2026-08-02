import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { MetroButton } from './MetroButton';
import { SettingsService, UnitsType } from '../services/settings';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, interpolate, interpolateColor } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomFont } from '../contexts/FontContext';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';

interface SetupScreenProps {
    onComplete: () => void;
}

const FadeInView = ({ children, delay = 0, style }: any) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 100 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

function MetroToggle({ value, onValueChange, colors }: { value: boolean, onValueChange: (val: boolean) => void, colors: typeof Colors.light }) {
    const progress = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(value ? 1 : 0, { duration: 200 });
    }, [value]);

    const toggleWidth = 80;
    const toggleHeight = 32;
    const borderWidth = 2;
    const gap = 2;
    const handleWidth = 14;

    const innerWidth = toggleWidth - (borderWidth * 2);
    
    const handleMinLeft = gap;
    const handleMaxLeft = innerWidth - gap - handleWidth;
    const fillMaxWidth = handleMaxLeft - (gap * 2);

    const borderColorAnimated = useAnimatedStyle(() => {
        return {
            borderColor: interpolateColor(progress.value, [0, 1], [colors.textDim, colors.text])
        };
    });

    const handleColorAnimated = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(progress.value, [0, 1], [colors.textDim, colors.text])
        };
    });

    const fillStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(progress.value, [0, 1], [0, fillMaxWidth]),
            backgroundColor: colors.accent,
            height: toggleHeight - (borderWidth * 2) - (gap * 2),
            marginLeft: gap,
            marginTop: gap,
        };
    });

    const handleStyle = useAnimatedStyle(() => {
        return {
            left: interpolate(progress.value, [0, 1], [handleMinLeft, handleMaxLeft]),
        };
    });

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onValueChange(!value)}
            style={{ position: 'absolute', right: 0, top: verticalScale(10), width: toggleWidth, height: toggleHeight, justifyContent: 'center' }}
        >
            <Animated.View style={[{
                width: toggleWidth,
                height: toggleHeight,
                borderWidth: borderWidth,
                backgroundColor: 'transparent',
            }, borderColorAnimated]}>
                <Animated.View style={fillStyle} />
                <Animated.View style={[{
                    position: 'absolute',
                    width: handleWidth,
                    height: toggleHeight - (borderWidth * 2) - (gap * 2),
                    top: gap,
                }, handleColorAnimated, handleStyle]} />
            </Animated.View>
        </TouchableOpacity>
    );
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
    const insets = useSafeAreaInsets();
    const [error, setError] = useState('');
    const [units, setUnits] = useState<UnitsType>('metric');
    const [zoomEnabled, setZoomEnabled] = useState(false);

    const [langExpanded, setLangExpanded] = useState(false);
    const [themeExpanded, setThemeExpanded] = useState(false);
    const [unitsExpanded, setUnitsExpanded] = useState(false);

    const { t, i18n } = useTranslation();
    const { themeMode, setThemeMode, colors } = useTheme();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    const handleSave = async () => {
        try {
            await AsyncStorage.setItem('SETUP_COMPLETE', 'true');
            await SettingsService.setUnits(units);
            await SettingsService.setZoomControls(zoomEnabled);
            onComplete();
        } catch (e) {
            setError(t('Failed to save settings. Please try again.'));
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior="padding"
        >
            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContent, 
                    { 
                        paddingTop: insets.top + 40,
                        paddingBottom: insets.bottom + 120 // Extra padding so scroll content clears the fixed bottom button
                    }
                ]} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <FadeInView delay={0}>
                    <View style={styles.headerContainer}>
                        <Text style={[GlobalStyles.metroXL, styles.title, { color: colors.text, fontFamily: getFont('OpenSans_300Light') }]}>MetroMaps</Text>
                        <Text style={[GlobalStyles.metroMD, styles.subtitle, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Setup your preferences')}</Text>
                    </View>
                </FadeInView>
                
                <View style={styles.instructionsContainer}>
                    <FadeInView delay={200}>
                        <Text style={[GlobalStyles.metroMD, styles.instructionText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>
                            {t('Welcome to MetroMaps. Please configure your preferences below.')}
                        </Text>
                    </FadeInView>
                </View>

                <FadeInView delay={500} style={styles.settingsSection}>
                    
                    {/* Language Setting */}
                    <View style={[styles.settingRow, { marginTop: 20 }]}>
                        <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Language')}</Text>
                        <TouchableOpacity
                            style={[styles.inputBox, { borderColor: colors.border }, langExpanded && { borderBottomColor: 'transparent' }]}
                            onPress={() => setLangExpanded(!langExpanded)}
                        >
                            <Text style={[styles.inputText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>
                                {i18n.language === 'es' ? 'Español' : i18n.language === 'ja' ? '日本語' : i18n.language === 'pt' ? 'Português' : 'English'}
                            </Text>
                        </TouchableOpacity>

                        {langExpanded && (
                            <View style={[styles.inlineDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                {i18n.language !== 'en' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { i18n.changeLanguage('en'); setLangExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>English</Text>
                                    </TouchableOpacity>
                                )}
                                {i18n.language !== 'es' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { i18n.changeLanguage('es'); setLangExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>Español</Text>
                                    </TouchableOpacity>
                                )}
                                {i18n.language !== 'ja' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { i18n.changeLanguage('ja'); setLangExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>日本語</Text>
                                    </TouchableOpacity>
                                )}
                                {i18n.language !== 'pt' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { i18n.changeLanguage('pt'); setLangExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>Português</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Theme Setting */}
                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Theme')}</Text>
                        <TouchableOpacity
                            style={[styles.inputBox, { borderColor: colors.border }, themeExpanded && { borderBottomColor: 'transparent' }]}
                            onPress={() => setThemeExpanded(!themeExpanded)}
                        >
                            <Text style={[styles.inputText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>
                                {themeMode === 'light' ? t('Light') : themeMode === 'dark' ? t('Dark') : t('System')}
                            </Text>
                        </TouchableOpacity>

                        {themeExpanded && (
                            <View style={[styles.inlineDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                {themeMode !== 'system' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { setThemeMode('system'); setThemeExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('System')}</Text>
                                    </TouchableOpacity>
                                )}
                                {themeMode !== 'light' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { setThemeMode('light'); setThemeExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Light')}</Text>
                                    </TouchableOpacity>
                                )}
                                {themeMode !== 'dark' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { setThemeMode('dark'); setThemeExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Dark')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Units Setting */}
                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Distance Units')}</Text>
                        <TouchableOpacity
                            style={[styles.inputBox, { borderColor: colors.border }, unitsExpanded && { borderBottomColor: 'transparent' }]}
                            onPress={() => setUnitsExpanded(!unitsExpanded)}
                        >
                            <Text style={[styles.inputText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>
                                {units === 'metric' ? t('metric') : units === 'imperial' ? t('imperial') : t('imperial UK')}
                            </Text>
                        </TouchableOpacity>

                        {unitsExpanded && (
                            <View style={[styles.inlineDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                {units !== 'metric' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { setUnits('metric'); setUnitsExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('metric')}</Text>
                                    </TouchableOpacity>
                                )}
                                {units !== 'imperial' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { setUnits('imperial'); setUnitsExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('imperial')}</Text>
                                    </TouchableOpacity>
                                )}
                                {units !== 'imperial_uk' && (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                        onPress={() => { setUnits('imperial_uk'); setUnitsExpanded(false); }}
                                    >
                                        <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('imperial UK')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Zoom Controls Setting */}
                    <View style={[styles.settingRow, { position: 'relative', minHeight: verticalScale(50) }]}>
                        <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(15), marginBottom: verticalScale(2) }]}>{t('Map Zoom Controls')}</Text>
                        <Text style={[styles.settingValue, { color: colors.text, fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(22), textAlign: 'left', marginRight: 0, flex: undefined }]}>{zoomEnabled ? t("On") : t("Off")}</Text>
                        <MetroToggle value={zoomEnabled} onValueChange={setZoomEnabled} colors={colors} />
                    </View>

                </FadeInView>
            </ScrollView>

            {/* Fixed Bottom Button Area */}
            <FadeInView delay={900} style={[styles.bottomContainer, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
                {error ? <Text style={[GlobalStyles.metroSM, styles.errorText, { fontFamily: getFont('OpenSans_400Regular') }]}>{error}</Text> : null}
                <MetroButton 
                    title={t("Save & Continue")} 
                    onPress={handleSave} 
                />
            </FadeInView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        zIndex: 9999,
    },
    scrollContent: {
        paddingHorizontal: 24,
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    headerContainer: {
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        lineHeight: 62,
    },
    subtitle: {
        marginTop: -5,
    },
    instructionsContainer: {
        marginBottom: 20,
    },
    instructionText: {
        lineHeight: 28,
    },
    settingsSection: {
        marginTop: 10,
    },
    settingRow: {
        marginBottom: 25,
    },
    settingRowToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    settingLabel: {
        fontSize: normalizeFont(18),
        marginBottom: verticalScale(10),
    },
    settingValue: {
        fontSize: normalizeFont(18),
        marginRight: 15,
        flex: 1,
        textAlign: 'right',
    },
    inputBox: {
        borderWidth: 2,
        paddingVertical: verticalScale(12),
        paddingHorizontal: horizontalScale(15),
    },
    inputText: {
        fontSize: normalizeFont(22),
    },
    inlineDropdown: {
        borderWidth: 2,
        borderTopWidth: 0,
    },
    dropdownItem: {
        paddingVertical: verticalScale(15),
        paddingHorizontal: horizontalScale(15),
        borderBottomWidth: 1,
    },
    dropdownItemSelected: {
        backgroundColor: 'rgba(128,128,128,0.1)',
    },
    dropdownText: {
        fontSize: normalizeFont(20),
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 15,
    },
    errorText: {
        color: '#ff4444',
        marginBottom: 10,
        textAlign: 'center',
    },
});
