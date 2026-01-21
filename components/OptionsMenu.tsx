import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, BackHandler } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withTiming, useSharedValue, Easing } from 'react-native-reanimated';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface OptionsMenuProps {
    active: boolean;
    onClose: () => void;
    mapType?: 'standard' | 'satellite';
    onMapTypeChange?: (type: 'standard' | 'satellite') => void;
    showLabels?: boolean;
    onShowLabelsChange?: (val: boolean) => void;
    showsBuildings?: boolean;
    onShowsBuildingsChange?: (val: boolean) => void;
}

const THUMB_MAP = require('../assets/images/thumb_map.png');
const THUMB_SAT = require('../assets/images/thumb_satellite.png');


export function OptionsMenu({ active, onClose, mapType = 'standard', onMapTypeChange, showLabels = true, onShowLabelsChange, showsBuildings = true, onShowsBuildingsChange }: OptionsMenuProps) {
    const insets = useSafeAreaInsets();

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(active ? 1 : 0, { duration: 200 }),
            pointerEvents: active ? 'auto' : 'none',
        };
    }, [active]);

    // Hardware Back Button Handler
    useEffect(() => {
        const backAction = () => {
            if (active) {
                onClose();
                return true; // Prevent default behavior (exit app)
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [active, onClose]);

    return (
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top + 20 }]}>
            {/* Background overlay - blocks touches but does NOT close menu */}
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} />

            <View pointerEvents="box-none" style={{ padding: 20 }}>

                <Text style={[GlobalStyles.metroXL, { marginBottom: 30, marginLeft: -2 }]}>map options</Text>

                {/* Map Type Tiles (Grid) */}
                <View style={{ flexDirection: 'row', gap: 15, marginBottom: 30 }}>
                    {/* Standard Map Tile */}
                    <TouchableOpacity onPress={() => onMapTypeChange?.('standard')} style={{ alignItems: 'flex-start' }}>
                        <View style={[styles.mapTile, mapType === 'standard' && styles.mapTileSelected]}>
                            <Image source={THUMB_MAP} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                        <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: 14, color: mapType === 'standard' ? Colors.accent : '#fff', marginTop: 8 }}>map</Text>
                    </TouchableOpacity>

                    {/* Satellite Map Tile */}
                    <TouchableOpacity onPress={() => onMapTypeChange?.('satellite')} style={{ alignItems: 'flex-start' }}>
                        <View style={[styles.mapTile, mapType === 'satellite' && styles.mapTileSelected]}>
                            <Image source={THUMB_SAT} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                        <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: 14, color: mapType === 'satellite' ? Colors.accent : '#fff', marginTop: 8 }}>satellite</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings / Features List */}
                <View style={{ gap: 20 }}>
                    {/* Street Labels Toggle */}
                    <MetroCheckbox
                        label="Street Labels"
                        value={showLabels || false}
                        onValueChange={(val) => onShowLabelsChange?.(val)}
                    />

                    {/* 3D Buildings Toggle */}
                    <MetroCheckbox
                        label="3D Buildings"
                        value={showsBuildings || false}
                        onValueChange={(val) => onShowsBuildingsChange?.(val)}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

function MetroCheckbox({ label, value, onValueChange }: { label: string, value: boolean, onValueChange: (val: boolean) => void }) {
    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
            <View style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                borderColor: 'white',
                backgroundColor: value ? Colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {value && (
                    <MaterialCommunityIcons name="check" size={18} color="white" />
                )}
            </View>
            <Text style={GlobalStyles.metroMD}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(31,31,31,0.75)',
        zIndex: 55,
    },
    mapTile: {
        width: 120,
        height: 120,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#444',
    },
    mapTileSelected: {
        borderColor: Colors.accent,
        borderWidth: 3,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        justifyContent: 'flex-end',
        paddingRight: 4,
    },
    // Metro Switch Styles
    switchContainer: {
        width: 49,
        height: 22,
        backgroundColor: '#ffffff', // The "Outline" Color
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    switchTrack: {
        width: 45,
        height: 18,
        borderWidth: 1,
        borderColor: '#000000',
    },
    switchThumb: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 15,
        height: 22,
        backgroundColor: '#222222', // The Thumb Color
        borderWidth: 1,
        borderColor: '#222222',
        zIndex: 10,
    }
});
