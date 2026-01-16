import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage } from 'react-native';
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
    onRecalculate: () => void;
}

export function ActiveNavigation({ route, userLocation, onStopConfig, isFollowing, onRecenter, mapHeading = 0, useMiles = true, onRecalculate }: ActiveNavigationProps) {
    const insets = useSafeAreaInsets();

    // -- STATE --
    const [stepIndex, setStepIndex] = React.useState(0);
    const [distanceToNext, setDistanceToNext] = React.useState(0);
    const [arrowRotation, setArrowRotation] = React.useState(0);
    const [isRecalculating, setIsRecalculating] = React.useState(false);

    // -- REFS (Mutable state that doesn't trigger renders) --
    const lastSpokenIndex = React.useRef<number>(-1); // Track which step we last spoke
    const lastRecalcTime = React.useRef<number>(0);
    const routeIdRef = React.useRef<string>(''); // Detect route object changes
    const minDistRef = React.useRef<number>(Infinity); // Hysteresis for turn completion

    // -- 1. RESET LOGIC (When a new route arrives) --
    React.useEffect(() => {
        // Simple hash or check to see if it's a new route instance
        // We assume if 'route' object reference changes, it's a new calc
        if (route) {
            // Generate a primitive ID based on geometry to detect actual changes
            // (Or just trust the ref change if your parent creates new objects)
            const newId = route.geometry || Math.random().toString();

            if (newId !== routeIdRef.current) {
                console.log("[Nav] New Route detected. Resetting state.");
                setStepIndex(0);
                setIsRecalculating(false);
                lastSpokenIndex.current = -1; // Reset voice trigger
                routeIdRef.current = newId;
                minDistRef.current = Infinity;
            }
        }
    }, [route]);

    // Reset MinDist when step changes
    React.useEffect(() => {
        minDistRef.current = Infinity;
    }, [stepIndex]);

    // Derived State
    const displayIndex = route ? Math.min(stepIndex + 1, route.maneuvers.length - 1) : 0;
    const nextManeuver = route?.maneuvers[displayIndex];
    if (!route || !userLocation) return null;

    // -- 2. PHYSICS LOOP (Distance, Bearing, Deviation) --
    React.useEffect(() => {
        if (isRecalculating || !nextManeuver) return;

        // A. Distance to Next Maneuver
        const dist = getDistance(
            userLocation.latitude, userLocation.longitude,
            nextManeuver.maneuver.location[1], nextManeuver.maneuver.location[0]
        );
        setDistanceToNext(dist);

        // Update closest approach for this step
        if (dist < minDistRef.current) {
            minDistRef.current = dist;
        }

        // B. Deviation Check (Throttled: check every render is fine if math is cheap, but gate action)
        const now = Date.now();
        if (now - lastRecalcTime.current > 10000 && route.coordinates && route.coordinates.length > 5) {
            // "Closest Point on Polyline" Check
            let minDistSq = Infinity;
            // Scan route points
            for (let i = 0; i < route.coordinates.length; i += 2) { // Opt: Check every 2nd point for speed
                const p = route.coordinates[i];
                const dLat = p.latitude - userLocation.latitude;
                const dLon = p.longitude - userLocation.longitude;
                const dSq = dLat * dLat + dLon * dLon;
                if (dSq < minDistSq) minDistSq = dSq;
            }

            // Approx root conversion
            // 1 degree ~ 111,000m. 
            const devMeters = Math.sqrt(minDistSq) * 111320;

            if (devMeters > 60) {
                console.log(`[Nav] Off-route (${Math.round(devMeters)}m). Recalculating...`);
                setIsRecalculating(true);
                lastRecalcTime.current = now;
                Speech.stop();
                Speech.speak("Recalculating...");
                onRecalculate();
                return; // Stop logic for this tick
            }
        }

        // C. Advance Step Logic (Hysteresis)
        // Check if we are "Arriving" (Last step) -> Trigger immediately on proximity
        if (nextManeuver.maneuver.type === 'arrive') {
            if (dist < 30) {
                console.log(`[Nav] Arrived at Destination. Advancing/Finishing.`);
                setStepIndex(prev => prev + 1);
            }
        } else {
            // Standard Turn: Trigger ONLY after we visited close (<20m) AND are now moving away (>25m)
            // This ensures we are "after" the turn.
            // Failsafe: If we get VERY close (<10m), maybe just trigger? No, moving away is safer for "after".
            // We use a relatively large "exit" threshold (25m) to ensure the turn is done.
            if (minDistRef.current < 20 && dist > 25 && stepIndex < route.maneuvers.length - 1) {
                console.log(`[Nav] Passed step ${stepIndex} (Min: ${Math.round(minDistRef.current)}m, Now: ${Math.round(dist)}m). Advancing.`);
                setStepIndex(prev => prev + 1);
            }
        }

        // D. Arrow Rotation
        const bearing = getBearing(
            userLocation.latitude, userLocation.longitude,
            nextManeuver.maneuver.location[1], nextManeuver.maneuver.location[0]
        );
        const heading = userLocation.heading || mapHeading || 0;
        setArrowRotation(bearing - heading);

    }, [userLocation, route, stepIndex, nextManeuver, isRecalculating]); // Physics depends on location updates

    // -- 3. VOICE LOOP (Strictly Event-Based) --
    React.useEffect(() => {
        if (isRecalculating || !nextManeuver?.name) return;

        // Speak ONLY if we are at a new step index that we haven't spoken yet
        // OR if it's the very first render and we haven't spoken step 0
        if (stepIndex !== lastSpokenIndex.current) {
            const textToSpeak = nextManeuver.name;
            console.log(`[Nav] Speaking: "${textToSpeak}" (Step ${stepIndex})`);

            Speech.stop(); // Interrubt anything previous
            Speech.speak(textToSpeak, {
                language: 'en',
                pitch: 1.0,
                rate: 0.9,
            });

            // Mark this index as spoken
            lastSpokenIndex.current = stepIndex;
        }
    }, [stepIndex, isRecalculating, nextManeuver]); // Trigger primarily on stepIndex change

    // -- 4. CLEANUP --
    React.useEffect(() => {
        return () => {
            Speech.stop();
        };
    }, []);

    // -- RENDER HELPERS --
    let distDisplay = '';
    if (useMiles) {
        distDisplay = distanceToNext > 160.934
            ? `${(distanceToNext / 1609.34).toFixed(1)} mi`
            : `${Math.round(distanceToNext * 3.28084)} ft`;
    } else {
        distDisplay = distanceToNext > 1000
            ? `${(distanceToNext / 1000).toFixed(1)} km`
            : `${Math.round(distanceToNext)} m`;
    }

    const durationMin = Math.round(route.duration / 60);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top Bar: Next Maneuver */}
            <View style={styles.topBar}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 15 }}>
                    {/* Direction Icon (Metro Vector Style) */}
                    <View style={styles.iconBox}>
                        {(() => {
                            const iconName = getManeuverIcon(nextManeuver?.maneuver?.icon);
                            const isGeneric = iconName === 'arrow-up';
                            // If generic (straight/unknown), use dynamic bearing rotation.
                            // If specific (turn-left), use static 0 rotation (or tuned if needed).
                            const activeRotation = isGeneric ? `${arrowRotation}deg` : getManeuverRotation(nextManeuver?.maneuver?.icon);

                            return (
                                <MaterialCommunityIcons
                                    name={iconName}
                                    size={50}
                                    color={Colors.accent}
                                    style={{ transform: [{ rotate: activeRotation }] }}
                                />
                            );
                        })()}
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

            {/* Re-Center Button */}
            {!isFollowing && (
                <View style={{ position: 'absolute', bottom: 220, right: 20, zIndex: 200 }}>
                    <TouchableOpacity
                        onPress={onRecenter}
                        activeOpacity={0.8}
                        style={{
                            width: 60, height: 60, borderRadius: 30,
                            backgroundColor: 'black',
                            justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <MaterialCommunityIcons name="crosshairs-gps" size={32} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Bar: Stats & Stop */}
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

                <TouchableOpacity onPress={onStopConfig} style={styles.stopButton}>
                    <Text style={[GlobalStyles.metroSM, { color: 'white', fontFamily: 'OpenSans_700Bold', fontSize: 16 }]}>END</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// -- MATH HELPERS --
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
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

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y2 = Math.sin(Δλ) * Math.cos(φ2);
    const x2 = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y2, x2);
    return (θ * 180 / Math.PI + 360) % 360;
}

// Map Google Maneuver string to MaterialCommunityIcons name
function getManeuverIcon(maneuver?: string): keyof typeof MaterialCommunityIcons.glyphMap {
    if (!maneuver) return 'arrow-up';
    const m = maneuver.toLowerCase();

    if (m.includes('straight')) return 'arrow-up';
    if (m.includes('uturn')) return 'arrow-u-left-bottom'; // or arrow-u-down-left
    if (m.includes('hard-left') || m.includes('sharp-left')) return 'arrow-bottom-left'; // Sharp turn
    if (m.includes('hard-right') || m.includes('sharp-right')) return 'arrow-bottom-right';
    if (m.includes('slight-left')) return 'arrow-top-left';
    if (m.includes('slight-right')) return 'arrow-top-right';
    if (m.includes('left')) return 'arrow-left-top'; // Standard turn
    if (m.includes('right')) return 'arrow-right-top';
    if (m.includes('merge')) return 'call-merge';
    if (m.includes('ramp')) return 'arrow-split-vertical';
    if (m.includes('roundabout')) return 'rotate-left';
    if (m.includes('fork')) return 'call-split';
    if (m.includes('ferry')) return 'ferry';
    if (m.includes('walk')) return 'walk';

    return 'arrow-up';
}

function getManeuverRotation(maneuver?: string): string {
    // Some icons might need slight adjustment to look "Metro" (e.g. U-turn might be upside down)
    // MCI arrow-left-top points to North-West.
    // If we want it to look like a "Turn Left" (Forward then Left), arrow-left-top is decent.
    return '0deg';
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'space-between',
        zIndex: 100,
        pointerEvents: 'box-none',
    },
    topBar: {
        backgroundColor: 'black',
        padding: 24,
        margin: 10,
        opacity: 0.95,
        borderLeftWidth: 6,
        borderLeftColor: Colors.accent,
    },
    iconBox: {},
    bottomBar: {
        backgroundColor: 'black',
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: 0.95,
    },
    stopButton: {
        width: 100, height: 45,
        backgroundColor: 'black',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: 'white',
    }
});
