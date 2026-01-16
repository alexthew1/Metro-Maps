import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OptionsMenuProps {
    active: boolean;
    onClose: () => void;
    useMiles: boolean;
    onUseMilesChange: (val: boolean) => void;
    mapType?: 'standard' | 'satellite';
    onMapTypeChange?: (type: 'standard' | 'satellite') => void;
    showLabels?: boolean;
    onShowLabelsChange?: (val: boolean) => void;
}

const THUMB_MAP = require('../assets/images/thumb_map.png');
const THUMB_SAT = require('../assets/images/thumb_satellite.png');

export function OptionsMenu({ active, onClose, useMiles, onUseMilesChange, mapType = 'standard', onMapTypeChange, showLabels = true, onShowLabelsChange }: OptionsMenuProps) {
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
                <Text style={[GlobalStyles.metroXL, { marginBottom: 30, marginLeft: -2 }]}>map options</Text>

                {/* Map Type Tiles (Grid) */}
                <View style={{ flexDirection: 'row', gap: 15, marginBottom: 30 }}>
                    {/* Standard Map Tile */}
                    <TouchableOpacity onPress={() => onMapTypeChange?.('standard')} style={{ alignItems: 'flex-start' }}>
                        <View style={[styles.mapTile, mapType === 'standard' && styles.mapTileSelected]}>
                            <Image source={THUMB_MAP} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                        <Text style={[GlobalStyles.metroXS, { color: mapType === 'standard' ? Colors.accent : '#fff', marginTop: 8 }]}>map</Text>
                    </TouchableOpacity>

                    {/* Satellite Map Tile */}
                    <TouchableOpacity onPress={() => onMapTypeChange?.('satellite')} style={{ alignItems: 'flex-start' }}>
                        <View style={[styles.mapTile, mapType === 'satellite' && styles.mapTileSelected]}>
                            <Image source={THUMB_SAT} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                        <Text style={[GlobalStyles.metroXS, { color: mapType === 'satellite' ? Colors.accent : '#fff', marginTop: 8 }]}>satellite</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings / Features List */}
                <View style={{ gap: 20 }}>
                    {/* Street Labels Checkbox (Metro Style) */}
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}
                        onPress={() => onShowLabelsChange && onShowLabelsChange(!showLabels)}
                    >
                        <View style={[styles.checkbox, showLabels && styles.checkboxChecked]}>
                            {showLabels && <View style={styles.checkmark} />}
                        </View>
                        <Text style={GlobalStyles.metroMD}>street labels</Text>
                    </TouchableOpacity>

                    {/* Imperial Units Checkbox */}
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}
                        onPress={() => onUseMilesChange(!useMiles)}
                    >
                        <View style={[styles.checkbox, useMiles && styles.checkboxChecked]}>
                            {useMiles && <View style={styles.checkmark} />}
                        </View>
                        <Text style={GlobalStyles.metroMD}>imperial units</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(31,31,31,0.75)', // 75% opacity (25% transparent)
        zIndex: 55,
    },
    mapTile: {
        width: 120,
        height: 120, // Larger Square
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#444',
    },
    mapTileSelected: {
        borderColor: Colors.accent,
        borderWidth: 3,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent,
    },
    checkmark: {
        width: 14,
        height: 14,
        backgroundColor: 'white',
    }
});
