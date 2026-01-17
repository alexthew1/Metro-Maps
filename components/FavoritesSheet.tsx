import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue } from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import { BottomSheet } from './BottomSheet';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { Favorite, FavoritesService } from '../services/favorites';
import { RecentsService } from '../services/recents';
import { SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FavoritesSheetProps {
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onSelect: (item: SearchResult) => void;
}

type Tab = 'favorites' | 'recent';

export function FavoritesSheet({ state, onStateChange, onSelect }: FavoritesSheetProps) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<Tab>('favorites');
    const pagerRef = useRef<PagerView>(null);

    // Data
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [recents, setRecents] = useState<SearchResult[]>([]);

    // Edit Mode (Favorites only)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        if (state !== 'hidden') {
            loadData();
        }
    }, [state, activeTab]);

    const loadData = async () => {
        const favs = await FavoritesService.getFavorites();
        setFavorites(favs);
        const recs = await RecentsService.getRecents();
        setRecents(recs);
    };

    const handleSaveEdit = async (id: string) => {
        const item = favorites.find(f => f.place_id === id);
        if (item) {
            await FavoritesService.addFavorite(item, editName);
            setEditingId(null);
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        await FavoritesService.removeFavorite(id);
        loadData();
    };

    const renderFavoriteItem = ({ item }: { item: Favorite }) => {
        const isEditing = editingId === item.place_id;

        if (isEditing) {
            return (
                <View style={[styles.itemContainer, { paddingVertical: 10 }]}>
                    <View style={styles.editContainer}>
                        <TextInput
                            style={styles.metroInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter name"
                            placeholderTextColor="#999"
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={() => handleSaveEdit(item.place_id)}
                            blurOnSubmit={true}
                        />
                        <Text style={{ color: '#666', fontSize: 12, marginTop: 5, fontFamily: 'OpenSans_400Regular' }}>press enter to save</Text>
                    </View>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
                delayPressIn={100}
                onLongPress={() => {
                    setEditName(item.alias || item.display_name);
                    setEditingId(item.place_id);
                }}
            >
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.alias || item.display_name}
                    </Text>
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {item.address || item.vicinity}
                    </Text>
                    {item.alias && (
                        <Text style={[styles.itemSubtitle, { fontSize: 12, opacity: 0.7 }]} numberOfLines={1}>
                            {item.display_name}
                        </Text>
                    )}
                </View>

                {/* Right Side Icons: Edit Button + Static Star */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <TouchableOpacity onPress={(e) => {
                        e.stopPropagation();
                        setEditName(item.alias || item.display_name);
                        setEditingId(item.place_id);
                    }}
                        style={{ padding: 5 }}>
                        <MaterialCommunityIcons name="pencil" size={22} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(item.place_id);
                    }}>
                        <MaterialCommunityIcons name="star" size={24} color={Colors.accent} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderRecentItem = ({ item }: { item: SearchResult }) => {
        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
                delayPressIn={100}
            >
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.display_name}
                    </Text>
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {item.address || item.vicinity}
                    </Text>
                </View>
                {/* Recent Icon on Right */}
                <MaterialCommunityIcons name="history" size={24} color="#666" />
            </TouchableOpacity>
        );
    };

    // Animation: slide the pivot row left when switching to 'recent' to keep both tabs visible.
    // Increased offset so only last ~2 letters of inactive tab are visible.
    const pivotOffset = useSharedValue(0);

    useEffect(() => {
        pivotOffset.value = withTiming(activeTab === 'recent' ? -180 : 0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, [activeTab]);

    const pivotAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: pivotOffset.value }]
        };
    });

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        pagerRef.current?.setPage(tab === 'favorites' ? 0 : 1);
    };

    const handlePageSelected = (e: any) => {
        const page = e.nativeEvent.position;
        setActiveTab(page === 0 ? 'favorites' : 'recent');
    };

    const Header = (
        <View style={styles.headerContainer}>
            <Text style={[styles.overline, { marginBottom: 8 }]}>MY PLACES</Text>
            <View style={{ overflow: 'hidden', height: 70, marginBottom: 0 }}>
                <Animated.View style={[styles.pivotRow, pivotAnimatedStyle]}>
                    <TouchableOpacity onPress={() => handleTabChange('favorites')}>
                        <Text style={[styles.pivotTitle, activeTab === 'favorites' ? styles.pivotActive : styles.pivotInactive]}>favorites</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleTabChange('recent')}>
                        <Text style={[styles.pivotTitle, activeTab === 'recent' ? styles.pivotActive : styles.pivotInactive]}>recent</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );

    return (
        <BottomSheet visible={state !== 'hidden'} state={state} onStateChange={onStateChange} header={Header} peekHeight={155}>
            <PagerView
                ref={pagerRef}
                style={{ flex: 1, paddingBottom: insets.bottom + 20 }}
                initialPage={0}
                onPageSelected={handlePageSelected}
            >
                <View key="1" style={{ flex: 1 }}>
                    <FlatList
                        data={favorites}
                        renderItem={renderFavoriteItem}
                        keyExtractor={item => item.place_id}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="star-outline" size={64} color="#444" />
                                <Text style={styles.emptyText}>no favorites yet</Text>
                            </View>
                        )}
                    />
                </View>

                <View key="2" style={{ flex: 1 }}>
                    <FlatList
                        data={recents}
                        renderItem={renderRecentItem}
                        keyExtractor={item => item.place_id}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="history" size={64} color="#444" />
                                <Text style={styles.emptyText}>no recent places</Text>
                            </View>
                        )}
                    />
                </View>
            </PagerView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: Colors.background,
        zIndex: 100,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 10,
    },
    overline: {
        fontFamily: 'OpenSans_700Bold',
        fontSize: 14,
        letterSpacing: 1,
        color: 'white',
        marginBottom: 0,
        opacity: 0.9,
    },
    pivotRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 20,
    },
    pivotTitle: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 60,
        lineHeight: 70,
        letterSpacing: -1,
        color: 'white',
    },
    pivotActive: {
        color: 'white',
    },
    pivotInactive: {
        color: '#666',
        fontSize: 60,
        lineHeight: 70,
        fontFamily: 'OpenSans_300Light',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    separator: {
        height: 1, backgroundColor: '#222', marginVertical: 10,
    },
    itemContainer: {
        minHeight: 70, // Bit taller for Nokia feel
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    itemTitle: {
        fontFamily: 'OpenSans_600SemiBold', // Slightly bolder for title
        fontSize: 22,
        color: 'white',
        marginBottom: 4,
    },
    itemSubtitle: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 14,
        color: Colors.accent, // Metro Blue for subtitle/address often used in Nokia Maps
    },
    editContainer: {
        flex: 1,
        flexDirection: 'column',
        gap: 15,
        paddingVertical: 10,
    },
    metroInput: {
        backgroundColor: '#000',
        color: 'white',
        padding: 12,
        fontSize: 18,
        fontFamily: 'OpenSans_400Regular',
        borderWidth: 2,
        borderColor: 'white', // High contrast border
        borderRadius: 0, // NO CORNERS
    },
    iconBtn: {
        padding: 5,
        backgroundColor: '#333', // Slight background for hit target
        borderRadius: 20, // Circular touch target visual
        width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 18,
        color: '#666',
        marginTop: 20,
    }
});
