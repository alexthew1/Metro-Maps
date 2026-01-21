import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler, Pressable } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue, interpolate, interpolateColor } from 'react-native-reanimated';
import { GlobalStyles } from '../constants/Styles';
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

    // Reset local state when closing/opening
    useEffect(() => {
        if (!visible) setUnitsExpanded(false);
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
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.appName}>MetroMaps</Text>
                <Text style={styles.title}>settings</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>

                {/* Zoom Controls (Dummy) */}
                <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Zoom controls</Text>
                    <Text style={styles.settingValue}>{showZoomControls ? "On" : "Off"}</Text>
                    <MetroToggle value={showZoomControls} onValueChange={onShowZoomControlsChange} />
                </View>

                {/* Use your location (Dummy) */}
                <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Use your location</Text>
                    <Text style={styles.settingValue}>{showUserLocation ? "On" : "Off"}</Text>
                    <MetroToggle value={showUserLocation} onValueChange={onShowUserLocationChange} />
                </View>

                <View style={[styles.settingRow, { marginTop: 20 }]}>
                    <Text style={styles.settingLabel}>Units</Text>
                    <TouchableOpacity
                        style={styles.inputBox}
                        onPress={() => setUnitsExpanded(!unitsExpanded)}
                    >
                        <Text style={styles.inputText}>{units === 'metric' ? 'metric' : units === 'imperial' ? 'imperial' : 'imperial UK'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Dropdown appears inline, pushing content down */}
                {unitsExpanded && (
                    <View style={styles.inlineDropdown}>
                        <TouchableOpacity
                            style={[styles.dropdownItem, units === 'metric' && styles.dropdownItemSelected]}
                            onPress={() => {
                                onUnitsChange('metric');
                                setUnitsExpanded(false);
                            }}
                        >
                            <Text style={styles.dropdownText}>metric</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.dropdownItem, units === 'imperial' && styles.dropdownItemSelected]}
                            onPress={() => {
                                onUnitsChange('imperial');
                                setUnitsExpanded(false);
                            }}
                        >
                            <Text style={styles.dropdownText}>imperial</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.dropdownItem, units === 'imperial_uk' && styles.dropdownItemSelected]}
                            onPress={() => {
                                onUnitsChange('imperial_uk');
                                setUnitsExpanded(false);
                            }}
                        >
                            <Text style={styles.dropdownText}>imperial UK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Clear History Button */}
                <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onClearHistory}>
                    <Text style={styles.buttonText}>clear history</Text>
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

function MetroToggle({ value, onValueChange }: { value: boolean, onValueChange: (val: boolean) => void }) {
    // Metro style toggle: Rectangular with sliding animation
    // OFF = handle on left (0), ON = handle on right (60 - 10 = 50)
    const progress = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(value ? 1 : 0, { duration: 200 });
    }, [value]);

    // Animated fill that expands from left
    const fillStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(progress.value, [0, 1], [0, 62]), // Full width when ON
            backgroundColor: Colors.accent,
            height: 18,
            margin: 2,
        };
    });

    // Handle slides from left to right
    const handleStyle = useAnimatedStyle(() => {
        return {
            left: interpolate(progress.value, [0, 1], [0, 60]), // 70 - 10 = 60
        };
    });

    return (
        <Pressable onPress={() => onValueChange(!value)} style={{ position: 'absolute', right: 0, top: 20 }}>
            <View style={{ flexDirection: 'row', width: 70, height: 26, borderWidth: 2, borderColor: 'white', alignItems: 'center', backgroundColor: 'black' }}>
                {/* Animated Fill for ON state */}
                <Animated.View style={fillStyle} />
            </View>

            {/* The Handle / White Bar - slides with fill */}
            <Animated.View style={[{
                position: 'absolute',
                top: -2, bottom: -2, width: 10, backgroundColor: 'white',
            }, handleStyle]} />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 80, // High z-index to cover everything
    },
    header: {
        marginBottom: 20,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    appName: {
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: 12,
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
    },
    title: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 42,
        color: 'white',
    },
    settingRow: {
        marginBottom: 25,
        position: 'relative',
        minHeight: 50,
    },
    settingLabel: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 15,
        color: '#999',
        marginBottom: 2,
    },
    settingValue: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 22,
        color: 'white',
    },
    inputBox: {
        borderWidth: 2,
        borderColor: 'white',
        padding: 5,
        paddingHorizontal: 10,
        marginTop: 5,
    },
    inputText: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 16,
        color: 'white',
    },
    button: {
        borderWidth: 2,
        borderColor: 'white',
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    buttonText: {
        color: 'white',
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: 15,
    },
    dropdownContainer: {
        position: 'absolute',
        top: 65, // Below input box
        left: 0,
        right: 0,
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 100,
    },
    dropdownItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    dropdownItemSelected: {
        backgroundColor: Colors.accent,
    },
    dropdownText: {
        color: 'white',
        fontFamily: 'OpenSans_400Regular',
        fontSize: 16,
    },
    inlineDropdown: {
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: 'white',
        marginTop: -2, // Connect visually to input box above
        marginBottom: 15,
    }
});
