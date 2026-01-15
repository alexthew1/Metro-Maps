import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OptionsMenuProps {
    active: boolean;
    onClose: () => void;
    useMiles: boolean;
    onUseMilesChange: (val: boolean) => void;
}

export function OptionsMenu({ active, onClose, useMiles, onUseMilesChange }: OptionsMenuProps) {
    const insets = useSafeAreaInsets();

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(active ? 1 : 0, { duration: 200 }),
            pointerEvents: active ? 'auto' : 'none',
        };
    }, [active]);

    return (
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top + 32 }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

            <View pointerEvents="box-none" style={{ padding: 20 }}>
                <Text style={[GlobalStyles.metroLG, { marginBottom: 30 }]}>settings</Text>

                <View style={styles.toggleRow}>
                    <Text style={GlobalStyles.metroMD}>Imperial Units</Text>
                    {/* Metro-style toggle */}
                    <TouchableOpacity
                        style={[styles.metroSwitch, useMiles && styles.metroSwitchOn]}
                        onPress={() => onUseMilesChange(!useMiles)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.metroSwitchThumb, useMiles && styles.metroSwitchThumbOn]} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(31,31,31,0.98)',
        zIndex: 55,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    metroSwitch: {
        width: 60,
        height: 28,
        borderWidth: 2,
        borderColor: '#555',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    metroSwitchOn: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent,
    },
    metroSwitchThumb: {
        width: 20,
        height: 20,
        backgroundColor: '#555',
    },
    metroSwitchThumbOn: {
        backgroundColor: 'white',
        alignSelf: 'flex-end',
    },
});

