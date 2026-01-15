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
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = ['Restaurants', 'Gas Station', 'Hotel', 'Parking', 'Bank', 'Pharmacy', 'Grocery', 'Bar', 'ATM'];

export function SearchCurtain({ active, onClose, onResultSelected, region, onCategorySearch, userLocation }: SearchCurtainProps) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Known categories for smart parsing
    const knownCategories = ['restaurants', 'gas station', 'hotel', 'parking', 'bank', 'pharmacy', 'grocery', 'bar', 'atm'];

    // Debouce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);

                // Check for "category in location" pattern
                const inMatch = query.toLowerCase().match(/^(.+?)\s+in\s+(.+)$/i);

                if (inMatch) {
                    const [_, categoryPart, locationPart] = inMatch;
                    const category = categoryPart.trim();
                    const location = locationPart.trim();

                    // Check if categoryPart is a known category
                    const isKnownCategory = knownCategories.some(c =>
                        c.toLowerCase() === category.toLowerCase() ||
                        c.toLowerCase().includes(category.toLowerCase())
                    );

                    if (isKnownCategory && location.length > 2) {
                        // Geocode the location first
                        const coords = await api.geocode(location);
                        if (coords) {
                            const data = await api.searchByCategory(category, coords.latitude, coords.longitude, 24);
                            setResults(data);
                            setLoading(false);
                            if (onCategorySearch) onCategorySearch(data);
                            return;
                        }
                    }
                }

                // Default: regular Nominatim search
                let viewbox = undefined;
                if (region) {
                    const left = region.longitude - region.longitudeDelta / 2;
                    const top = region.latitude + region.latitudeDelta / 2;
                    const right = region.longitude + region.longitudeDelta / 2;
                    const bottom = region.latitude - region.latitudeDelta / 2;
                    viewbox = `${left},${top},${right},${bottom}`;
                }

                const data = await api.searchPlaces(query, viewbox);
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
                    data={results}
                    keyExtractor={(item) => item.place_id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.suggestion} onPress={() => onResultSelected(item)}>
                            <Text style={styles.suggestionText}>
                                {/* Simple highlight logic could go here, for now just render */}
                                <Text style={{ color: Colors.accent }}>{item.display_name.split(',')[0]}</Text>
                                <Text style={{ color: Colors.white }}>{item.display_name.substring(item.display_name.indexOf(','))}</Text>
                            </Text>
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
        fontFamily: 'System', // Ideal: Open Sans
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
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    }

});
