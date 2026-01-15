import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { SearchResult } from '../services/api';
import { MetroButton } from './MetroButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function formatDistance(distanceKm: number, useMiles: boolean): string {
    if (useMiles) {
        const miles = distanceKm * 0.621371;
        return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
    } else {
        return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
    }
}

export function ResultsSheet({ results = [], selectedPlace, state, onStateChange, onGetDirections, onPlaceSelect, userLocation, useMiles = true }: ResultsSheetProps) {
    const insets = useSafeAreaInsets();

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
            <View style={styles.header}>
                <Text style={[GlobalStyles.metroXS, GlobalStyles.accentText, { marginBottom: 4 }]}>RESULT</Text>
                <Text style={GlobalStyles.metroLG} numberOfLines={1}>{title}</Text>
                <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]} numberOfLines={1}>
                    {distanceText ? `${distanceText} • ` : ''}{subtitle}
                </Text>
            </View>
        );

        return (
            <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={Header}>
                <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.row}>
                        <Text style={GlobalStyles.dimText}>Address: </Text>
                        <Text style={GlobalStyles.metroMD}>{selectedPlace.display_name}</Text>
                    </View>
                    {selectedPlace.extratags?.phone && (
                        <View style={styles.row}>
                            <Text style={GlobalStyles.dimText}>Phone: </Text>
                            <Text style={GlobalStyles.metroMD}>{selectedPlace.extratags.phone}</Text>
                        </View>
                    )}

                    <MetroButton title="get directions" variant="outlined" onPress={onGetDirections} />
                </View>
            </BottomSheet>
        );
    }

    // LIST VIEW
    const Header = (
        <View style={styles.header}>
            <Text style={[GlobalStyles.metroXS, GlobalStyles.accentText, { marginBottom: 4 }]}>SEARCH RESULTS</Text>
            <Text style={GlobalStyles.metroLG}>{results.length} places found</Text>
        </View>
    );

    return (
        <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={Header}>
            <FlatList
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
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
                        <TouchableOpacity style={styles.listItem} onPress={() => onPlaceSelect && onPlaceSelect(item)}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={[GlobalStyles.metroMD, { marginBottom: 2, flex: 1 }]} numberOfLines={1}>
                                    {item.display_name.split(',')[0]}
                                </Text>
                                {distanceText && (
                                    <Text style={[GlobalStyles.metroSM, GlobalStyles.accentText, { marginLeft: 10 }]}>
                                        {distanceText}
                                    </Text>
                                )}
                            </View>
                            <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]} numberOfLines={1}>
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
        padding: 20,
        backgroundColor: 'black',
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },
    content: {
        padding: 20,
    },
    row: {
        marginBottom: 20,
    },
    button: {
        borderWidth: 2,
        borderColor: 'white',
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    listItem: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#222'
    }
});
