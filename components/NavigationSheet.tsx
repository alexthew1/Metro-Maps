import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { MetroButton } from './MetroButton';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

interface NavigationSheetProps {
    routes?: RouteResult[];
    selectedRouteIndex?: number;
    onSelectRoute?: (index: number) => void;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onStartNavigation?: () => void;
    transportMode?: 'driving' | 'walking' | 'transit';
    onModeChange?: (mode: 'driving' | 'walking' | 'transit') => void;
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

export function NavigationSheet({ routes = [], selectedRouteIndex = 0, onSelectRoute, state, onStateChange, onStartNavigation, transportMode = 'driving', onModeChange, error, useMiles = true, step = 'routing', destination, startLocation, onStartLocationPress, onDestinationPress, onCalculateRoute }: NavigationSheetProps) {
    const route = routes[selectedRouteIndex] || null;
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

    // If hidden, return null
    if (state === 'hidden') return null;

    // In routing mode, we need route or error. In setup mode, we just need visibility.
    if (step === 'routing' && !route && !error) {
        return (
            <BottomSheet visible state={state} onStateChange={onStateChange} peekHeight={verticalScale(240)}
                header={<View style={{ padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <ActivityIndicator color={colors.accent} size="large" />
                    <Text style={{ color: colors.text, fontSize: normalizeFont(22), fontFamily: getFont('OpenSans_300Light') }}>{t('Calculating route…')}</Text>
                </View>}>
                <View />
            </BottomSheet>
        );
    }

    const durationMin = route ? Math.round(route.duration / 60) : 0;
    let timeDisplay = `${durationMin}  ${t('MIN')}`;
    if (durationMin >= 60) {
        const hrs = Math.floor(durationMin / 60);
        const mins = durationMin % 60;
        timeDisplay = `${hrs} ${t('HR')} ${mins}  ${t('MIN')}`;
    }

    let distDisplay = '0.0';
    if (route) {
        if (useMiles) {
            const miles = route.distance / 1609.34;
            distDisplay = `${miles.toFixed(1)} ${t('mi')}`;
        } else {
            const km = route.distance / 1000;
            distDisplay = `${km.toFixed(1)} ${t('km')}`;
        }
    }

    // --- SETUP HEADER (Directions Entry) - Match Windows Phone Reference ---
    if (step === 'setup') {
        const SetupHeader = (
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                {/* Transport Modes at top - Right aligned (walking, driving, transit) */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: horizontalScale(24), marginBottom: verticalScale(20) }}>
                    <TouchableOpacity onPress={() => onModeChange?.('walking')}>
                        <Ionicons name="walk" size={normalizeFont(26)} color={transportMode === 'walking' ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange?.('driving')}>
                        <Ionicons name="car" size={normalizeFont(26)} color={transportMode === 'driving' ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange?.('transit')}>
                        <Ionicons name="subway" size={normalizeFont(24)} color={transportMode === 'transit' ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                </View>

                {/* Large Title */}
                <Text style={{ fontFamily: getFont('OpenSans_300Light'), fontSize: normalizeFont(46), color: colors.text, marginBottom: verticalScale(25), lineHeight: normalizeFont(50) }}>{t('directions')}</Text>

                {/* FROM */}
                <TouchableOpacity style={{ marginBottom: verticalScale(25) }} onPress={onStartLocationPress}>
                    <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(24), color: colors.text, marginBottom: verticalScale(2) }}>{t('from')}</Text>
                    <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(14), color: colors.accent }}>
                        {startLocation ? startLocation.display_name.split(',')[0].toLowerCase() : t('select starting point')}
                    </Text>
                </TouchableOpacity>

                {/* TO */}
                <TouchableOpacity style={{ marginBottom: verticalScale(30) }} onPress={onDestinationPress}>
                    <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(24), color: colors.text, marginBottom: verticalScale(2) }}>{t('to')}</Text>
                    <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(14), color: colors.accent }}>
                        {destination ? destination.display_name.split(',')[0].toLowerCase() : t('select destination')}
                    </Text>
                </TouchableOpacity>

                {/* Start Navigation Button */}
                <TouchableOpacity
                    onPress={onCalculateRoute}
                    style={{
                        borderWidth: 2,
                        borderColor: colors.text,
                        paddingVertical: verticalScale(12),
                        paddingHorizontal: horizontalScale(20),
                        alignItems: 'center',
                        marginTop: verticalScale(10),
                    }}
                >
                    <Text style={{ fontFamily: getFont('OpenSans_600SemiBold'), fontSize: normalizeFont(16), color: colors.text }}>{t('start navigation')}</Text>
                </TouchableOpacity>
            </View>
        );

        return (
            <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={SetupHeader} peekHeight={180}>
                <View style={[styles.content, { paddingBottom: insets.bottom + 20, minHeight: 100 }]} />
            </BottomSheet>
        );
    }

    // --- ROUTING HEADER (With Route) - Nokia Maps Style ---
    const RoutingHeader = (
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            {/* Top Stats Bar: Duration/Distance LEFT, Mode Icons RIGHT */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(5) }}>
                {/* Left: Stats */}
                <View>
                    {error ? (
                        <Text style={[GlobalStyles.metroMD, { fontSize: normalizeFont(24), color: '#ff4444', fontFamily: getFont('OpenSans_400Regular') }]}>{t('NO ROUTE')}</Text>
                    ) : (
                        <>
                            <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(26), color: colors.text, lineHeight: normalizeFont(30) }}>{timeDisplay}</Text>
                            <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(14), color: colors.textDim, marginTop: 0 }}>{distDisplay}</Text>
                        </>
                    )}
                </View>

                {/* Right: Mode Icons */}
                <View style={{ flexDirection: 'row', gap: horizontalScale(20), alignItems: 'center', marginTop: verticalScale(2) }}>
                    <TouchableOpacity onPress={() => onModeChange?.('walking')}>
                        <Ionicons name="walk" size={normalizeFont(26)} color={transportMode === 'walking' ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange?.('driving')}>
                        <Ionicons name="car" size={normalizeFont(26)} color={transportMode === 'driving' ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange?.('transit')}>
                        <Ionicons name="subway" size={normalizeFont(24)} color={transportMode === 'transit' ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Large Title: "directions" */}
            <Text style={{ fontFamily: getFont('OpenSans_300Light'), fontSize: normalizeFont(50), color: colors.text, lineHeight: normalizeFont(55), marginTop: verticalScale(5), letterSpacing: -1 }}>{t('directions')}</Text>
            
            {/* Alternative Routes Picker */}
            {routes && routes.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: horizontalScale(10), marginTop: verticalScale(15), paddingBottom: verticalScale(10) }}>
                    {routes.map((r, idx) => {
                        const mins = Math.round(r.duration / 60);
                        const hrs = Math.floor(mins / 60);
                        const rMins = mins % 60;
                        const routeTime = hrs > 0 ? `${hrs}h ${rMins}m` : `${mins}m`;

                        let routeDist = '0.0';
                        if (useMiles) {
                            const miles = r.distance / 1609.34;
                            routeDist = `${miles.toFixed(1)} ${t('mi')}`;
                        } else {
                            const km = r.distance / 1000;
                            routeDist = `${km.toFixed(1)} ${t('km')}`;
                        }

                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => onSelectRoute?.(idx)}
                                style={{
                                    paddingVertical: verticalScale(10),
                                    paddingHorizontal: horizontalScale(16),
                                    borderWidth: 2,
                                    borderColor: idx === selectedRouteIndex ? colors.text : colors.border,
                                    backgroundColor: idx === selectedRouteIndex ? colors.accent : colors.background,
                                    minWidth: horizontalScale(120),
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {r.transitLines && r.transitLines.length > 0 && (
                                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {r.transitLines.map((tl, i) => (
                                            <View key={i} style={{ backgroundColor: tl.color || '#0085d0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                                                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{tl.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <Text style={{ fontFamily: getFont('OpenSans_600SemiBold'), fontSize: normalizeFont(14), color: idx === selectedRouteIndex ? Colors.white : colors.text, marginBottom: verticalScale(2) }}>
                                    {t('route')} {idx + 1}
                                </Text>
                                <Text style={{ fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(12), color: idx === selectedRouteIndex ? 'rgba(255,255,255,0.9)' : colors.textDim }}>
                                    {routeTime} • {routeDist}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );

    return (
        <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={RoutingHeader} peekHeight={verticalScale(240)}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(100) }}>
                {error ? (
                    <View style={{ paddingVertical: verticalScale(20) }}>
                        <Text style={[GlobalStyles.metroMD, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>
                            {t('Try selecting a different transport mode or location.')}
                        </Text>
                    </View>
                ) : (
                    <>
                        {route?.maneuvers.map((step, index) => {
                            if (step.transitDetails) {
                                return (
                                    <View key={index} style={styles.transitStepContainer}>
                                        <View style={{ alignItems: 'center', width: horizontalScale(48) }}>
                                            <View style={[styles.transitBadge, { backgroundColor: step.transitDetails.color || colors.accent }]}>
                                                <Ionicons
                                                    name={step.transitDetails.vehicleType?.toLowerCase().includes('bus') ? 'bus' : 'subway'}
                                                    size={14}
                                                    color={step.transitDetails.textColor || '#ffffff'}
                                                />
                                                <Text style={[styles.transitBadgeText, { color: step.transitDetails.textColor || '#ffffff' }]} numberOfLines={1}>
                                                    {step.transitDetails.lineShortName || step.transitDetails.lineName}
                                                </Text>
                                            </View>
                                            <View style={[styles.transitLineBar, { backgroundColor: step.transitDetails.color || colors.accent }]} />
                                        </View>

                                        <View style={{ flex: 1, paddingBottom: verticalScale(22) }}>
                                            <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_600SemiBold'), fontSize: normalizeFont(16) }]}>
                                                {step.transitDetails.departureStop ? `${t('Board at')} ${step.transitDetails.departureStop}` : step.name}
                                            </Text>
                                            {step.transitDetails.headsign ? (
                                                <Text style={[GlobalStyles.metroSM, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular'), marginTop: 2 }]}>
                                                    {t('Toward')}: {step.transitDetails.headsign}
                                                </Text>
                                            ) : null}
                                            {step.transitDetails.stopCount ? (
                                                <Text style={[GlobalStyles.metroSM, { color: colors.accent, fontFamily: getFont('OpenSans_400Regular'), marginTop: 3 }]}>
                                                    {step.transitDetails.stopCount} {step.transitDetails.stopCount === 1 ? t('stop') : t('stops')}
                                                    {step.transitDetails.arrivalStop ? ` ${t('to')} ${step.transitDetails.arrivalStop}` : ''}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            }

                            if (step.maneuver?.type === 'walk') {
                                return (
                                    <View key={index} style={styles.transitStepContainer}>
                                        <View style={{ alignItems: 'center', width: horizontalScale(48) }}>
                                            <View style={[styles.walkBadge, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                                <Ionicons name="walk" size={16} color={colors.text} />
                                            </View>
                                            <View style={[styles.walkDottedBar, { borderColor: colors.border }]} />
                                        </View>
                                        <View style={{ flex: 1, paddingBottom: verticalScale(22) }}>
                                            <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_400Regular'), fontSize: normalizeFont(15) }]}>
                                                {step.name}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }

                            return (
                                <View key={index} style={styles.maneuver}>
                                    <Text style={[styles.arrow, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{getArrow(step.maneuver?.modifier)}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{step.maneuver?.type ? t(step.maneuver.type) : t('Go straight')}</Text>
                                        <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{step.name || t('on road')}</Text>
                                    </View>
                                </View>
                            );
                        })}

                        {/* Start Navigation Button */}
                        <MetroButton title={t('start navigation')} variant="outlined" onPress={() => route && onStartNavigation && onStartNavigation()} />
                    </>
                )}
            </ScrollView>
        </BottomSheet>
    );
}

function getArrow(modifier?: string) {
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
    },
    startButton: {
        width: horizontalScale(100),
        height: verticalScale(45),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
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
        fontSize: normalizeFont(40),
        width: horizontalScale(50),
        lineHeight: normalizeFont(40),
    },
    transitStepContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        minHeight: verticalScale(60),
    },
    transitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        zIndex: 2,
    },
    transitBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    transitLineBar: {
        width: 3,
        flex: 1,
        minHeight: 30,
        marginTop: 2,
    },
    walkBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    walkDottedBar: {
        width: 1,
        flex: 1,
        minHeight: 25,
        borderStyle: 'dashed',
        borderWidth: 1,
        marginTop: 2,
    },
});
