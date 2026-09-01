import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Dimensions, Linking, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, interpolate, useSharedValue, withSpring, SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

interface AppBarProps {
    hidden: boolean;
    expanded: boolean;
    onExpandChange: (expanded: boolean) => void;
    onSearchPress: () => void;
    onLocatePress: () => void;
    onFavoritesPress: () => void;
    onSettingsPress: () => void;
    onAboutPress: () => void;
    onDirectionsPress: () => void;
}

const BAR_HEIGHT_COLLAPSED = 68; // Slightly taller for circles
const ICON_SIZE = 48;

export function AppBar({ hidden, expanded, onExpandChange, onSearchPress, onLocatePress, onFavoritesPress, onSettingsPress, onAboutPress, onDirectionsPress }: AppBarProps) {
    const insets = useSafeAreaInsets();
    const screenHeight = Dimensions.get('window').height;
    
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    // Animation Values
    const expandProgress = useSharedValue(expanded ? 1 : 0);

    useEffect(() => {
        expandProgress.value = withTiming(expanded ? 1 : 0, {
            duration: 350,
            easing: Easing.bezier(0.1, 0.9, 0.2, 1)
        });
    }, [expanded]);

    // Derived Heights
    const expandedHeight = 380 + insets.bottom; // Enough for menu items + safe area
    const totalCollapsedHeight = BAR_HEIGHT_COLLAPSED + insets.bottom;

    const animatedStyle = useAnimatedStyle(() => {
        const height = interpolate(expandProgress.value, [0, 1], [totalCollapsedHeight, expandedHeight]);

        return {
            height: height,
            transform: [
                {
                    translateY: withTiming(hidden ? totalCollapsedHeight : 0, { // Hide by sliding down
                        duration: 300,
                    }),
                },
            ],
        };
    }, [hidden, totalCollapsedHeight, expandedHeight]);

    // Opacity for elements that only appear when expanded (Labels, Menu List)
    const expandedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0.4, 1], [0, 1]),
            transform: [{ translateY: interpolate(expandProgress.value, [0, 1], [20, 0]) }]
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle, { backgroundColor: colors.appBarBg }]}>

            {/* Main Bar Row (Always Visible, but labels animate) */}
            <View style={[styles.iconRow, { marginTop: 12 }]}>
                {/* Icons Container - Centered */}
                <View style={styles.centerIcons}>
                    <AppBarButton
                        onPress={onSearchPress}
                        label={t("search")}
                        expandProgress={expandProgress}
                        colors={colors}
                        getFont={getFont}
                    >
                        <Svg width={24} height={24} fill={colors.text} viewBox="0 0 24 24">
                            <Path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </Svg>
                    </AppBarButton>

                    <AppBarButton
                        onPress={onLocatePress}
                        label={t("center")}
                        expandProgress={expandProgress}
                        colors={colors}
                        getFont={getFont}
                    >
                        <Svg width={24} height={24} fill={colors.text} viewBox="0 0 24 24">
                            <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </Svg>
                    </AppBarButton>

                    <AppBarButton
                        onPress={onFavoritesPress}
                        label={t("places")}
                        expandProgress={expandProgress}
                        colors={colors}
                        getFont={getFont}
                    >
                        <MaterialCommunityIcons name="star-outline" size={24} color={colors.text} />
                    </AppBarButton>
                </View>

                {/* Dots Button - Absolute Top Right */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onExpandChange(!expanded)}
                    style={styles.dotsButton}
                >
                    <MaterialCommunityIcons name="dots-horizontal" size={28} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Menu Items (Visible when expanded) */}
            <Animated.View style={[styles.menuList, expandedContentStyle]}>
                <MenuItem label={t("directions")} onPress={() => { onExpandChange(false); onDirectionsPress(); }} colors={colors} getFont={getFont} />
                <MenuItem label={t("settings")} onPress={() => { onExpandChange(false); onSettingsPress(); }} colors={colors} getFont={getFont} />
                <MenuItem label={t("feedback")} onPress={() => { onExpandChange(false); Linking.openURL('mailto:metromapsdev@gmail.com?subject=MetroMaps Feedback'); }} colors={colors} getFont={getFont} />
                <MenuItem label={t("about")} onPress={() => { onExpandChange(false); onAboutPress(); }} colors={colors} getFont={getFont} />
            </Animated.View>

        </Animated.View>
    );
}

// Button that shows label ONLY when expanded
const METRO_EASING = Easing.bezier(0.1, 0.9, 0.2, 1);

function AppBarButton({ children, onPress, label, expandProgress, colors, getFont }: { children: React.ReactNode; onPress: () => void; label: string, expandProgress: SharedValue<number>, colors: any, getFont: (f: string) => string }) {
    const [isPressed, setIsPressed] = useState(false);
    const scale = useSharedValue(1);
    const rotateXVal = useSharedValue(0);
    const rotateYVal = useSharedValue(0);
    const translateYVal = useSharedValue(0);
    const buttonWidth = useSharedValue(48);
    const buttonHeight = useSharedValue(48);

    const labelStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0.7, 1], [0, 1]), // Fade in late
            height: interpolate(expandProgress.value, [0, 1], [0, 20]), // Grow height
        };
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { perspective: 800 },
                { translateY: translateYVal.value },
                { scale: scale.value },
                { rotateX: `${rotateXVal.value}deg` },
                { rotateY: `${rotateYVal.value}deg` }
            ]
        };
    });

    const updateTilt = (locX: number, locY: number, duration: number = 60) => {
        const w = buttonWidth.value || 48;
        const h = buttonHeight.value || 48;
        const normalizedX = Math.max(-1.2, Math.min(1.2, (locX / w) * 2 - 1));
        const normalizedY = Math.max(-1.2, Math.min(1.2, (locY / h) * 2 - 1));
        const maxRotate = 12; // Subtler tilt for natural feel

        rotateXVal.value = withTiming(-normalizedY * maxRotate, { duration, easing: METRO_EASING });
        rotateYVal.value = withTiming(normalizedX * maxRotate, { duration, easing: METRO_EASING });
    };

    const handlePressIn = (e: any) => {
        setIsPressed(true);
        updateTilt(e.nativeEvent.locationX, e.nativeEvent.locationY, 100);
        scale.value = withTiming(0.92, { duration: 100, easing: METRO_EASING });
        translateYVal.value = withSpring(-2, { mass: 1, damping: 12, stiffness: 200 });
    };

    const handleTouchMove = (e: any) => {
        updateTilt(e.nativeEvent.locationX, e.nativeEvent.locationY, 50);
    };

    const handlePressOut = () => {
        setIsPressed(false);
        rotateXVal.value = withTiming(0, { duration: 150, easing: METRO_EASING });
        rotateYVal.value = withTiming(0, { duration: 150, easing: METRO_EASING });
        scale.value = withTiming(1, { duration: 150, easing: METRO_EASING });
        translateYVal.value = withSpring(0, { mass: 1, damping: 12, stiffness: 200 });
    };

    const handleLayout = (e: any) => {
        buttonWidth.value = e.nativeEvent.layout.width;
        buttonHeight.value = e.nativeEvent.layout.height;
    };

    return (
        <Pressable 
            onPress={onPress} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onTouchCancel={handlePressOut}
            onTouchMove={handleTouchMove}
            style={styles.btnContainer}
        >
            <Animated.View 
                onLayout={handleLayout}
                style={[
                    styles.circleIcon, 
                    animatedStyle,
                    { 
                        borderColor: colors.text,
                        backgroundColor: isPressed ? colors.accent : 'transparent'
                    }
                ]}
            >
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            fill: colors.text,
                            color: colors.text
                        });
                    }
                    return child;
                })}
            </Animated.View>
            <Animated.Text style={[styles.label, labelStyle, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{label}</Animated.Text>
        </Pressable>
    );
}

function MenuItem({ label, onPress, colors, getFont }: { label: string, onPress: () => void, colors: any, getFont: (f: string) => string }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.menuItem}>
            <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        // Background color now set dynamically
        overflow: 'hidden', // Clip content during animation
        zIndex: 60,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align top so circles stay put
        justifyContent: 'center', // Explicitly center
        height: 80, // Height of the icon area
    },
    centerIcons: {
        flexDirection: 'row',
        gap: 30, // Space between circles (Increased slightly)
    },
    dotsButton: {
        position: 'absolute',
        right: 0,
        top: 0, // Top right corner
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnContainer: {
        alignItems: 'center',
        width: 60,
    },
    circleIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        // Border color now set dynamically
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        // Color and fontFamily now set dynamically
        textAlign: 'center',
    },
    menuList: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    menuItem: {
        paddingVertical: 12,
    }
});
