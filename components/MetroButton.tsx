import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';

interface MetroButtonProps {
    onPress: () => void;
    title?: string;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'autostyle' | 'accent' | 'outlined' | 'text';
}

// Metro "Standard" easing - smooth and non-bouncy
const METRO_EASING = Easing.bezier(0.1, 0.9, 0.2, 1);

export function MetroButton({ onPress, title, icon, style, textStyle, variant = 'outlined' }: MetroButtonProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withTiming(0.95, { duration: 100, easing: METRO_EASING });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 150, easing: METRO_EASING });
    };

    const getBaseStyle = () => {
        switch (variant) {
            case 'accent': return styles.accent;
            case 'text': return styles.text;
            default: return styles.outlined;
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'accent': return { color: 'white' };
            case 'text': return { color: Colors.accent };
            default: return { color: Colors.text };
        }
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[styles.base, getBaseStyle(), style, animatedStyle]}>
                {icon}
                {title && <Text style={[GlobalStyles.metroMD, getTextStyle(), textStyle, !!icon && { marginLeft: 8 }]}>{title}</Text>}
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    outlined: {
        borderWidth: 2,
        borderColor: Colors.text,
        backgroundColor: 'transparent',
    },
    accent: {
        backgroundColor: Colors.accent,
    },
    text: {
        backgroundColor: 'transparent',
    }
});
