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
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

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
    const [searchIntent, setSearchIntent] = useState<{ category?: string; submit?: boolean } | null>(null);

    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

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
        const applyFilter = false; // Never strictly filter, trust Google's location bias

        return await api.searchPlaces(text, searchLocation, 80467, applyFilter);
    };

    // One owner for search results: obsolete requests cannot update the UI or reopen results.
    useEffect(() => {
        let cancelled = false;
        if (!active || query.trim().length <= 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        setResults([]);
        setLoading(true);
        const timeout = setTimeout(async () => {
            try {
                const category = searchIntent?.category;
                const data = category && userLocation
                    ? await api.searchByCategory(category, userLocation.latitude, userLocation.longitude, 24)
                    : await fetchSearchResults(query.trim());
                if (cancelled) return;
                setResults(data);
                if (searchIntent) onCategorySearch?.(data);
            } catch (error) {
                if (!cancelled) console.warn('Search failed', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, searchIntent ? 0 : 500);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [query, active, searchIntent]);

    const handleSearchSubmit = () => {
        Keyboard.dismiss();
        setSearchIntent({ submit: true });
    };

    const handleCategoryPress = (cat: string) => {
        setQuery(cat);
        setSearchIntent({ category: cat });
    };

    // SearchCurtain uses conditional rendering with layout animations for smooth appearance
    const displayData = results.length > 0 ? results : recents;
    const isShowingRecents = results.length === 0 && recents.length > 0;

    if (!active) return null;

    return (
        <Animated.View
            entering={SlideInUp.duration(400).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutUp.duration(300).easing(Easing.in(Easing.quad))}
            style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: colors.searchCurtainBg }]}
        >
            <View style={[styles.searchBoxWrapper, { backgroundColor: 'white' }]}>
                <TextInput
                    style={[styles.searchInput, { color: 'black', fontFamily: getFont('OpenSans_400Regular') }]}
                    placeholder={t("Search...")}
                    placeholderTextColor={colors.textDim}
                    value={query}
                    onChangeText={text => { setSearchIntent(null); setQuery(text); }}
                    autoFocus={false}
                    returnKeyType="search"
                    onSubmitEditing={handleSearchSubmit}
                />
                <TouchableOpacity onPress={onClose}>
                    <Svg width={22} height={22} fill={colors.accent} viewBox="0 0 24 24">
                        <Path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Category Chips - Hide when searching manually */}
            {query.length === 0 && (
                <View style={{ height: 60, marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
                        {CATEGORIES.map((cat) => (
                            <MetroButton
                                key={cat}
                                title={t(cat.toLowerCase())}
                                variant="outlined"
                                style={{ borderColor: colors.textDim, paddingVertical: 6, paddingHorizontal: 15 }}
                                textStyle={{ color: colors.text, fontSize: 16, fontFamily: getFont('OpenSans_400Regular') }}
                                onPress={() => handleCategoryPress(cat)}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.resultsContainer}>
                <FlatList
                    data={query.length === 0 ? recents : [...recents.filter(r => r.display_name.toLowerCase().includes(query.toLowerCase())), ...results]}
                    keyExtractor={(item, index) => item.place_id.toString() + index}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={() => (
                        <>
                            {results.length === 0 && query.length === 0 && recents.length > 0 && (
                                <Text style={[GlobalStyles.metroMD, { marginBottom: 10, opacity: 0.6, color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('recent')}</Text>
                            )}
                        </>
                    )}
                    renderItem={({ item }) => {
                        const isRecent = recents.some(r => r.place_id === item.place_id);
                        // If we are filtering, we show history icon for recents
                        // If we are showing just list (query empty), we show history icon for all (as they are all recent)
                        const showHistoryIcon = isRecent;

                        return (
                            <TouchableOpacity style={[styles.suggestion, { borderBottomColor: colors.border }]} onPress={() => {
                                Keyboard.dismiss();
                                onResultSelected(item);
                            }}>
                                {showHistoryIcon && (
                                    <View style={{ marginRight: 15 }}>
                                        <MaterialCommunityIcons name="history" size={24} color={colors.textDim} />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.suggestionText, { color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]}>{item.display_name}</Text>
                                    {(item.address || item.vicinity) ? (
                                        <Text style={[styles.suggestionText, { color: colors.textDim, fontSize: 16, fontFamily: getFont('OpenSans_400Regular') }]}>{item.address || item.vicinity}</Text>
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
