import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap Points
const PEEK_HEIGHT = SCREEN_HEIGHT * 0.20;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9;
const HIDDEN_Y = SCREEN_HEIGHT;
const PEEK_Y = SCREEN_HEIGHT - PEEK_HEIGHT;
const EXPANDED_Y = SCREEN_HEIGHT - EXPANDED_HEIGHT;

interface BottomSheetProps {
    visible: boolean;
    children: React.ReactNode;
    header: React.ReactNode;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
}

export function BottomSheet({ visible, children, header, state, onStateChange }: BottomSheetProps) {
    const translateY = useSharedValue(HIDDEN_Y);
    const context = useSharedValue({ y: 0 });

    // Sync prop state to animation
    useEffect(() => {
        const config = {
            duration: 400,
            easing: Easing.bezier(0.1, 0.9, 0.2, 1) // Metro "Standard" Curve
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
    }, [visible, state]);

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

            // Threshold logic
            if (state === 'peek') {
                if (dragY < -50) targetState = 'expanded'; // Drag up -> expand
            } else if (state === 'expanded') {
                if (dragY > 80) targetState = 'peek'; // Drag down to shrink
            }

            // Run Callback
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
