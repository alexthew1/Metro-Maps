import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Dimensions, FlatList, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { MetroButton } from './MetroButton';
import { GlobalStyles } from '../constants/Styles';
import Svg, { Path } from 'react-native-svg';
import { api, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchCurtainProps {
    active: boolean;
    onClose: () => void;
    onResultSelected: (result: SearchResult) => void;
    onCategorySearch?: (results: SearchResult[]) => void;
    region?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
    userLocation?: { latitude: number; longitude: number } | null;
    favorites?: SearchResult[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = [
    'Restaurants', 'Burger', 'Pizza', 'Chinese', 'Mexican', 'Italian', 'Japanese', 'Indian', 'Steak',
    'Gas Station', 'Hotel', 'Parking', 'Grocery', 'Pharmacy', 'Bank', 'Bar', 'ATM'
];

export function SearchCurtain({ active, onClose, onResultSelected, region, onCategorySearch, userLocation, favorites }: SearchCurtainProps) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Known categories for smart parsing (include common variations)
    const knownCategories = ['restaurant', 'restaurants', 'burger', 'burgers', 'pizza', 'chinese', 'mexican', 'japanese', 'indian', 'italian', 'steak', 'gas', 'gas station', 'hotel', 'hotels', 'parking', 'bank', 'banks', 'pharmacy', 'grocery', 'bar', 'bars', 'atm'];

    // Debouce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);

                // Check for "category in location" pattern
                const inMatch = query.match(/^(.+?)\s+in\s+(.+)$/i);

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
                            console.log('Category search results:', data.length);
                            setResults(data);
                            setLoading(false);
                            if (onCategorySearch) onCategorySearch(data);
                            return;
                        }
                    }
                }

                // Default: Google Places Search
                // We prioritize user location over viewbox for the API call to enable sorting
                let searchLocation = undefined;
                if (userLocation) {
                    searchLocation = { lat: userLocation.latitude, lon: userLocation.longitude };
                }

                const data = await api.searchPlaces(query, searchLocation);
                setResults(data);
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

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

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(active ? 1 : 0, {
                duration: 300,
                easing: Easing.bezier(0.1, 0.9, 0.2, 1),
            }),
            transform: [
                {
                    translateY: withTiming(active ? 0 : -SCREEN_HEIGHT, {
                        duration: 400,
                        easing: Easing.bezier(0.1, 0.9, 0.2, 1),
                    }),
                },
            ],
        };
    }, [active]);

    return (
        <Animated.View
            style={[styles.container, animatedStyle, { paddingTop: insets.top + 20 }]}
            pointerEvents={active ? 'auto' : 'none'}
        >
            <View style={styles.searchBoxWrapper}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor="#999"
                    value={query}
                    onChangeText={setQuery}
                    autoFocus={false} // Managed by parent or focus logic if needed
                />
                <TouchableOpacity onPress={onClose}>
                    <Svg width={22} height={22} fill={Colors.accent} viewBox="0 0 24 24">
                        <Path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Category Chips */}
            <View style={{ height: 60, marginBottom: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
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
                    data={results.length > 0 ? results : (favorites || [])}
                    keyExtractor={(item) => item.place_id.toString()}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    ListHeaderComponent={() => (
                        <>
                            {results.length === 0 && favorites && favorites.length > 0 && (
                                <Text style={[GlobalStyles.metroMD, { marginBottom: 10, opacity: 0.6 }]}>favorites</Text>
                            )}
                        </>
                    )}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.suggestion} onPress={() => onResultSelected(item)}>
                            <View>
                                <Text style={[styles.suggestionText, { color: Colors.accent }]}>{item.display_name}</Text>
                                {item.address ? (
                                    <Text style={[styles.suggestionText, { color: '#bbb', fontSize: 16 }]}>{item.address}</Text>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                    )}
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
        paddingHorizontal: 20,
    },
    suggestion: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    suggestionText: {
        fontSize: 22,
    }

});
