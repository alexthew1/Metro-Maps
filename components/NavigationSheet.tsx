import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { MetroButton } from './MetroButton';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavigationSheetProps {
    route: RouteResult | null;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onStartNavigation?: () => void;
    transportMode?: 'driving' | 'walking';
    onModeChange?: (mode: 'driving' | 'walking') => void;
    error?: string | null;
    useMiles?: boolean;
    // New Props for Setup Mode
    step?: 'setup' | 'routing';
    destination?: SearchResult | null;
    startLocation?: SearchResult | null;
    onStartLocationPress?: () => void;
    onDestinationPress?: () => void;
    onCalculateRoute?: () => void;
}

export function NavigationSheet({ route, state, onStateChange, onStartNavigation, transportMode = 'driving', onModeChange, error, useMiles = true, step = 'routing', destination, startLocation, onStartLocationPress, onDestinationPress, onCalculateRoute }: NavigationSheetProps) {
    const insets = useSafeAreaInsets();

    // If hidden, return null
    if (state === 'hidden') return null;

    // In routing mode, we need route or error. In setup mode, we just need visibility.
    if (step === 'routing' && !route && !error) return null;

    const durationMin = route ? Math.round(route.duration / 60) : 0;
    let timeDisplay = `${durationMin} MIN`;
    if (durationMin >= 60) {
        const hrs = Math.floor(durationMin / 60);
        const mins = durationMin % 60;
        timeDisplay = `${hrs} HR ${mins} MIN`;
    }

    // ... distance calculation ...
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

    // ... inside RoutingHeader ... (render_diff will handle finding the block)


    // --- SETUP HEADER (Directions Entry) - Match Windows Phone Reference ---
    if (step === 'setup') {
        const SetupHeader = (
            <View style={styles.header}>
                {/* Transport Modes at top - Right aligned (walking + driving only) */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: horizontalScale(30), marginBottom: verticalScale(20) }}>
                    <TouchableOpacity onPress={() => onModeChange?.('walking')}>
                        <Ionicons name="walk" size={normalizeFont(26)} color={transportMode === 'walking' ? 'white' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange?.('driving')}>
                        <Ionicons name="car" size={normalizeFont(26)} color={transportMode === 'driving' ? 'white' : '#666'} />
                    </TouchableOpacity>
                </View>

                {/* Large Title */}
                <Text style={{ fontFamily: 'OpenSans_300Light', fontSize: normalizeFont(46), color: 'white', marginBottom: verticalScale(25), lineHeight: normalizeFont(50) }}>directions</Text>

                {/* FROM */}
                <TouchableOpacity style={{ marginBottom: verticalScale(25) }} onPress={onStartLocationPress}>
                    <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: normalizeFont(24), color: 'white', marginBottom: verticalScale(2) }}>from</Text>
                    <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: normalizeFont(14), color: Colors.accent }}>
                        {startLocation ? startLocation.display_name.split(',')[0].toLowerCase() : 'select starting point'}
                    </Text>
                </TouchableOpacity>

                {/* TO */}
                <TouchableOpacity style={{ marginBottom: verticalScale(30) }} onPress={onDestinationPress}>
                    <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: normalizeFont(24), color: 'white', marginBottom: verticalScale(2) }}>to</Text>
                    <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: normalizeFont(14), color: Colors.accent }}>
                        {destination ? destination.display_name.split(',')[0].toLowerCase() : 'select destination'}
                    </Text>
                </TouchableOpacity>

                {/* Start Navigation Button */}
                <TouchableOpacity
                    onPress={onCalculateRoute}
                    style={{
                        borderWidth: 2,
                        borderColor: 'white',
                        paddingVertical: verticalScale(12),
                        paddingHorizontal: horizontalScale(20),
                        alignItems: 'center',
                        marginTop: verticalScale(10),
                    }}
                >
                    <Text style={{ fontFamily: 'OpenSans_600SemiBold', fontSize: normalizeFont(16), color: 'white' }}>start navigation</Text>
                </TouchableOpacity>
            </View>
        );

        return (
            <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={SetupHeader} peekHeight={180}>
                {/* Empty Content for now */}
                <View style={[styles.content, { paddingBottom: insets.bottom + 20, minHeight: 100 }]} />
            </BottomSheet>
        );
    }

    // --- ROUTING HEADER (With Route) - Nokia Maps Style ---
    const RoutingHeader = (
        <View style={styles.header}>
            {/* Top Stats Bar: Duration/Distance LEFT, Mode Icons RIGHT */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(5) }}>
                {/* Left: Stats */}
                <View>
                    {error ? (
                        <Text style={[GlobalStyles.metroMD, { fontSize: normalizeFont(24), color: '#ff4444' }]}>NO ROUTE</Text>
                    ) : (
                        <>
                            <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: normalizeFont(26), color: 'white', lineHeight: normalizeFont(30) }}>{timeDisplay}</Text>
                            <Text style={{ fontFamily: 'OpenSans_400Regular', fontSize: normalizeFont(14), color: '#999', marginTop: 0 }}>{distDisplay}</Text>
                        </>
                    )}
                </View>

                {/* Right: Mode Icons */}
                <View style={{ flexDirection: 'row', gap: horizontalScale(20), alignItems: 'center', marginTop: verticalScale(2) }}>
                    <TouchableOpacity onPress={() => onModeChange?.('walking')}>
                        <Ionicons name="walk" size={normalizeFont(26)} color={transportMode === 'walking' ? 'white' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange?.('driving')}>
                        <Ionicons name="car" size={normalizeFont(26)} color={transportMode === 'driving' ? 'white' : '#666'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Large Title: "directions" */}
            <Text style={{ fontFamily: 'OpenSans_300Light', fontSize: normalizeFont(50), color: 'white', lineHeight: normalizeFont(55), marginTop: verticalScale(5), letterSpacing: -1 }}>directions</Text>
        </View>
    );

    return (
        <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={RoutingHeader} peekHeight={verticalScale(170)}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(100) }}>
                {error ? (
                    <View style={{ paddingVertical: verticalScale(20) }}>
                        <Text style={[GlobalStyles.metroMD, { color: '#888' }]}>
                            Try selecting a different transport mode or location.
                        </Text>
                    </View>
                ) : (
                    <>
                        {route?.maneuvers.map((step, index) => (
                            <View key={index} style={styles.maneuver}>
                                <Text style={styles.arrow}>{getArrow(step.maneuver?.modifier)}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={GlobalStyles.metroMD}>{step.maneuver?.type === 'transit' ? 'Take Public Transit' : (step.maneuver?.type || 'Go straight')}</Text>
                                    <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]}>{step.name || 'on road'}</Text>
                                </View>
                            </View>
                        ))}

                        {/* Start Navigation Button */}
                        <MetroButton title="start navigation" variant="outlined" onPress={() => route && onStartNavigation && onStartNavigation()} />
                    </>
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
        paddingHorizontal: horizontalScale(24),
        paddingTop: verticalScale(15),
        paddingBottom: verticalScale(5),
        backgroundColor: 'black',
    },
    startButton: {
        width: horizontalScale(100),
        height: verticalScale(45),
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    content: {
        paddingHorizontal: horizontalScale(24),
        paddingTop: verticalScale(20),
    },
    maneuver: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: verticalScale(30),
    },
    arrow: {
        color: 'white',
        fontSize: normalizeFont(40),
        width: horizontalScale(50),
        lineHeight: normalizeFont(40),
        fontFamily: 'OpenSans_400Regular',
    }
});
