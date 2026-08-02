import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler, Pressable } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue, interpolate, interpolateColor } from 'react-native-reanimated';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { GlobalStyles } from '../constants/Styles';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomFont } from '../contexts/FontContext';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type UnitsType = 'metric' | 'imperial' | 'imperial_uk';

interface SettingsSheetProps {
    visible: boolean;
    onClose: () => void;
    units: UnitsType;
    onUnitsChange: (val: UnitsType) => void;
    showZoomControls: boolean;
    onShowZoomControlsChange: (val: boolean) => void;
    showUserLocation: boolean;
    onShowUserLocationChange: (val: boolean) => void;
    onClearHistory: () => void;
}

export function SettingsSheet({ visible, onClose, units, onUnitsChange, showZoomControls, onShowZoomControlsChange, showUserLocation, onShowUserLocationChange, onClearHistory }: SettingsSheetProps) {
    const insets = useSafeAreaInsets();
    const [unitsExpanded, setUnitsExpanded] = React.useState(false);
    const [langExpanded, setLangExpanded] = React.useState(false);
    const [themeExpanded, setThemeExpanded] = React.useState(false);
    const { t, i18n } = useTranslation();
    const { themeMode, setThemeMode, colors } = useTheme();
    const { customFonts, loadCustomFont, clearCustomFont } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    // Reset local state when closing/opening
    useEffect(() => {
        if (!visible) {
            setUnitsExpanded(false);
            setLangExpanded(false);
            setThemeExpanded(false);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
            transform: [{ translateX: withTiming(visible ? 0 : 50, { duration: 200 }) }], // Slide in slight effect
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
                <Text style={[styles.appName, { color: colors.textDim, fontFamily: getFont('OpenSans_600SemiBold') }]}>{t('MetroMaps')}</Text>
                <Text style={[styles.title, { color: colors.text, fontFamily: getFont('OpenSans_300Light') }]}>{t('settings')}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>

                {/* Theme Picker */}
                <View style={[styles.settingRow, { marginTop: 20 }]}>
                    <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Theme')}</Text>
                    <TouchableOpacity
                        style={[styles.inputBox, { borderColor: colors.border }, themeExpanded && { borderBottomColor: 'transparent', paddingBottom: verticalScale(5) }]}
                        onPress={() => setThemeExpanded(!themeExpanded)}
                    >
                        <Text style={[styles.inputText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{themeMode === 'light' ? t('Light') : themeMode === 'dark' ? t('Dark') : t('System')}</Text>
                    </TouchableOpacity>
                    {themeExpanded && (
                        <View style={[styles.inlineDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            {themeMode !== 'light' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setThemeMode('light');
                                        setThemeExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Light')}</Text>
                                </TouchableOpacity>
                            )}
                            {themeMode !== 'dark' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setThemeMode('dark');
                                        setThemeExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Dark')}</Text>
                                </TouchableOpacity>
                            )}
                            {themeMode !== 'system' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setThemeMode('system');
                                        setThemeExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('System')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Language Picker */}
                <View style={[styles.settingRow, { marginTop: 20 }]}>
                    <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Language')}</Text>
                    <TouchableOpacity
                        style={[styles.inputBox, { borderColor: colors.border }, langExpanded && { borderBottomColor: 'transparent', paddingBottom: verticalScale(5) }]}
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
                                    onPress={() => {
                                        i18n.changeLanguage('en');
                                        setLangExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>English</Text>
                                </TouchableOpacity>
                            )}
                            {i18n.language !== 'es' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        i18n.changeLanguage('es');
                                        setLangExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>Español</Text>
                                </TouchableOpacity>
                            )}
                            {i18n.language !== 'ja' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        i18n.changeLanguage('ja');
                                        setLangExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>日本語</Text>
                                </TouchableOpacity>
                            )}
                            {i18n.language !== 'pt' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        i18n.changeLanguage('pt');
                                        setLangExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>Português</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>



                {/* Zoom Controls */}
                <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Zoom controls')}</Text>
                    <Text style={[styles.settingValue, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{showZoomControls ? t("On") : t("Off")}</Text>
                    <MetroToggle value={showZoomControls} onValueChange={onShowZoomControlsChange} colors={colors} />
                </View>

                {/* Use your location */}
                <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Use your location')}</Text>
                    <Text style={[styles.settingValue, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{showUserLocation ? t("On") : t("Off")}</Text>
                    <MetroToggle value={showUserLocation} onValueChange={onShowUserLocationChange} colors={colors} />
                </View>

                <View style={[styles.settingRow, { marginTop: 20 }]}>
                    <Text style={[styles.settingLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Units')}</Text>
                    <TouchableOpacity
                        style={[styles.inputBox, { borderColor: colors.border }, unitsExpanded && { borderBottomColor: 'transparent', paddingBottom: verticalScale(5) }]}
                        onPress={() => setUnitsExpanded(!unitsExpanded)}
                    >
                        <Text style={[styles.inputText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{units === 'metric' ? t('metric') : units === 'imperial' ? t('imperial') : t('imperial UK')}</Text>
                    </TouchableOpacity>
                    {unitsExpanded && (
                        <View style={[styles.inlineDropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            {units !== 'metric' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        onUnitsChange('metric');
                                        setUnitsExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('metric')}</Text>
                                </TouchableOpacity>
                            )}
                            {units !== 'imperial' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        onUnitsChange('imperial');
                                        setUnitsExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('imperial')}</Text>
                                </TouchableOpacity>
                            )}
                            {units !== 'imperial_uk' && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        onUnitsChange('imperial_uk');
                                        setUnitsExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('imperial UK')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Clear History Button */}
                <TouchableOpacity style={[styles.button, { marginTop: 15, borderColor: colors.border }]} activeOpacity={0.8} onPress={onClearHistory}>
                    <Text style={[styles.buttonText, { color: colors.text, fontFamily: getFont('OpenSans_600SemiBold') }]}>{t('clear history')}</Text>
                </TouchableOpacity>

            </ScrollView>
        </Animated.View>
    );
}

function AnimatedDropdown({ expanded, children }: { expanded: boolean, children: React.ReactNode }) {
    const progress = useSharedValue(expanded ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(expanded ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
    }, [expanded]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: progress.value,
            transform: [{ translateY: interpolate(progress.value, [0, 1], [-10, 0]) }],
        };
    });

    // Just don't render if not expanded - simplest solution for touch interactivity
    if (!expanded) return null;

    return (
        <Animated.View style={[{ position: 'absolute', top: 65, left: 0, right: 0, zIndex: 100 }, animatedStyle]}>
            {children}
        </Animated.View>
    )
}

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

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 80,
    },
    header: {
        marginBottom: verticalScale(20),
        paddingHorizontal: horizontalScale(20),
        marginTop: verticalScale(10),
    },
    appName: {
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: normalizeFont(12),
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: verticalScale(5),
    },
    title: {
        fontFamily: 'OpenSans_300Light',
        fontSize: normalizeFont(42),
        color: 'white',
    },
    settingRow: {
        marginBottom: verticalScale(25),
        position: 'relative',
        minHeight: verticalScale(50),
    },
    settingLabel: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(15),
        color: '#999',
        marginBottom: verticalScale(2),
    },
    settingValue: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(22),
        color: 'white',
    },
    inputBox: {
        borderWidth: 2,
        borderColor: 'white',
        padding: verticalScale(5),
        paddingHorizontal: horizontalScale(10),
        marginTop: verticalScale(5),
    },
    inputText: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(16),
        color: 'white',
    },
    button: {
        borderWidth: 2,
        borderColor: 'white',
        paddingVertical: verticalScale(8),
        alignItems: 'center',
        marginTop: verticalScale(30),
    },
    buttonText: {
        color: 'white',
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: normalizeFont(15),
    },
    dropdownContainer: {
        position: 'absolute',
        top: verticalScale(65),
        left: 0,
        right: 0,
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 100,
    },
    dropdownItem: {
        padding: verticalScale(10),
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    dropdownItemSelected: {
        backgroundColor: Colors.light.accent,
    },
    dropdownText: {
        color: 'white',
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(16),
    },
    inlineDropdown: {
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: 'white',
        marginTop: verticalScale(-2),
        marginBottom: verticalScale(15),
    }
});
