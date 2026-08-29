import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolate, interpolateColor, Easing } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/Colors';
import { verticalScale } from '../utils/responsive';

const METRO_EASING = Easing.bezier(0.1, 0.9, 0.2, 1);

interface MetroToggleProps {
    value: boolean;
    onValueChange: (val: boolean) => void;
    colors?: typeof Colors.light;
}

export function MetroToggle({ value, onValueChange, colors: customColors }: MetroToggleProps) {
    const { colors: themeColors } = useTheme();
    const colors = customColors || themeColors;

    const progress = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(value ? 1 : 0, {
            duration: 200,
            easing: METRO_EASING,
        });
    }, [value]);

    const TRACK_WIDTH = 90;
    const TRACK_HEIGHT = 32;
    const BORDER_WIDTH = 2.5;
    const OUTLINE_GAP = 2; // 2px black outline separating blue fill from outer border
    const SWITCH_GAP = 1; // 1px black border separating blue from switch component
    const THUMB_WIDTH = 17;
    const THUMB_HEIGHT = 40;
    const THUMB_BORDER = 1; // 1px black border around switch
    const THUMB_OVERFLOW_Y = (THUMB_HEIGHT - TRACK_HEIGHT) / 2; // 4px top & bottom

    // Thumb position range:
    // Leftmost (off): rests at the left edge with border overlap
    // Rightmost (on): rests at the right edge with border overlap
    const minLeft = -THUMB_BORDER;
    const maxLeft = TRACK_WIDTH - THUMB_WIDTH + THUMB_BORDER;

    // Maximum width of the blue fill leaving 2px on left and 1px separation before switch on right
    const innerTrackWidth = TRACK_WIDTH - (BORDER_WIDTH * 2);
    const maxFillWidth = Math.max(0, innerTrackWidth - (THUMB_WIDTH - THUMB_BORDER) - SWITCH_GAP);

    const borderAnimatedStyle = useAnimatedStyle(() => {
        return {
            borderColor: interpolateColor(progress.value, [0, 1], [colors.textDim, colors.text]),
        };
    });

    const fillAnimatedStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(progress.value, [0, 1], [0, maxFillWidth]),
            backgroundColor: colors.accent,
        };
    });

    const thumbAnimatedStyle = useAnimatedStyle(() => {
        return {
            left: interpolate(progress.value, [0, 1], [minLeft, maxLeft]),
            backgroundColor: interpolateColor(progress.value, [0, 1], [colors.textDim, colors.text]),
            borderColor: colors.background,
        };
    });

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onValueChange(!value)}
            style={styles.touchable}
        >
            <View style={[styles.container, { width: TRACK_WIDTH, height: THUMB_HEIGHT }]}>
                {/* Track Box */}
                <Animated.View style={[
                    styles.track,
                    {
                        width: TRACK_WIDTH,
                        height: TRACK_HEIGHT,
                        borderWidth: BORDER_WIDTH,
                        top: THUMB_OVERFLOW_Y,
                    },
                    borderAnimatedStyle,
                ]}>
                    <Animated.View style={[
                        styles.fill,
                        {
                            height: TRACK_HEIGHT - (BORDER_WIDTH * 2) - (OUTLINE_GAP * 2),
                            marginTop: OUTLINE_GAP,
                            marginLeft: OUTLINE_GAP,
                        },
                        fillAnimatedStyle,
                    ]} />
                </Animated.View>

                {/* Thumb Slider with black border */}
                <Animated.View style={[
                    styles.thumb,
                    {
                        width: THUMB_WIDTH,
                        height: THUMB_HEIGHT,
                        borderWidth: THUMB_BORDER,
                        top: 0,
                    },
                    thumbAnimatedStyle,
                ]} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    touchable: {
        position: 'absolute',
        right: 0,
        top: verticalScale(10),
        justifyContent: 'center',
    },
    container: {
        position: 'relative',
        justifyContent: 'center',
    },
    track: {
        position: 'absolute',
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    fill: {
        width: 0,
    },
    thumb: {
        position: 'absolute',
    },
});
