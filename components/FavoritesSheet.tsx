import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Dimensions, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue, withSpring, withSequence, runOnJS } from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { BottomSheet } from './BottomSheet';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { Favorite, FavoritesService } from '../services/favorites';
import { RecentsService } from '../services/recents';
import { SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

const METRO_EASING = Easing.bezier(0.1, 0.9, 0.2, 1);

// Animated Favorite Item Row with Star and Edit Button Animations
function FavoriteItemRow({
    item,
    isEditing,
    editName,
    setEditName,
    onSaveEdit,
    onStartEdit,
    onDelete,
    onSelect,
    colors,
    getFont,
    t
}: {
    item: Favorite;
    isEditing: boolean;
    editName: string;
    setEditName: (name: string) => void;
    onSaveEdit: (id: string) => void;
    onStartEdit: (item: Favorite) => void;
    onDelete: (id: string) => void;
    onSelect: (item: SearchResult) => void;
    colors: any;
    getFont: (font: string) => string;
    t: any;
}) {
    // Edit Button Animation
    const editScale = useSharedValue(1);
    const editRotate = useSharedValue(0);

    const editAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: editScale.value },
            { rotate: `${editRotate.value}deg` }
        ]
    }));

    const handleEditPressIn = () => {
        editScale.value = withTiming(0.85, { duration: 80, easing: METRO_EASING });
        editRotate.value = withTiming(-10, { duration: 80, easing: METRO_EASING });
    };

    const handleEditPressOut = () => {
        editScale.value = withTiming(1, { duration: 120, easing: METRO_EASING });
        editRotate.value = withTiming(0, { duration: 120, easing: METRO_EASING });
    };

    const handleEditPress = (e: any) => {
        e.stopPropagation();
        editScale.value = withTiming(1, { duration: 100, easing: METRO_EASING });
        editRotate.value = withTiming(0, { duration: 100, easing: METRO_EASING });
        onStartEdit(item);
    };

    // Star Button Animation
    const starScale = useSharedValue(1);
    const starRotate = useSharedValue(0);

    const starAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: starScale.value },
            { rotate: `${starRotate.value}deg` }
        ]
    }));

    const handleStarPressIn = () => {
        starScale.value = withTiming(0.8, { duration: 80, easing: METRO_EASING });
        starRotate.value = withTiming(-15, { duration: 80, easing: METRO_EASING });
    };

    const handleStarPressOut = () => {
        starScale.value = withTiming(1, { duration: 120, easing: METRO_EASING });
        starRotate.value = withTiming(0, { duration: 120, easing: METRO_EASING });
    };

    const handleStarPress = () => {
        onDelete(item.place_id);
    };

    if (isEditing) {
        return (
            <View style={[styles.itemContainer, { paddingVertical: verticalScale(10) }]}>
                <View style={styles.editContainer}>
                    <TextInput
                        style={[
                            styles.metroInput,
                            {
                                color: colors.text,
                                borderColor: colors.text,
                                backgroundColor: colors.background,
                                fontFamily: getFont('OpenSans_400Regular')
                            }
                        ]}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder={t("Enter name")}
                        placeholderTextColor={colors.textDim}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => onSaveEdit(item.place_id)}
                        blurOnSubmit={true}
                    />
                    <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 5, fontFamily: getFont('OpenSans_400Regular') }}>
                        {t('press enter to save')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.itemContainer}>
            {/* Left selectable area */}
            <TouchableOpacity
                style={{ flex: 1, marginRight: horizontalScale(10) }}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
                onLongPress={() => onStartEdit(item)}
            >
                <Text style={[styles.itemTitle, { color: colors.text, fontFamily: getFont('OpenSans_600SemiBold') }]} numberOfLines={1}>
                    {item.alias || item.display_name}
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={1}>
                    {item.address || item.vicinity}
                </Text>
                {item.alias && (
                    <Text style={[styles.itemSubtitle, { fontSize: 12, opacity: 0.7, color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={1}>
                        {item.display_name}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Right Side Icons: Animated Edit Button + Animated Star Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: horizontalScale(12) }}>
                <TouchableOpacity
                    onPress={() => onStartEdit(item)}
                    onPressIn={handleEditPressIn}
                    onPressOut={handleEditPressOut}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                >
                    <Animated.View style={editAnimatedStyle}>
                        <MaterialCommunityIcons name="pencil" size={22} color={colors.textDim} />
                    </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleStarPress}
                    onPressIn={handleStarPressIn}
                    onPressOut={handleStarPressOut}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                >
                    <Animated.View style={starAnimatedStyle}>
                        <MaterialCommunityIcons name="star" size={24} color={colors.accent} />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Simple Pivot Item with discrete color (jitter-free)
function AnimatedFavPivotItem({ isActive, title, onPress, colors, getFont, t, onLayout }: {
    isActive: boolean;
    title: string;
    onPress: () => void;
    colors: any;
    getFont: (font: string) => string;
    t: any;
    onLayout?: (e: any) => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} onLayout={onLayout} activeOpacity={0.7}>
            <Text style={[styles.pivotTitle, { color: isActive ? colors.text : colors.textDim, fontFamily: getFont('OpenSans_300Light') }]}>
                {t(title)}
            </Text>
        </TouchableOpacity>
    );
}

interface FavoritesSheetProps {
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onSelect: (item: SearchResult) => void;
    onFavoritesChange?: () => void;
}

type Tab = 'favorites' | 'recent';

export function FavoritesSheet({ state, onStateChange, onSelect, onFavoritesChange }: FavoritesSheetProps) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<Tab>('favorites');
    const pagerRef = useRef<PagerView>(null);

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

    // Data
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [recents, setRecents] = useState<SearchResult[]>([]);

    // Edit Mode (Favorites only)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const loadData = async () => {
        const favs = await FavoritesService.getFavorites();
        setFavorites(favs);
        const recs = await RecentsService.getRecents();
        setRecents(recs);
    };

    useEffect(() => {
        if (state !== 'hidden') {
            loadData();
        }
    }, [state]);

    const handleSaveEdit = async (id: string) => {
        const item = favorites.find(f => f.place_id === id);
        if (item) {
            await FavoritesService.addFavorite(item, editName);
            setEditingId(null);
            await loadData();
            onFavoritesChange?.();
        }
    };

    const handleStartEdit = (item: Favorite) => {
        setEditName(item.alias || item.display_name);
        setEditingId(item.place_id);
    };

    const handleDelete = async (id: string) => {
        await FavoritesService.removeFavorite(id);
        await loadData();
        onFavoritesChange?.();
    };

    const renderFavoriteItem = ({ item }: { item: Favorite }) => {
        return (
            <FavoriteItemRow
                item={item}
                isEditing={editingId === item.place_id}
                editName={editName}
                setEditName={setEditName}
                onSaveEdit={handleSaveEdit}
                onStartEdit={handleStartEdit}
                onDelete={handleDelete}
                onSelect={onSelect}
                colors={colors}
                getFont={getFont}
                t={t}
            />
        );
    };

    const renderRecentItem = ({ item }: { item: SearchResult }) => {
        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
            >
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.itemTitle, { color: colors.text, fontFamily: getFont('OpenSans_600SemiBold') }]} numberOfLines={1}>
                        {item.display_name}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]} numberOfLines={1}>
                        {item.address || item.vicinity}
                    </Text>
                </View>
                {/* Recent Icon on Right */}
                <MaterialCommunityIcons name="history" size={24} color={colors.textDim} />
            </TouchableOpacity>
        );
    };

    // Header dynamic layout measurement and smooth animation
    const headerWidthsRef = useRef<number[]>([0, 0]);
    const activeTabIndex = activeTab === 'favorites' ? 0 : 1;
    const pivotOffset = useSharedValue(0);

    const animatePivotToTab = (tabIndex: number) => {
        let offset = 0;
        const gap = horizontalScale(20);
        for (let i = 0; i < tabIndex; i++) {
            offset += (headerWidthsRef.current[i] || 0) + gap;
        }
        pivotOffset.value = withTiming(-offset, { duration: 250, easing: Easing.out(Easing.cubic) });
    };

    useEffect(() => {
        animatePivotToTab(activeTabIndex);
    }, [activeTabIndex]);

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
        <View style={[styles.headerContainer, { overflow: 'hidden' }]}>
            <Text style={[styles.overline, { marginBottom: verticalScale(8), marginHorizontal: horizontalScale(20), color: colors.text, fontFamily: getFont('OpenSans_700Bold') }]}>{t('MY PLACES')}</Text>
            <View style={{ height: verticalScale(70), marginBottom: 0, marginLeft: horizontalScale(20) }}>
                <Animated.View style={[styles.pivotRow, pivotAnimatedStyle]}>
                    <AnimatedFavPivotItem
                        isActive={activeTab === 'favorites'}
                        title="favorites"
                        onPress={() => handleTabChange('favorites')}
                        colors={colors}
                        getFont={getFont}
                        t={t}
                        onLayout={(e) => {
                            headerWidthsRef.current[0] = e.nativeEvent.layout.width;
                        }}
                    />
                    <AnimatedFavPivotItem
                        isActive={activeTab === 'recent'}
                        title="recent"
                        onPress={() => handleTabChange('recent')}
                        colors={colors}
                        getFont={getFont}
                        t={t}
                        onLayout={(e) => {
                            headerWidthsRef.current[1] = e.nativeEvent.layout.width;
                        }}
                    />
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
                offscreenPageLimit={2}
                onPageSelected={handlePageSelected}
            >
                <View key="1" style={{ flex: 1 }}>
                    <FlatList
                        data={favorites}
                        renderItem={renderFavoriteItem}
                        keyExtractor={item => item.place_id}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={8}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="star-outline" size={64} color={colors.textDim} />
                                <Text style={[styles.emptyText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('no favorites yet')}</Text>
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
                        initialNumToRender={8}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="history" size={64} color={colors.textDim} />
                                <Text style={[styles.emptyText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('no recent places')}</Text>
                            </View>
                        )}
                    />
                </View>
            </PagerView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: verticalScale(20),
        marginBottom: verticalScale(10),
    },
    overline: {
        fontSize: normalizeFont(14),
        letterSpacing: 1,
        marginBottom: 0,
        opacity: 0.9,
    },
    pivotRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: horizontalScale(20),
    },
    pivotTitle: {
        fontSize: normalizeFont(60),
        lineHeight: normalizeFont(70),
        letterSpacing: -1,
    },
    listContent: {
        padding: horizontalScale(20),
        paddingBottom: verticalScale(100),
    },
    separator: {
        height: 1, marginVertical: verticalScale(10),
    },
    itemContainer: {
        minHeight: verticalScale(70), // Bit taller for Nokia feel
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: verticalScale(5),
    },
    itemTitle: {
        fontSize: normalizeFont(22),
        marginBottom: verticalScale(4),
    },
    itemSubtitle: {
        fontSize: normalizeFont(14),
    },
    editContainer: {
        flex: 1,
        flexDirection: 'column',
        gap: verticalScale(15),
        paddingVertical: verticalScale(10),
    },
    metroInput: {
        padding: verticalScale(12),
        fontSize: normalizeFont(18),
        borderWidth: 2,
        borderRadius: 0, // NO CORNERS
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: verticalScale(100),
    },
    emptyText: {
        fontSize: normalizeFont(18),
        marginTop: verticalScale(20),
    }
});
