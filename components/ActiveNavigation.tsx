import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { RouteResult } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

interface ActiveNavigationProps {
    route: RouteResult | null;
    userLocation: { latitude: number; longitude: number; heading?: number | null } | null;
    onStopConfig: () => void;
    isFollowing: boolean;
    onRecenter: () => void;
    mapHeading?: number;
    useMiles?: boolean;
}

export function ActiveNavigation({ route, userLocation, onStopConfig, isFollowing, onRecenter, mapHeading = 0, useMiles = true }: ActiveNavigationProps) {
    const insets = useSafeAreaInsets();
    const [stepIndex, setStepIndex] = React.useState(0);
    const [distanceToNext, setDistanceToNext] = React.useState(0);
    const [arrowRotation, setArrowRotation] = React.useState(0);

    if (!route) return null;

    // Determine current maneuver
    const displayIndex = Math.min(stepIndex + 1, route.maneuvers.length - 1);
    const nextManeuver = route.maneuvers[displayIndex];

    // Total Duration (static for now, could decrease)
    const durationMin = Math.round(route.duration / 60);



    // Speech State
    const lastSpokenStep = React.useRef(-1);
    const spokenThresholds = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        if (!userLocation || !nextManeuver) return;

        // 1. Calculate Distance & Progress
        const dist = getDistance(
            userLocation.latitude, userLocation.longitude,
            nextManeuver.maneuver.location[1], nextManeuver.maneuver.location[0]
        );
        setDistanceToNext(dist);

        // --- Voice Guidance Logic ---
        if (stepIndex !== lastSpokenStep.current) {
            lastSpokenStep.current = stepIndex;
            spokenThresholds.current.clear();

            // Speak immediate instruction if starting fresh/short segment
            const initialDist = useMiles ? dist * 3.28084 : dist;
            if (initialDist > 300) { // Only speak start if substantial distance
                // basic "Head towards..." could be here, but we skip for now to avoid spam
            }
        }

        // define thresholds
        const thresholds = useMiles
            ? [{ val: 5280, label: '1 mile' }, { val: 2640, label: 'half a mile' }, { val: 1000, label: '1000 feet' }, { val: 500, label: '500 feet' }, { val: 100, label: '100 feet' }]
            : [{ val: 2000, label: '2 kilometers' }, { val: 1000, label: '1 kilometer' }, { val: 500, label: '500 meters' }, { val: 200, label: '200 meters' }, { val: 50, label: '50 meters' }];

        const currentDistUnit = useMiles ? dist * 3.28084 : dist; // ft or meters

        for (const t of thresholds) {
            // Trigger if we just crossed UNDER the threshold (and haven't spoken it yet)
            // We use a buffer of 10% to ensure we don't miss it if GPS jumps slightly
            if (currentDistUnit <= t.val && currentDistUnit > (t.val * 0.5) && !spokenThresholds.current.has(t.label)) {
                spokenThresholds.current.add(t.label);

                // Construct Speech
                const maneuverName = nextManeuver.name || nextManeuver.maneuver?.type || 'turn';
                const speechText = `In ${t.label}, ${maneuverName}`;
                // console.log("Speaking:", speechText);
                Speech.speak(speechText, { language: 'en-US', rate: 1.0 });
                break; // Only speak one threshold at a time
            }
        }

        // Final "Now" instruction (< 30m / 100ft)
        if (currentDistUnit < (useMiles ? 100 : 30) && !spokenThresholds.current.has('NOW')) {
            spokenThresholds.current.add('NOW');
            const maneuverName = nextManeuver.name || 'turn';
            Speech.speak(maneuverName, { language: 'en-US' });
        }
        // ----------------------------

        // Advanced to next step if close (e.g., 20 meters)
        if (dist < 20 && stepIndex < route.maneuvers.length - 1) {
            setStepIndex(prev => prev + 1);
        }

        // 2. Calculate Absolute Bearing (Compass Direction)
        const bearing = getBearing(
            userLocation.latitude * Math.PI / 180,
            userLocation.longitude * Math.PI / 180,
            nextManeuver.maneuver.location[1] * Math.PI / 180,
            nextManeuver.maneuver.location[0] * Math.PI / 180
        );

        // 3. Quantize to nearest 90 degrees (Metro Style: 0, 90, 180, 270)
        // Adjust for Map Heading so arrow is "Locked to View" (Screen Up)
        const absoluteBearing = Math.round(bearing / 90) * 90;
        const relativeBearing = absoluteBearing - mapHeading;
        setArrowRotation(relativeBearing);

    }, [userLocation, stepIndex, nextManeuver, mapHeading, useMiles]);

    // Format distance
    let distDisplay = '';
    if (useMiles) {
        distDisplay = distanceToNext > 160.934 // 0.1 miles
            ? `${(distanceToNext / 1609.34).toFixed(1)} mi`
            : `${Math.round(distanceToNext * 3.28084)} ft`;
    } else {
        distDisplay = distanceToNext > 1000
            ? `${(distanceToNext / 1000).toFixed(1)} km`
            : `${Math.round(distanceToNext)} m`;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top Bar: Next Maneuver */}
            <View style={styles.topBar}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 15 }}>
                    {/* Direction Icon (Big, Accent) - Rotated Quantized Arrow */}
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons
                            name="arrow-up"
                            size={50}
                            color={Colors.accent}
                            style={{ transform: [{ rotate: `${arrowRotation}deg` }] }}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[GlobalStyles.metroMD, { color: 'white', fontFamily: 'OpenSans_700Bold', fontSize: 24, letterSpacing: 0.5 }]}>
                            {nextManeuver?.maneuver?.type?.toUpperCase() || 'ARRIVE'}
                        </Text>
                        <Text style={[GlobalStyles.metroXL, { color: 'white', fontSize: 32, marginTop: -4 }]} numberOfLines={2}>
                            {nextManeuver?.name || 'Destination'}
                        </Text>
                        <Text style={[GlobalStyles.metroSM, { color: Colors.accent, marginTop: 4, fontFamily: 'OpenSans_700Bold' }]}>
                            {distDisplay}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Re-Center Button (Visible when NOT following) */}
            {!isFollowing && (
                <View style={{ position: 'absolute', bottom: 220, right: 20, zIndex: 200 }}>
                    <TouchableOpacity
                        onPress={onRecenter}
                        activeOpacity={0.8}
                        style={{
                            width: 60, height: 60, borderRadius: 30,
                            backgroundColor: 'black',
                            justifyContent: 'center', alignItems: 'center',
                            // No Border
                            // No Shadow/Elevation for Flat Metro Look
                        }}
                    >
                        <MaterialCommunityIcons name="crosshairs-gps" size={32} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Bar: Stats & Stop - Extended to bottom edge */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
                <View>
                    <Text style={[GlobalStyles.metroLG, { color: 'white', fontSize: 48, lineHeight: 54 }]}>{durationMin}<Text style={{ fontSize: 20, color: '#999', fontFamily: 'OpenSans_400Regular' }}> min</Text></Text>
                    <Text style={[GlobalStyles.metroSM, { color: '#999', fontSize: 16 }]}>
                        {useMiles
                            ? `${(route.distance / 1609.34).toFixed(1)} mi`
                            : `${(route.distance / 1000).toFixed(1)} km`
                        } • ETA
                    </Text>
                </View>

                {/* Rectangular Stop Button (Text Only) */}
                <TouchableOpacity onPress={onStopConfig} style={styles.stopButton}>
                    <Text style={[GlobalStyles.metroSM, { color: 'white', fontFamily: 'OpenSans_700Bold', fontSize: 16 }]}>END</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Haversine Distance (Meters)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Bearing Calculation (Degrees)
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360; // 0-360
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        zIndex: 100, // Topmost
        pointerEvents: 'box-none', // Allow touches to pass through to map in middle
    },
    topBar: {
        backgroundColor: 'black', // Pure Black
        padding: 24,
        margin: 10,
        opacity: 0.95,
        // No rounding in strict Metro, potentially? Or maybe minimal.
        borderLeftWidth: 6,
        borderLeftColor: Colors.accent,
    },
    iconBox: {
        // width: 60,
        // height: 60,
        // justifyContent: 'center', 
        // alignItems: 'center'
    },
    bottomBar: {
        backgroundColor: 'black', // Pure Black
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: 0.95,
    },
    stopButton: {
        width: 100,
        height: 45,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    }
});
