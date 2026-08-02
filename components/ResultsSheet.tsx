import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { SearchResult } from '../services/api';
import { MetroButton } from './MetroButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

interface ResultsSheetProps {
    results?: SearchResult[];
    selectedPlace: SearchResult | null;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onGetDirections: () => void;
    onPlaceSelect?: (place: SearchResult) => void;
    userLocation?: { latitude: number; longitude: number } | null;
    useMiles?: boolean;
}

// Haversine formula to calculate distance between two points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Returns distance in km
}


export function ResultsSheet({ results = [], selectedPlace, state, onStateChange, onGetDirections, onPlaceSelect, userLocation, useMiles = true }: ResultsSheetProps) {
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

    function formatDistance(distanceKm: number, useMiles: boolean): string {
        if (useMiles) {
            const miles = distanceKm * 0.621371;
            return miles < 0.1 ? `${Math.round(miles * 5280)} ${t('ft')}` : `${miles.toFixed(1)} ${t('mi')}`;
        } else {
            return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} ${t('m')}` : `${distanceKm.toFixed(1)} ${t('km')}`;
        }
    }

    // If no selection and no results, hide
    if (!selectedPlace && results.length === 0) return null;

    // DETAIL VIEW
    if (selectedPlace) {
        const title = selectedPlace.display_name.split(',')[0];
        const subtitle = selectedPlace.display_name.substring(selectedPlace.display_name.indexOf(',') + 1).trim();

        // Calculate distance for detail view
        let distanceText = '';
        if (userLocation) {
            const dist = getDistance(
                userLocation.latitude, userLocation.longitude,
                parseFloat(selectedPlace.lat), parseFloat(selectedPlace.lon)
            );
            distanceText = formatDistance(dist, useMiles);
        }

        const Header = (
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <Text style={[GlobalStyles.metroXS, GlobalStyles.accentText, { marginBottom: verticalScale(4), color: colors.accent, fontFamily: getFont('OpenSans_600SemiBold') }]}>{t('RESULT')}</Text>
                <Text style={{ fontFamily: getFont('OpenSans_300Light'), fontSize: normalizeFont(50), color: colors.text, lineHeight: normalizeFont(55), letterSpacing: -1 }} numberOfLines={1}>{title}</Text>
                <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={1}>
                    {distanceText ? `${distanceText} • ` : ''}{subtitle}
                </Text>
            </View>
        );

        return (
            <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={Header} peekHeight={verticalScale(140)}>
                <View style={[styles.content, { paddingBottom: insets.bottom + verticalScale(20), backgroundColor: colors.background }]}>
                    <View style={styles.row}>
                        <Text style={[GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Address')}: </Text>
                        <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{selectedPlace.display_name}</Text>
                    </View>
                    {selectedPlace.phone && (
                        <View style={styles.row}>
                            <Text style={[GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('Phone')}: </Text>
                            <Text style={[GlobalStyles.metroMD, { color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{selectedPlace.phone}</Text>
                        </View>
                    )}

                    <MetroButton title={t("get directions")} variant="outlined" onPress={onGetDirections} />
                </View>
            </BottomSheet>
        );
    }

    // LIST VIEW
    const Header = (
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Text style={[GlobalStyles.metroXS, GlobalStyles.accentText, { marginBottom: verticalScale(4), color: colors.accent, fontFamily: getFont('OpenSans_600SemiBold') }]}>{t('SEARCH RESULTS')}</Text>
            <Text style={{ fontFamily: getFont('OpenSans_300Light'), fontSize: normalizeFont(50), color: colors.text, lineHeight: normalizeFont(55), letterSpacing: -1 }}>{results.length} {t('places found')}</Text>
        </View>
    );

    return (
        <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={Header} peekHeight={verticalScale(135)}>
            <FlatList
                style={{ backgroundColor: colors.background }}
                contentContainerStyle={{ paddingBottom: insets.bottom + verticalScale(20) }}
                data={results}
                keyExtractor={item => item.place_id.toString()}
                renderItem={({ item }) => {
                    // Calculate distance for each item
                    let distanceText = '';
                    if (userLocation) {
                        const dist = getDistance(
                            userLocation.latitude, userLocation.longitude,
                            parseFloat(item.lat), parseFloat(item.lon)
                        );
                        distanceText = formatDistance(dist, useMiles);
                    }

                    return (
                        <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.border }]} onPress={() => onPlaceSelect && onPlaceSelect(item)}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={[GlobalStyles.metroMD, { marginBottom: verticalScale(2), flex: 1, color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={1}>
                                    {item.display_name.split(',')[0]}
                                </Text>
                                {distanceText && (
                                    <Text style={[GlobalStyles.metroSM, GlobalStyles.accentText, { marginLeft: horizontalScale(10), color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]}>
                                        {distanceText}
                                    </Text>
                                )}
                            </View>
                            <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={1}>
                                {item.display_name.substring(item.display_name.indexOf(',') + 1).trim()}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: horizontalScale(20),
        borderBottomWidth: 1,
    },
    content: {
        padding: horizontalScale(20),
        flex: 1,
    },
    row: {
        marginBottom: verticalScale(20),
    },
    button: {
        borderWidth: 2,
        paddingVertical: verticalScale(8),
        paddingHorizontal: horizontalScale(20),
        marginTop: verticalScale(10),
        alignSelf: 'flex-start',
    },
    listItem: {
        padding: horizontalScale(20),
        borderBottomWidth: 1,
    }
});
