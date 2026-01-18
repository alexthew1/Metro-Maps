import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Dimensions, FlatList, ScrollView, Keyboard } from 'react-native';
import Animated, { useAnimatedStyle, Easing, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { MetroButton } from './MetroButton';
import { GlobalStyles } from '../constants/Styles';
import Svg, { Path } from 'react-native-svg';
import { api, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecentsService } from '../services/recents';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SearchCurtainProps {
    active: boolean;
    onClose: () => void;
    onResultSelected: (result: SearchResult) => void;
    onCategorySearch?: (results: SearchResult[]) => void;
    region?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
    userLocation?: { latitude: number; longitude: number } | null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = [
    'Restaurants', 'Burger', 'Pizza', 'Chinese', 'Mexican', 'Italian', 'Japanese', 'Indian', 'Steak',
    'Gas Station', 'Hotel', 'Parking', 'Grocery', 'Pharmacy', 'Bank', 'Bar', 'ATM'
];

export function SearchCurtain({ active, onClose, onResultSelected, region, onCategorySearch, userLocation }: SearchCurtainProps) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [recents, setRecents] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial Load of Recents
    useEffect(() => {
        if (active) {
            loadRecents();
        }
    }, [active]);

    const loadRecents = async () => {
        const data = await RecentsService.getRecents();
        setRecents(data);
    };

    // Unified Search Logic
    const fetchSearchResults = async (text: string): Promise<SearchResult[]> => {
        if (text.length <= 2) return [];

        // Check for "category in location" pattern
        const inMatch = text.match(/^(.+?)\s+in\s+(.+)$/i);

        if (inMatch) {
            const categoryPart = inMatch[1].trim().toLowerCase();
            const locationPart = inMatch[2].trim();

            console.log('Parsed search:', { categoryPart, locationPart });

            // Map common variations to API category names
            const categoryMap: Record<string, string> = {
                'restaurant': 'restaurants',
                'restaurants': 'restaurants',
                'burger': 'burger',
                'burgers': 'burger',
                'pizza': 'pizza',
                'chinese': 'chinese',
                'mexican': 'mexican',
                'japanese': 'japanese',
                'indian': 'indian',
                'italian': 'italian',
                'steak': 'steak',
                'gas': 'gas station',
                'gas station': 'gas station',
                'hotel': 'hotel',
                'hotels': 'hotel',
                'parking': 'parking',
                'bank': 'bank',
                'banks': 'bank',
                'pharmacy': 'pharmacy',
                'grocery': 'grocery',
                'bar': 'bar',
                'bars': 'bar',
                'atm': 'atm',
            };

            const mappedCategory = categoryMap[categoryPart];

            if (mappedCategory && locationPart.length > 2) {
                console.log('Geocoding location:', locationPart);
                const coords = await api.geocode(locationPart);
                console.log('Geocode result:', coords);

                if (coords) {
                    console.log('Searching category:', mappedCategory, 'at', coords);
                    const data = await api.searchByCategory(mappedCategory, coords.latitude, coords.longitude, 24);
                    return data;
                }
            }
        }

        // Default: Google Places Search
        let searchLocation = undefined;
        if (userLocation) {
            searchLocation = { lat: userLocation.latitude, lon: userLocation.longitude };
        }

        const hasLocationInQuery = /\b(in|near|at|around)\s+\w+/i.test(text);
        const applyFilter = !hasLocationInQuery;

        return await api.searchPlaces(text, searchLocation, 80467, applyFilter);
    };

    // Debounce Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);
                const data = await fetchSearchResults(query);
                setResults(data);
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Handle Enter Key Press
    const handleSearchSubmit = async () => {
        Keyboard.dismiss();
        if (query.length > 2) {
            setLoading(true);
            const data = await fetchSearchResults(query);
            setResults(data);
            setLoading(false);
            if (onCategorySearch) {
                onCategorySearch(data);
            }
        }
    };

    const handleCategoryPress = async (cat: string) => {
        setQuery(cat); // Visual feedback
        setLoading(true);

        // Use Overpass API for proper category search with metadata
        // 48km radius = ~30 miles
        let data: SearchResult[] = [];
        if (userLocation) {
            data = await api.searchByCategory(cat, userLocation.latitude, userLocation.longitude, 24);
        } else {
            // Fallback to Nominatim if no user location
            data = await api.searchPlaces(cat);
        }

        // Show all results in the radius
        setResults(data);
        setLoading(false);

        if (onCategorySearch) {
            onCategorySearch(data);
        }
    };

    // SearchCurtain uses conditional rendering with layout animations for smooth appearance
    const displayData = results.length > 0 ? results : recents;
    const isShowingRecents = results.length === 0 && recents.length > 0;

    if (!active) return null;

    return (
        <Animated.View
            entering={SlideInUp.duration(400).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutUp.duration(300).easing(Easing.in(Easing.quad))}
            style={[styles.container, { paddingTop: insets.top + 20 }]}
        >
            <View style={styles.searchBoxWrapper}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor="#999"
                    value={query}
                    onChangeText={setQuery}
                    autoFocus={false}
                    returnKeyType="search"
                    onSubmitEditing={handleSearchSubmit}
                />
                <TouchableOpacity onPress={onClose}>
                    <Svg width={22} height={22} fill={Colors.accent} viewBox="0 0 24 24">
                        <Path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Category Chips */}
            <View style={{ height: 60, marginBottom: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
                    {CATEGORIES.map((cat) => (
                        <MetroButton
                            key={cat}
                            title={cat.toLowerCase()}
                            variant="outlined"
                            style={{ borderColor: Colors.textDim, paddingVertical: 6, paddingHorizontal: 15 }}
                            textStyle={{ color: Colors.white, fontSize: 16 }}
                            onPress={() => handleCategoryPress(cat)}
                        />
                    ))}
                </ScrollView>
            </View>

            <View style={styles.resultsContainer}>
                <FlatList
                    data={query.length === 0 ? recents : [...recents.filter(r => r.display_name.toLowerCase().includes(query.toLowerCase())), ...results]}
                    keyExtractor={(item, index) => item.place_id.toString() + index}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={() => (
                        <>
                            {results.length === 0 && query.length === 0 && recents.length > 0 && (
                                <Text style={[GlobalStyles.metroMD, { marginBottom: 10, opacity: 0.6 }]}>recent</Text>
                            )}
                        </>
                    )}
                    renderItem={({ item }) => {
                        const isRecent = recents.some(r => r.place_id === item.place_id);
                        // If we are filtering, we show history icon for recents
                        // If we are showing just list (query empty), we show history icon for all (as they are all recent)
                        const showHistoryIcon = isRecent;

                        return (
                            <TouchableOpacity style={styles.suggestion} onPress={() => {
                                Keyboard.dismiss();
                                onResultSelected(item);
                            }}>
                                {showHistoryIcon && (
                                    <View style={{ marginRight: 15 }}>
                                        <MaterialCommunityIcons name="history" size={24} color="#666" />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.suggestionText, { color: Colors.accent }]}>{item.display_name}</Text>
                                    {(item.address || item.vicinity) ? (
                                        <Text style={[styles.suggestionText, { color: '#bbb', fontSize: 16 }]}>{item.address || item.vicinity}</Text>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
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
        backgroundColor: Colors.searchCurtainBg,
        zIndex: 50,
    },
    searchBoxWrapper: {
        backgroundColor: 'white',
        borderColor: Colors.accent,
        borderWidth: 2,
        marginHorizontal: 20,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 20,
        color: 'black',
        fontFamily: 'OpenSans_400Regular',
    },
    resultsContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    suggestion: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    suggestionText: {
        fontSize: 22,
        fontFamily: 'OpenSans_400Regular',
    }

});
