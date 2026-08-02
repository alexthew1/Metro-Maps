import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { RouteResult, api } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MetroButton } from './MetroButton';
import * as Speech from 'expo-speech';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

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
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        if (defaultFont.includes('700Bold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

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

    // -- CONSTANTS --
    const FAB_SIZE = horizontalScale(50);
    const FAB_MARGIN = 25; // Gap between dashboard and button

    const recenterButtonStyle = useAnimatedStyle(() => {
        // The dashboard's visually occupied height from bottom depends on its content
        // BUT here we are simply placing the button above the calculated sheet height + safe area
        return {
            bottom: sheetHeight.value + insets.bottom + FAB_MARGIN,
        };
    });

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

        if (route.coordinates && route.coordinates.length > 5) {
            let minDistSq = Infinity;
            // Sample points to find closest distance to route
            for (let i = 0; i < route.coordinates.length; i += 2) {
                const p = route.coordinates[i];
                const dLat = p.latitude - userLocation.latitude;
                const dLon = p.longitude - userLocation.longitude;
                const dSq = dLat * dLat + dLon * dLon;
                if (dSq < minDistSq) minDistSq = dSq;
            }
            const devMeters = Math.sqrt(minDistSq) * 111320;

            // Removed auto-recalculation because point-to-node distance is inaccurate for sparse polylines
            // and causes endless "Recalculating..." loops.
        }

        if (nextManeuver.maneuver.type === 'arrive') {
            // Arrive within 150m (approx 500ft) - generous threshold because sometimes the route coordinate is in the center of a large building
            if (dist < 150) {
                if (!hasArrivedRef.current) {
                    hasArrivedRef.current = true;
                    Speech.stop();
                    Speech.speak(t("You have arrived at your destination"));
                    
                    // Give the user 5 seconds to hear the message and realize they've arrived 
                    // before abruptly returning to the default map.
                    setTimeout(() => {
                        onStopConfig();
                    }, 5000);
                }
            }
        } else {
            // Advance maneuver if we get close and then distance increases, OR if we are closer to the NEXT turn
            const nextNextManeuver = route.maneuvers[Math.min(displayIndex + 1, route.maneuvers.length - 1)];
            const distToNextNext = nextNextManeuver ? getDistance(userLocation.latitude, userLocation.longitude, nextNextManeuver.maneuver.location[1], nextNextManeuver.maneuver.location[0]) : Infinity;

            if (
                (minDistRef.current < 150 && dist > minDistRef.current + 30) || 
                (distToNextNext < dist && dist < 1000)
            ) {
                if (stepIndex < route.maneuvers.length - 1) {
                    setStepIndex(prev => prev + 1);
                }
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
    const spokenTriggersRef = React.useRef(new Set<string>());
    const lastSpokenManeuverRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        spokenTriggersRef.current.clear();
    }, [stepIndex]);

    // Handle recalculation alert
    const wasRecalculatingRef = React.useRef(isRecalculating);
    React.useEffect(() => {
        if (!wasRecalculatingRef.current && isRecalculating) {
            Speech.stop();
            Speech.speak(t("Recalculating route."), { language: 'en', rate: 0.9 });
        }
        wasRecalculatingRef.current = isRecalculating;
    }, [isRecalculating]);

    React.useEffect(() => {
        if (isRecalculating || !nextManeuver?.name || hasArrivedRef.current) return;

        const distFeet = distanceToNext * 3.28084;
        const distMiles = distFeet / 5280;
        let textToSpeak = nextManeuver.name.replace(/<[^>]*>?/gm, ''); // strip HTML

        // Avoid saying "Continue on X" repeatedly if we are just driving straight for miles.
        const isContinue = textToSpeak.toLowerCase().includes('continue');

        let triggerToFire = '';
        let prefix = '';

        if (!spokenTriggersRef.current.has('initial') && distMiles > 0.1) {
            triggerToFire = 'initial';
            if (isContinue && distMiles > 1) {
                 prefix = `${t('Continue for')} ${Math.round(distMiles)} ${t('miles')}, ${t('then')} `;
            } else if (distMiles >= 2) {
                 prefix = `${t('In')} ${Math.round(distMiles)} ${t('miles')}, `;
            } else if (distMiles >= 0.8) {
                 prefix = `${t('In one mile')}, `;
            } else if (distMiles >= 0.4) {
                 prefix = `${t('In half a mile')}, `;
            } else {
                 prefix = `${t('In')} ${Math.round(distFeet / 100) * 100} ${t('feet')}, `;
            }
        } else if (distMiles <= 1.05 && distMiles > 0.9 && !spokenTriggersRef.current.has('1mi')) {
            triggerToFire = '1mi';
            if (!isContinue) prefix = `${t('In one mile')}, `;
        } else if (distMiles <= 0.55 && distMiles > 0.45 && !spokenTriggersRef.current.has('0.5mi')) {
            triggerToFire = '0.5mi';
            if (!isContinue) prefix = `${t('In half a mile')}, `;
        } else if (distFeet <= 1000 && distFeet > 800 && !spokenTriggersRef.current.has('1000ft')) {
            triggerToFire = '1000ft';
            if (!isContinue) prefix = `${t('In one thousand feet')}, `;
        } else if (distFeet <= 500 && distFeet > 300 && !spokenTriggersRef.current.has('500ft')) {
            triggerToFire = '500ft';
            if (!isContinue) prefix = `${t('In')} 500 ${t('feet')}, `;
        } else if (distFeet <= 150 && !spokenTriggersRef.current.has('now')) {
            triggerToFire = 'now';
            prefix = '';
        }

        if (triggerToFire) {
            spokenTriggersRef.current.add(triggerToFire);

            // Don't repeat the exact same text if it's a "Continue" instruction (unless it's the first time)
            if (isContinue && triggerToFire !== 'initial') return;
            // Also skip if we are about to say an empty prefix and the instruction is just "Continue"
            if (isContinue && !prefix) return;

            const fullSpokenText = prefix + textToSpeak;

            // Optional: prevent identical back-to-back TTS (e.g. initial firing immediately followed by 1000ft)
            if (lastSpokenManeuverRef.current !== fullSpokenText) {
                lastSpokenManeuverRef.current = fullSpokenText;
                Speech.stop();
                Speech.speak(fullSpokenText, {
                    language: 'en',
                    pitch: 1.0,
                    rate: 0.9,
                });
            }
        }
    }, [distanceToNext, stepIndex, isRecalculating, nextManeuver]);

    // -- 3.5 SPEED LIMIT LOOP --
    React.useEffect(() => {
        if (!userLocation) {
            // console.log('Waiting for user location for speed limit...');
            return;
        }

        const now = Date.now();
        // Throttle: fetch every 15 seconds (slightly more frequent for bbox)
        if (now - lastSpeedFetchTime.current > 15000) {
            lastSpeedFetchTime.current = now;

            api.getSpeedLimit(userLocation.latitude, userLocation.longitude)
                .then(async limitKph => {
                    if (limitKph) {
                        setCurrentSpeedLimit(limitKph);
                    } else if (stepIndex === 0 && route.coordinates && route.coordinates.length > 0) {
                        // Fallback logic
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
            ? `${(distanceToNext / 1609.34).toFixed(1)} ${t('mi')}`
            : `${Math.round(distanceToNext * 3.28084)} ${t('ft')}`;
    } else {
        distDisplay = distanceToNext > 1000
            ? `${(distanceToNext / 1000).toFixed(1)} ${t('km')}`
            : `${Math.round(distanceToNext)} ${t('m')}`;
    }

    const durationMin = Math.round(route.duration / 60);
    let timeDisplay = `${durationMin}`;
    if (durationMin >= 60) {
        const hrs = Math.floor(durationMin / 60);
        const mins = durationMin % 60;
        timeDisplay = `${hrs}${t('h')} ${mins}`;
    }

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
            <View style={[styles.topBar, { backgroundColor: '#1a1a3e' }]}>
                <MaterialCommunityIcons
                    name={iconName}
                    size={50}
                    color="white"
                    style={{ transform: [{ rotate: activeRotation }], marginRight: 15 }}
                />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.maneuverText, { fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={2}>
                        {nextManeuver?.name || t('Proceed')}
                    </Text>
                    <Text style={[styles.maneuverDist, { fontFamily: getFont('OpenSans_700Bold') }]}>{distDisplay}</Text>
                </View>
            </View>

            {/* Floating Re-Center Button */}
            {!isFollowing && (
                <Animated.View style={[
                    styles.fabContainer,
                    recenterButtonStyle
                ]}>
                    <TouchableOpacity
                        onPress={onRecenter}
                        activeOpacity={0.8}
                        style={[styles.fabButton, { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: 'rgba(30, 30, 30, 0.85)', borderColor: '#555' }]}
                    >
                        <MaterialCommunityIcons name="crosshairs-gps" size={normalizeFont(28)} color={colors.text} />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Bottom Dashboard (Black) - Nokia Maps Style - Pull up to expand */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.dashboard, sheetAnimatedStyle, { paddingBottom: insets.bottom + 10, overflow: 'hidden', backgroundColor: 'black' }]}>
                    {/* Stats Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

                        {/* Speed + Speed Limit */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ alignItems: 'flex-start' }}>
                                <Text style={[styles.dashValueLarge, { color: isOverLimit ? '#d55' : colors.text, fontFamily: getFont('OpenSans_300Light') }]}>{currentSpeed}</Text>
                                <Text style={[styles.dashLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_300Light') }]}>{useMiles ? t('mph') : t('km/h')}</Text>
                            </View>
                            <View style={styles.speedLimitBox}>
                                <Text style={[styles.speedLimitText, { fontFamily: getFont('OpenSans_700Bold') }]}>{displayLimit || '--'}</Text>
                            </View>
                        </View>

                        {/* Distance */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={[styles.dashValue, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{(route.distance / (useMiles ? 1609.34 : 1000)).toFixed(1)}</Text>
                            <Text style={[styles.dashLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_300Light') }]}>{useMiles ? t('mi') : t('km')}</Text>
                        </View>

                        {/* Time Remaining */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={[styles.dashValue, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{timeDisplay}</Text>
                            <Text style={[styles.dashLabel, { color: colors.textDim, fontFamily: getFont('OpenSans_300Light') }]}>{t('min')}</Text>
                        </View>

                    </View>

                    {/* End Navigation Button - Hidden when shrunk, shows instantly on expansion */}
                    {dashboardExpanded && (
                        <View style={{ width: '100%', marginTop: 15 }}>
                            <MetroButton title={t("end navigation")} variant="outlined" onPress={onStopConfig} />
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
        justifyContent: 'space-between',
        zIndex: 100,
        pointerEvents: 'box-none',
        flexDirection: 'column',
    },
    topBar: {
        paddingVertical: verticalScale(15),
        paddingHorizontal: horizontalScale(20),
        width: '100%',
        elevation: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverText: {
        fontSize: normalizeFont(26),
        color: 'white',
        lineHeight: normalizeFont(30),
    },
    maneuverDist: {
        fontSize: normalizeFont(32),
        color: 'white',
        marginTop: 0,
    },
    dashboard: {
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingHorizontal: horizontalScale(20),
        paddingTop: verticalScale(15),
        paddingBottom: verticalScale(15),
        width: '100%',
        minHeight: verticalScale(100),
    },
    dashSection: {
        alignItems: 'flex-start',
    },
    dashValueLarge: {
        fontSize: normalizeFont(48),
        lineHeight: normalizeFont(54),
    },
    dashValue: {
        fontSize: normalizeFont(28),
    },
    dashLabel: {
        fontSize: normalizeFont(14),
        marginTop: verticalScale(-4),
    },
    speedLimitBox: {
        width: horizontalScale(32), height: horizontalScale(32),
        borderRadius: horizontalScale(16),
        borderWidth: 2,
        borderColor: '#d55',
        backgroundColor: 'white',
        justifyContent: 'center', alignItems: 'center',
    },
    speedLimitText: {
        color: 'black',
        fontSize: normalizeFont(14),
    },
    fabContainer: {
        position: 'absolute',
        right: 0,
        paddingRight: 10,
        zIndex: 200,
    },
    fabButton: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    }
});
