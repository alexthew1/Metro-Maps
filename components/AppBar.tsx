import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AppBarProps {
    hidden: boolean;
    onSearchPress: () => void;
    onLocatePress: () => void;
    onFavoritesPress: () => void;
}

const BAR_HEIGHT = 72;

export function AppBar({ hidden, onSearchPress, onLocatePress, onFavoritesPress }: AppBarProps) {
    const insets = useSafeAreaInsets();

    // We can keep labels hidden by default or passed as prop if needed. 
    // For now, let's just minimalize it to match the requested style.
    const [showLabels, setShowLabels] = React.useState(false);

    // Increase height by safe area bottom + extra for labels if shown
    const baseHeight = showLabels ? BAR_HEIGHT + 20 : BAR_HEIGHT;
    const totalHeight = baseHeight + insets.bottom;

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(totalHeight, { duration: 200 }),
            transform: [
                {
                    translateY: withTiming(hidden ? totalHeight : 0, {
                        duration: 400,
                        easing: Easing.bezier(0.1, 0.9, 0.2, 1),
                    }),
                },
            ],
        };
    }, [hidden, totalHeight, showLabels]);

    return (
        <Animated.View style={[
            styles.container,
            animatedStyle,
            { paddingBottom: insets.bottom, justifyContent: 'center', gap: 20 }
        ]}>
            <CircleButton onPress={onSearchPress} label="search" showLabel={showLabels}>
                {/* Search Icon */}
                <Svg width={22} height={22} fill="white" viewBox="0 0 24 24">
                    <Path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </Svg>
            </CircleButton>

            <CircleButton onPress={onLocatePress} label="locate me" showLabel={showLabels}>
                {/* Locate Icon */}
                <Svg width={22} height={22} fill="white" viewBox="0 0 24 24">
                    <Path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                </Svg>
            </CircleButton>

            <CircleButton onPress={onFavoritesPress} label="favorites" showLabel={showLabels}>
                {/* Favorites Icon (Star) */}
                <MaterialCommunityIcons name="star" size={24} color="white" />
            </CircleButton>


            <TouchableOpacity
                style={{ padding: 5, position: 'absolute', right: 10, top: 10 }}
                onPress={() => setShowLabels(!showLabels)}
            >
                <Text style={{ fontSize: 24, color: 'white', fontFamily: 'OpenSans_700Bold', lineHeight: 24 }}>...</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

function CircleButton({ children, onPress, label, showLabel }: { children: React.ReactNode; onPress: () => void; label: string; showLabel: boolean }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.circleBtn}>
                {children}
            </TouchableOpacity>
            {showLabel && (
                <Text style={{ color: 'white', fontSize: 12, marginTop: 4, fontFamily: 'OpenSans_400Regular' }}>{label}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: Colors.appBarBg,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 60,
    },
    circleBtn: {
        width: 48,
        height: 48,
        borderRadius: 24, // Visual circle
        borderWidth: 2,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
