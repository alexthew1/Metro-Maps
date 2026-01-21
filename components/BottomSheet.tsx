import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default Snap Points
const DEFAULT_PEEK_HEIGHT = SCREEN_HEIGHT * 0.17;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9;
const HIDDEN_Y = SCREEN_HEIGHT;
const EXPANDED_Y = SCREEN_HEIGHT - EXPANDED_HEIGHT;

interface BottomSheetProps {
    visible: boolean;
    children: React.ReactNode;
    header: React.ReactNode;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    peekHeight?: number; // Optional custom peek height
}

export function BottomSheet({ visible, children, header, state, onStateChange, peekHeight }: BottomSheetProps) {
    const translateY = useSharedValue(HIDDEN_Y);
    const context = useSharedValue({ y: 0 });

    // Track state as a shared value for use in worklets (0=hidden, 1=peek, 2=expanded)
    const stateValue = useSharedValue(state === 'hidden' ? 0 : state === 'peek' ? 1 : 2);

    // Sync React state to shared value
    useEffect(() => {
        stateValue.value = state === 'hidden' ? 0 : state === 'peek' ? 1 : 2;
    }, [state]);

    // Calculate peek Y based on custom or default height
    const PEEK_HEIGHT = peekHeight ?? DEFAULT_PEEK_HEIGHT;
    const PEEK_Y = SCREEN_HEIGHT - PEEK_HEIGHT;

    // Sync prop state to animation
    useEffect(() => {
        const config = {
            duration: 400,
            easing: Easing.out(Easing.cubic) // Smooth Cubic Out
        };

        if (!visible || state === 'hidden') {
            translateY.value = withTiming(HIDDEN_Y, config);
        } else {
            if (state === 'peek') {
                translateY.value = withTiming(PEEK_Y, config);
            } else if (state === 'expanded') {
                translateY.value = withTiming(EXPANDED_Y, config);
            }
        }
    }, [visible, state, PEEK_Y]);

    // Gesture
    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            let newY = event.translationY + context.value.y;

            // Clamp based on state:
            // Expanded: PINNED at top - can only go down to PEEK_Y
            // Peek: PINNED at bottom - can only go up to EXPANDED_Y (can't shrink below peek)
            if (state === 'expanded') {
                newY = Math.max(newY, EXPANDED_Y); // Can't go above expanded (pinned)
                newY = Math.min(newY, PEEK_Y); // Can only shrink down to peek
            } else if (state === 'peek') {
                newY = Math.max(newY, EXPANDED_Y); // Can go up to expanded
                newY = Math.min(newY, PEEK_Y); // PINNED - can't go below peek
            }

            translateY.value = newY;
        })
        .onEnd((event) => {
            const dragY = event.translationY; // Down is positive

            let targetState: 'hidden' | 'peek' | 'expanded' = state === 'hidden' ? 'peek' : state;
            let targetY = state === 'peek' ? PEEK_Y : EXPANDED_Y;

            // Threshold logic
            if (state === 'peek') {
                if (dragY < -50) {
                    targetState = 'expanded';
                    targetY = EXPANDED_Y;
                } else {
                    targetY = PEEK_Y;
                }
            } else if (state === 'expanded') {
                if (dragY > 80) {
                    targetState = 'peek';
                    targetY = PEEK_Y;
                } else {
                    targetY = EXPANDED_Y;
                }
            }

            // Animate immediately on UI thread (no JS round-trip delay)
            translateY.value = withTiming(targetY, { duration: 350, easing: Easing.out(Easing.cubic) });

            // Sync state to React (for other components to know)
            runOnJS(onStateChange)(targetState);
        });

    // Tap to expand from peek
    const handleTap = () => {
        if (state === 'peek') onStateChange('expanded');
    }

    const rStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View style={[styles.sheet, rStyle]}>
            <GestureDetector gesture={gesture}>
                <TouchableWithoutFeedback onPress={handleTap}>
                    <View style={styles.handleContainer}>
                        {header}
                    </View>
                </TouchableWithoutFeedback>
            </GestureDetector>
            <View style={[styles.contentContainer, { maxHeight: EXPANDED_HEIGHT - 100 }]}>
                {children}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT, // Full height available, but positioned down
        backgroundColor: 'black',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        zIndex: 40,
    },
    handleContainer: {
        backgroundColor: 'black',
        // borderBottomWidth: 1, // Removed for cleaner Metro look
        // borderBottomColor: '#333',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: 'black',
    }
});
