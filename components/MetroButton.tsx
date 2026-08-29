import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomFont } from '../contexts/FontContext';

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
    const rotateXVal = useSharedValue(0);
    const rotateYVal = useSharedValue(0);
    const buttonWidth = useSharedValue(100);
    const buttonHeight = useSharedValue(50);
    const [isPressed, setIsPressed] = React.useState(false);
    const { colors } = useTheme();
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
            transform: [
                { perspective: 800 },
                { scale: scale.value },
                { rotateX: `${rotateXVal.value}deg` },
                { rotateY: `${rotateYVal.value}deg` }
            ],
        };
    });

    const updateTilt = (locX: number, duration: number = 80) => {
        const w = buttonWidth.value || 100;
        const normalizedX = Math.max(-1.2, Math.min(1.2, (locX / w) * 2 - 1));
        const maxRotate = 15; // Max tilt degrees

        // Metro buttons tilt horizontally only (left / right), no up and down tilt
        rotateXVal.value = 0;
        rotateYVal.value = withTiming(normalizedX * maxRotate, { duration, easing: METRO_EASING });
    };

    const handlePressIn = (e: any) => {
        setIsPressed(true);
        updateTilt(e.nativeEvent.locationX, 100);
        scale.value = withTiming(0.92, { duration: 100, easing: METRO_EASING });
    };

    const handleTouchMove = (e: any) => {
        updateTilt(e.nativeEvent.locationX, 50);
    };

    const handlePressOut = () => {
        setIsPressed(false);
        rotateXVal.value = 0;
        rotateYVal.value = withTiming(0, { duration: 150, easing: METRO_EASING });
        scale.value = withTiming(1, { duration: 150, easing: METRO_EASING });
    };

    const getBaseStyle = () => {
        switch (variant) {
            case 'accent': return { backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.accent };
            case 'text': return { backgroundColor: 'transparent' };
            default: return { borderWidth: 3, borderColor: colors.text, backgroundColor: 'transparent' };
        }
    };

    const getPressedStyle = () => {
        switch (variant) {
            case 'accent': return { backgroundColor: colors.text, borderColor: colors.text };
            case 'text': return { backgroundColor: colors.textDim };
            default: return { backgroundColor: colors.text, borderColor: colors.text };
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'accent': return { color: Colors.white };
            case 'text': return { color: colors.accent };
            default: return { color: colors.text };
        }
    };

    const getPressedTextStyle = () => {
        switch (variant) {
            case 'accent': return { color: colors.background };
            case 'text': return { color: colors.background };
            default: return { color: colors.background };
        }
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
            onTouchMove={handleTouchMove}
            onLayout={handleLayout}
        >
            <Animated.View style={[styles.base, getBaseStyle(), style, isPressed && getPressedStyle(), animatedStyle]}>
                {icon}
                {title && <Text style={[GlobalStyles.metroMD, getTextStyle(), textStyle, isPressed && getPressedTextStyle(), !!icon && { marginLeft: 8 }, { fontFamily: getFont('OpenSans_400Regular') }]}>{title}</Text>}
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
    }
});
