import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { RouteResult, api } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MetroButton } from './MetroButton';
import * as Speech from 'expo-speech';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActiveNavigationProps {
    route: RouteResult | null;
    userLocation: { latitude: number; longitude: number; heading?: number | null; speed?: number | null } | null;
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
    const [dashboardExpanded, setDashboardExpanded] = React.useState(false);
    const [currentSpeedLimit, setCurrentSpeedLimit] = React.useState<number | null>(null);

    // -- ANIMATED SHEET --
    const PEEK_HEIGHT = 100;
    const EXPANDED_HEIGHT = 180;
    const sheetHeight = useSharedValue(PEEK_HEIGHT);
    const context = useSharedValue({ height: PEEK_HEIGHT });

    const toggleExpanded = (expanded: boolean) => {
        setDashboardExpanded(expanded);
    };

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { height: sheetHeight.value };
        })
        .onUpdate((event) => {
            // Dragging up = negative translationY, increases height
            let newHeight = context.value.height - event.translationY;
            newHeight = Math.max(PEEK_HEIGHT, Math.min(EXPANDED_HEIGHT, newHeight));
            sheetHeight.value = newHeight;
            // Show button instantly when user starts expanding
            if (newHeight > PEEK_HEIGHT + 5) {
                runOnJS(toggleExpanded)(true);
            } else {
                runOnJS(toggleExpanded)(false);
            }
        })
        .onEnd((event) => {
            const velocity = event.velocityY;
            if (velocity < -100 || sheetHeight.value > (PEEK_HEIGHT + EXPANDED_HEIGHT) / 2) {
                sheetHeight.value = withTiming(EXPANDED_HEIGHT, { duration: 200 });
                runOnJS(toggleExpanded)(true);
            } else {
                sheetHeight.value = withTiming(PEEK_HEIGHT, { duration: 200 });
                runOnJS(toggleExpanded)(false);
            }
        });

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        height: sheetHeight.value,
    }));

    const recenterButtonStyle = useAnimatedStyle(() => ({
        bottom: sheetHeight.value + 5 + insets.bottom, // 5px above the bottom bar
    }));

    // -- REFS --
    const lastSpokenIndex = React.useRef<number>(-1);
    const lastRecalcTime = React.useRef<number>(0);
    const routeIdRef = React.useRef<string>('');
    const minDistRef = React.useRef<number>(Infinity);
    const lastSpeedFetchTime = React.useRef<number>(0);
    const hasArrivedRef = React.useRef<boolean>(false);

    // -- 1. RESET LOGIC --
    React.useEffect(() => {
        if (route) {
            const newId = route.geometry || Math.random().toString();
            if (newId !== routeIdRef.current) {
                console.log("[Nav] New Route detected. Resetting state.");
                setStepIndex(0);
                setIsRecalculating(false);
                lastSpokenIndex.current = -1;
                routeIdRef.current = newId;
                minDistRef.current = Infinity;
                hasArrivedRef.current = false;
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

    // -- 2. PHYSICS LOOP --
    React.useEffect(() => {
        if (isRecalculating || !nextManeuver) return;

        const dist = getDistance(
            userLocation.latitude, userLocation.longitude,
            nextManeuver.maneuver.location[1], nextManeuver.maneuver.location[0]
        );
        setDistanceToNext(dist);

        if (dist < minDistRef.current) {
            minDistRef.current = dist;
        }

        const now = Date.now();
        const currentSpeedMps = userLocation.speed || 0;
        const isMoving = currentSpeedMps > 2.2; // ~5mph threshold, only recalculate when actually driving

        if (isMoving && now - lastRecalcTime.current > 10000 && route.coordinates && route.coordinates.length > 5) {
            let minDistSq = Infinity;
            for (let i = 0; i < route.coordinates.length; i += 2) {
                const p = route.coordinates[i];
                const dLat = p.latitude - userLocation.latitude;
                const dLon = p.longitude - userLocation.longitude;
                const dSq = dLat * dLat + dLon * dLon;
                if (dSq < minDistSq) minDistSq = dSq;
            }
            const devMeters = Math.sqrt(minDistSq) * 111320;

            if (devMeters > 60) {
                console.log(`[Nav] Off-route (${Math.round(devMeters)}m). Recalculating...`);
                setIsRecalculating(true);
                lastRecalcTime.current = now;
                Speech.stop();
                Speech.speak("Recalculating...");
                onRecalculate();
                return;
            }
        }

        if (nextManeuver.maneuver.type === 'arrive') {
            // Arrive within 80m (approx 260ft) or 30m (100ft) as requested. 
            // Using 80m as the threshold to be safe and responsive.
            if (dist < 80) {
                if (!hasArrivedRef.current) {
                    hasArrivedRef.current = true;
                    Speech.stop();
                    Speech.speak("You have arrived at your destination");
                    onStopConfig();
                }
            }
        } else {
            if (minDistRef.current < 20 && dist > 25 && stepIndex < route.maneuvers.length - 1) {
                setStepIndex(prev => prev + 1);
            }
        }

        const bearing = getBearing(
            userLocation.latitude, userLocation.longitude,
            nextManeuver.maneuver.location[1], nextManeuver.maneuver.location[0]
        );
        const heading = userLocation.heading || mapHeading || 0;
        setArrowRotation(bearing - heading);

    }, [userLocation, route, stepIndex, nextManeuver, isRecalculating]);

    // -- 3. VOICE LOOP --
    React.useEffect(() => {
        if (isRecalculating || !nextManeuver?.name) return;
        if (stepIndex !== lastSpokenIndex.current && !hasArrivedRef.current) {
            const textToSpeak = nextManeuver.name;
            Speech.stop();
            Speech.speak(textToSpeak, {
                language: 'en',
                pitch: 1.0,
                rate: 0.9,
            });
            lastSpokenIndex.current = stepIndex;
        }
    }, [stepIndex, isRecalculating, nextManeuver]);

    // -- 3.5 SPEED LIMIT LOOP --
    React.useEffect(() => {
        if (!userLocation) return;

        const now = Date.now();
        // Throttle: fetch every 20 seconds to save API quota
        if (now - lastSpeedFetchTime.current > 20000) {
            lastSpeedFetchTime.current = now;

            api.getSpeedLimit(userLocation.latitude, userLocation.longitude)
                .then(async limitKph => {
                    if (limitKph) {
                        setCurrentSpeedLimit(limitKph);
                    } else if (stepIndex === 0 && route.coordinates && route.coordinates.length > 0) {
                        // Fallback: If at start and no limit found (e.g. in driveway), 
                        // check the route's starting point (the street).
                        console.log('Fetching fallback speed limit for route start...');
                        const startPoint = route.coordinates[0];
                        const fallbackLimit = await api.getSpeedLimit(startPoint.latitude, startPoint.longitude);
                        setCurrentSpeedLimit(fallbackLimit);
                    } else {
                        setCurrentSpeedLimit(null);
                    }
                })
                .catch(err => console.log('Speed Limit Err', err));
        }
    }, [userLocation]);

    // -- 4. CLEANUP --
    React.useEffect(() => {
        return () => {
            // Only stop speech if we haven't just arrived. 
            // If we arrived, we want the "You have arrived" message to finish playing.
            if (!hasArrivedRef.current) {
                Speech.stop();
            }
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

    const durationMin = Math.round(route.duration / 60); // This is total duration, ideally should be remaining duration
    // Approximate remaining duration based on % distance?
    // Precise way: we'd need to sum up remaining steps.
    // Hacky way: (distanceToNext + remainingStepsDistance) / avgSpeed
    // Simple way: (Total Route Dist - (Total Route Dist - Remaining))
    // Let's just use original duration - (elapsed)? No.
    // Let's just show total duration for now as a "Time to go" placeholder or implement logic later.
    // Better: route.duration is static. We need dynamic.
    // Let's assume average speed 30mph (~13m/s).
    // Remaining dist = route.distance - (distance traveled). Hard to track distance traveled accurately without path projection.
    // Let's just use (Total Distance / Estimated Speed) on every frame? No.
    // Let's statically fall back to original ETA... or simplistic (totalDist / 13.4) seconds.
    // Actually, let's just stick to the static route.duration for now, or maybe decrement it?
    // We'll leave it as is.

    // Speed
    const currentSpeedMps = userLocation.speed || 0;
    const currentSpeed = useMiles
        ? Math.round(currentSpeedMps * 2.23694) // m/s to mph
        : Math.round(currentSpeedMps * 3.6);    // m/s to km/h

    // Speed Limit (Mock)
    // Speed Limit
    // Convert KPH limit to MPH if needed
    const displayLimit = currentSpeedLimit
        ? (useMiles ? Math.round(currentSpeedLimit / 1.60934) : currentSpeedLimit)
        : null;

    const isOverLimit = displayLimit && currentSpeed > displayLimit + 5; // 5 unit buffer

    const iconName = getManeuverIcon(nextManeuver?.maneuver?.icon);
    const activeRotation = '0deg'; // Disable rotation for default arrow as requested

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

            {/* Top Maneuver Bar (Blue) - Nokia Maps Style */}
            <View style={styles.topBar}>
                <MaterialCommunityIcons
                    name={iconName}
                    size={50}
                    color="white"
                    style={{ transform: [{ rotate: activeRotation }], marginRight: 15 }}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.maneuverText} numberOfLines={1}>{nextManeuver?.name || 'Proceed'}</Text>
                    <Text style={styles.maneuverDist}>{distDisplay}</Text>
                </View>
            </View>

            {/* Floating Re-Center Button */}
            {!isFollowing && (
                <Animated.View style={[{ position: 'absolute', right: 10, zIndex: 200 }, recenterButtonStyle]}>
                    <TouchableOpacity
                        onPress={onRecenter}
                        activeOpacity={0.8}
                        style={styles.floatingBtn}
                    >
                        <MaterialCommunityIcons name="crosshairs-gps" size={28} color="white" />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Bottom Dashboard (Black) - Nokia Maps Style - Pull up to expand */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.dashboard, sheetAnimatedStyle, { paddingBottom: insets.bottom + 10, overflow: 'hidden' }]}>
                    {/* Stats Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

                        {/* Speed + Speed Limit */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ alignItems: 'flex-start' }}>
                                <Text style={[styles.dashValueLarge, { color: isOverLimit ? '#d55' : 'white' }]}>{currentSpeed}</Text>
                                <Text style={styles.dashLabel}>{useMiles ? 'mph' : 'km/h'}</Text>
                            </View>
                            <View style={styles.speedLimitBox}>
                                <Text style={styles.speedLimitText}>{displayLimit || '--'}</Text>
                            </View>
                        </View>

                        {/* Distance */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={styles.dashValue}>{(route.distance / (useMiles ? 1609.34 : 1000)).toFixed(1)}</Text>
                            <Text style={styles.dashLabel}>{useMiles ? 'mi' : 'km'}</Text>
                        </View>

                        {/* Time Remaining */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={styles.dashValue}>{durationMin}</Text>
                            <Text style={styles.dashLabel}>min</Text>
                        </View>

                    </View>

                    {/* End Navigation Button - Hidden when shrunk, shows instantly on expansion */}
                    {dashboardExpanded && (
                        <View style={{ width: '100%', marginTop: 15 }}>
                            <MetroButton title="end navigation" variant="outlined" onPress={onStopConfig} />
                        </View>
                    )}

                </Animated.View>
            </GestureDetector>
        </View >
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

// ... icon helper unchanged ...
function getManeuverIcon(maneuver?: string): keyof typeof MaterialCommunityIcons.glyphMap {
    if (!maneuver) return 'arrow-up';
    const m = maneuver.toLowerCase();

    // Windows Phone style icons are usually simple.
    // Mapping existing Google keys to MCI
    if (m.includes('straight')) return 'arrow-up';
    if (m.includes('uturn')) return 'arrow-u-left-bottom';
    if (m.includes('hard-left') || m.includes('sharp-left')) return 'arrow-bottom-left';
    if (m.includes('hard-right') || m.includes('sharp-right')) return 'arrow-bottom-right';
    if (m.includes('slight-left')) return 'arrow-top-left';
    if (m.includes('slight-right')) return 'arrow-top-right';
    if (m.includes('left')) return 'arrow-left-top';
    if (m.includes('right')) return 'arrow-right-top';
    if (m.includes('merge')) return 'call-merge';
    if (m.includes('ramp')) return 'arrow-split-vertical';
    if (m.includes('roundabout')) return 'rotate-left';
    if (m.includes('fork')) return 'call-split';

    return 'arrow-up';
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'space-between', // Top bar at top, dashboard at bottom
        zIndex: 100,
        pointerEvents: 'box-none',
        flexDirection: 'column',
    },
    topBar: {
        backgroundColor: '#1a1a3e', // Dark Navy Blue (Nokia Maps)
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: '100%',
        elevation: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverText: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 26,
        color: 'white',
        lineHeight: 30,
    },
    maneuverDist: {
        fontFamily: 'OpenSans_700Bold',
        fontSize: 32,
        color: 'white',
        marginTop: 0,
    },
    dashboard: {
        backgroundColor: 'black',
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        width: '100%',
        minHeight: 100,
    },
    dashSection: {
        alignItems: 'flex-start',
    },
    dashValueLarge: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 48,
        color: 'white',
        lineHeight: 54,
    },
    dashValue: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 28, // Slightly smaller to fit stacked if needed, or keep 32
        color: 'white',
    },
    dashLabel: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 14,
        color: '#aaa',
        marginTop: -4,
    },
    speedLimitBox: {
        width: 32, height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#d55',
        backgroundColor: 'white',
        justifyContent: 'center', alignItems: 'center',
    },
    speedLimitText: {
        color: 'black',
        fontSize: 14,
        fontFamily: 'OpenSans_700Bold', // Bold for visibility
    },
    floatingBtn: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(34, 34, 34, 0.6)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#444',
    }
});
