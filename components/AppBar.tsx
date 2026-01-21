import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Dimensions, Linking } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, interpolate, useSharedValue, withSpring, SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

    // Animation Values
    const expandProgress = useSharedValue(expanded ? 1 : 0);

    useEffect(() => {
        expandProgress.value = withTiming(expanded ? 1 : 0, {
            duration: 350,
            easing: Easing.bezier(0.1, 0.9, 0.2, 1)
        });
    }, [expanded]);

    // Derived Heights
    // Collapsed: just the bar + bottom inset
    // Expanded: Let's say 60% of screen or auto-size based on content? 
    // Metro usually went up to show the list. Let's use a fixed large height for now or count items.
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
            // Also need to adjust background opacity if we wanted glass effect, but solid black is requested
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
        <Animated.View style={[styles.container, animatedStyle]}>

            {/* Main Bar Row (Always Visible, but labels animate) */}
            <View style={[styles.iconRow, { marginTop: 12 }]}>
                {/* Icons Container - Centered */}
                <View style={styles.centerIcons}>
                    <AppBarButton
                        onPress={onSearchPress}
                        label="search"
                        expandProgress={expandProgress}
                    >
                        <Svg width={24} height={24} fill="white" viewBox="0 0 24 24">
                            <Path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </Svg>
                    </AppBarButton>

                    <AppBarButton
                        onPress={onLocatePress}
                        label="center"
                        expandProgress={expandProgress}
                    >
                        <Svg width={24} height={24} fill="white" viewBox="0 0 24 24">
                            <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </Svg>
                    </AppBarButton>

                    <AppBarButton
                        onPress={onFavoritesPress}
                        label="places"
                        expandProgress={expandProgress}
                    >
                        <MaterialCommunityIcons name="star-outline" size={24} color="white" />
                    </AppBarButton>
                </View>

                {/* Dots Button - Absolute Top Right */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onExpandChange(!expanded)}
                    style={styles.dotsButton}
                >
                    <MaterialCommunityIcons name="dots-horizontal" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* Menu Items (Visible when expanded) */}
            <Animated.View style={[styles.menuList, expandedContentStyle]}>
                <MenuItem label="directions" onPress={() => { onExpandChange(false); onDirectionsPress(); }} />
                {/* download maps removed */}
                <MenuItem label="settings" onPress={() => { onExpandChange(false); onSettingsPress(); }} />
                <MenuItem label="feedback" onPress={() => { onExpandChange(false); Linking.openURL('mailto:metromapsdev@gmail.com?subject=MetroMaps Feedback'); }} />
                <MenuItem label="about" onPress={() => { onExpandChange(false); onAboutPress(); }} />
            </Animated.View>

        </Animated.View>
    );
}

// Button that shows label ONLY when expanded
function AppBarButton({ children, onPress, label, expandProgress }: { children: React.ReactNode; onPress: () => void; label: string, expandProgress: SharedValue<number> }) {

    const labelStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(expandProgress.value, [0.7, 1], [0, 1]), // Fade in late
            height: interpolate(expandProgress.value, [0, 1], [0, 20]), // Grow height
        };
    });

    return (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.btnContainer}>
            <View style={styles.circleIcon}>
                {children}
            </View>
            <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
        </TouchableOpacity>
    );
}

function MenuItem({ label, onPress }: { label: string, onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.menuItem}>
            <Text style={GlobalStyles.metroMD}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#1f1f1f',
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
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    label: {
        color: '#c4c4c4',
        fontSize: 12,
        fontFamily: 'OpenSans_400Regular',
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
