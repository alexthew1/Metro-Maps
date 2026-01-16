import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { RouteResult } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavigationSheetProps {
    route: RouteResult | null;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onStartNavigation?: () => void;
    transportMode?: 'driving' | 'walking' | 'transit';
    onModeChange?: (mode: 'driving' | 'walking' | 'transit') => void;
    error?: string | null;
    useMiles?: boolean;
}

export function NavigationSheet({ route, state, onStateChange, onStartNavigation, transportMode = 'driving', onModeChange, error, useMiles = true }: NavigationSheetProps) {
    const insets = useSafeAreaInsets();

    // If we have neither route nor error, we probably shouldn't be showing (or we are loading, but loading state not implemented yet)
    if (!route && !error) return null;

    const durationMin = route ? Math.round(route.duration / 60) : 0;

    let distDisplay = '0.0';
    if (route) {
        if (useMiles) {
            const miles = route.distance / 1609.34;
            distDisplay = `${miles.toFixed(1)} mi`;
        } else {
            const km = route.distance / 1000;
            distDisplay = `${km.toFixed(1)} km`;
        }
    }

    const Header = (
        <View style={styles.header}>
            {/* Top Row: Title + Start Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={[GlobalStyles.metroXL, { fontSize: 40 }]}>directions</Text>

                {/* Start Button - Disabled if no route */}
                <TouchableOpacity
                    onPress={() => route && onStartNavigation && onStartNavigation()}
                    style={[styles.startButton, !route && { borderColor: '#555' }]}
                    disabled={!route}
                >
                    <Text style={[GlobalStyles.metroSM, { fontWeight: 'bold', color: route ? 'white' : '#555', fontSize: 16 }]}>start</Text>
                </TouchableOpacity>
            </View>

            {/* Transport Mode Toggles */}
            <View style={{ flexDirection: 'row', gap: 25, marginBottom: 20 }}>
                <TouchableOpacity onPress={() => onModeChange?.('driving')}>
                    <Ionicons name="car" size={32} color={transportMode === 'driving' ? Colors.accent : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onModeChange?.('transit')}>
                    <Ionicons name="bus" size={32} color={transportMode === 'transit' ? Colors.accent : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onModeChange?.('walking')}>
                    <Ionicons name="walk" size={32} color={transportMode === 'walking' ? Colors.accent : '#666'} />
                </TouchableOpacity>
            </View>

            {/* Bottom Row: Stats OR Error Text (Visible in Peek) */}
            <View style={{ marginTop: 0 }}>
                {error ? (
                    <Text style={[GlobalStyles.metroMD, { fontSize: 24, color: '#ff4444' }]}>{error}</Text>
                ) : (
                    <>
                        <Text style={[GlobalStyles.metroMD, { fontSize: 32, fontWeight: 'bold', lineHeight: 36 }]}>{durationMin} min</Text>
                        <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { fontSize: 16, marginTop: -2 }]}>{distDisplay}</Text>
                    </>
                )}
            </View>
        </View>
    );

    return (
        <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={Header}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                {error ? (
                    <View style={{ paddingVertical: 20 }}>
                        <Text style={[GlobalStyles.metroMD, { color: '#888' }]}>
                            Try selecting a different transport mode or location.
                        </Text>
                    </View>
                ) : (
                    route?.maneuvers.map((step, index) => (
                        <View key={index} style={styles.maneuver}>
                            <Text style={styles.arrow}>{getArrow(step.maneuver?.modifier)}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={GlobalStyles.metroMD}>{step.maneuver?.type === 'transit' ? 'Take Public Transit' : (step.maneuver?.type || 'Go straight')}</Text>
                                <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]}>{step.name || 'on road'}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </BottomSheet>
    );
}

function getArrow(modifier: string) {
    if (modifier?.includes('left')) return '↰';
    if (modifier?.includes('right')) return '↱';
    if (modifier === 'bus') return '🚌';
    if (modifier === 'subway') return '🚇';
    return '↑';
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 15,
        paddingBottom: 5,
        backgroundColor: 'black',
    },
    startButton: {
        width: 100,
        height: 45,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    maneuver: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    arrow: {
        color: 'white',
        fontSize: 40,
        width: 50,
        lineHeight: 40,
    }
});
