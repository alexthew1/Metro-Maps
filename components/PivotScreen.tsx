import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { MetroButton } from './MetroButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchResult } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom Map Style for Mini Map (Desaturated)
const MINI_MAP_STYLE = [
    { "stylers": [{ "saturation": -100 }, { "gamma": 0.5 }] },
    { "elementType": "labels", "stylers": [{ "visibility": "off" }] } // Cleaner look
];

interface PivotScreenProps {
    item: SearchResult | null;
    active: boolean;
    onClose: () => void;
    onGetDirections: () => void;
}

export function PivotScreen({ item, active, onClose, onGetDirections }: PivotScreenProps) {
    const insets = useSafeAreaInsets();

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: withTiming(active ? 0 : SCREEN_WIDTH, {
                        duration: 400,
                        easing: Easing.bezier(0.1, 0.9, 0.2, 1),
                    }),
                },
            ],
        };
    }, [active]);

    if (!item) return null;

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    return (
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top + 40 }]}>
            {/* Header: Title */}
            <Text style={[GlobalStyles.metroXS, { fontWeight: '700', marginLeft: 20, marginBottom: 10, textTransform: 'uppercase' }]}>
                {item.display_name.split(',')[0]}
            </Text>

            {/* Pivot Header: "about" */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', gap: 30, paddingHorizontal: 20, paddingBottom: 10 }}>
                    <Text style={[GlobalStyles.metroLG, { fontWeight: '300', fontSize: 42 }]}>about</Text>
                </View>

                {/* Close Button overlapping slightly to the right */}
                <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 20, top: 10 }}>
                    {/* Using text for now or Icon if available */}
                    {/* <Text style={{ fontSize: 30, color: 'white' }}>×</Text> */}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

                {/* Map + Get Directions Row */}
                <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 20, gap: 20 }}>
                    {/* Mini Map */}
                    <View style={{ height: 150, width: 150 }}>
                        <MapView
                            style={{ flex: 1 }}
                            provider={PROVIDER_GOOGLE}
                            customMapStyle={MINI_MAP_STYLE}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            rotateEnabled={false}
                            pitchEnabled={false}
                            initialRegion={{
                                latitude: lat,
                                longitude: lon,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }}
                        >
                            <Marker coordinate={{ latitude: lat, longitude: lon }}>
                                <View style={styles.miniPin} />
                            </Marker>
                        </MapView>
                    </View>

                    {/* Button + Address */}
                    <View style={{ flex: 1, justifyContent: 'flex-start' }}>
                        <MetroButton
                            title="get directions"
                            variant="outlined"
                            onPress={onGetDirections}
                            style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                            textStyle={{ fontSize: 14 }}
                        />
                        <Text style={[GlobalStyles.metroSM, { color: 'white', marginTop: 10 }]} numberOfLines={3}>
                            {item.display_name}
                        </Text>
                    </View>
                </View>

                {/* Info Fields */}
                <View style={{ gap: 20 }}>
                    {item.extratags?.phone && (
                        <View>
                            <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { marginBottom: 0 }]}>phone</Text>
                            <Text style={[GlobalStyles.metroMD, { fontSize: 22 }]}>{item.extratags.phone}</Text>
                        </View>
                    )}

                    {item.extratags?.opening_hours && (
                        <View>
                            <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { marginBottom: 0 }]}>opening hours</Text>
                            <Text style={[GlobalStyles.metroMD, { fontSize: 22 }]}>{item.extratags.opening_hours}</Text>
                        </View>
                    )}

                </View>



            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        zIndex: 70,
    },
    header: {
        marginBottom: 10,
    },
    miniPin: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.accent,
        borderWidth: 2,
        borderColor: 'white',
    },
});
