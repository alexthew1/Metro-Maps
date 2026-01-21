import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image, Linking, Platform, Share } from 'react-native';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import Animated, { useAnimatedStyle, withTiming, Easing, SlideInDown, SlideOutDown, useSharedValue, interpolate, Extrapolation, interpolateColor, SharedValue } from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { MetroButton } from './MetroButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchResult, api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

// Simple Pivot Item with discrete color (jitter-free)
function AnimatedPivotItem({ isActive, title, onPress }: {
    isActive: boolean;
    title: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress}>
            <Text style={[styles.pivotHeaderItem, { color: isActive ? '#ffffff' : '#666666' }]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PivotScreenProps {
    item: SearchResult | null;
    onClose: () => void;
    onGetDirections: () => void;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}

const BAR_HEIGHT = 72;

export function PivotScreen({ item, onClose, onGetDirections, isFavorite, onToggleFavorite }: PivotScreenProps) {
    const insets = useSafeAreaInsets();
    const pagerRef = useRef<PagerView>(null);
    const [activePage, setActivePage] = useState(0);
    const [details, setDetails] = useState<SearchResult | null>(item);
    const [showLabels, setShowLabels] = useState(false);

    // Unify App Bar Dimensions Logic
    const baseHeight = showLabels ? BAR_HEIGHT + 20 : BAR_HEIGHT;
    const totalHeight = baseHeight + insets.bottom;

    const navBarStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(totalHeight, { duration: 200 }),
        };
    }, [totalHeight]);

    useEffect(() => {
        let isMounted = true;
        if (item?.place_id) {
            setDetails(item); // Reset to passed item initially
            api.getPlaceDetails(item.place_id).then(fullDetails => {
                if (isMounted && fullDetails) {
                    setDetails(prev => ({ ...prev, ...fullDetails }));
                }
            });
        }
        return () => { isMounted = false; };
    }, [item?.place_id]);

    const handlePageSelection = (e: any) => {
        setActivePage(e.nativeEvent.position);
    };

    const snapToPage = (index: number) => {
        pagerRef.current?.setPage(index);
        setActivePage(index);
    };

    // Header Animation - Triggered on page selection for smooth, jitter-free transitions
    const headerOffset = useSharedValue(0);

    useEffect(() => {
        headerOffset.value = withTiming(-activePage * 140, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, [activePage]);

    const headerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: headerOffset.value }]
        };
    });

    if (!details) return null;

    return (
        <Animated.View
            entering={SlideInDown.duration(400).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(400).easing(Easing.out(Easing.cubic))}
            style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: 0 }]} // Handle paddingBottom in AppBar
        >
            {/* Background - Black for WP Style */}
            <View style={StyleSheet.absoluteFillObject} />

            {/* Title (Small, Uppercase, Top Left) */}
            <View style={{ paddingHorizontal: 20, marginBottom: 0 }}>
                <Text style={[GlobalStyles.metroSM, { fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: '#fff', fontFamily: 'OpenSans_700Bold' }]} numberOfLines={1}>
                    {details.display_name.toUpperCase()}
                </Text>
            </View>

            {/* Pivot Headers Container (Masked) */}
            <View style={{ overflow: 'hidden', marginLeft: 20, height: 80, marginBottom: 10 }}>
                <Animated.View style={[styles.pivotHeaderContainer, headerStyle]}>
                    {['about', 'photos', 'reviews'].map((title, index) => (
                        <AnimatedPivotItem
                            key={title}
                            isActive={activePage === index}
                            title={title}
                            onPress={() => snapToPage(index)}
                        />
                    ))}
                </Animated.View>
            </View>

            {/* Pager Content */}
            <PagerView
                ref={pagerRef}
                style={{ flex: 1, marginBottom: totalHeight }} // Add margin to avoid overlap with absolute AppBar
                initialPage={0}
                offscreenPageLimit={2}
                onPageSelected={handlePageSelection}
                pageMargin={20}
            >
                {/* PAGE 1: ABOUT */}
                <View key="1" style={styles.page}>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <View style={{ gap: 20 }}>
                            {/* Mini Map */}
                            <View style={{ width: 140, height: 140, backgroundColor: '#333' }}>
                                <MapView
                                    provider={PROVIDER_GOOGLE}
                                    style={{ flex: 1 }}
                                    liteMode={true}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                    rotateEnabled={false}
                                    pitchEnabled={false}
                                    region={{
                                        latitude: parseFloat(details.lat),
                                        longitude: parseFloat(details.lon),
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                >
                                    <Marker coordinate={{ latitude: parseFloat(details.lat), longitude: parseFloat(details.lon) }} />
                                </MapView>
                            </View>

                            {/* Get Directions */}
                            <TouchableOpacity onPress={onGetDirections}>
                                <Text style={[GlobalStyles.metroLG, { fontSize: 28, marginBottom: 4 }]}>get directions</Text>
                                <Text style={[GlobalStyles.metroMD, { color: Colors.accent }]}>{details.address?.split(',')[0]}</Text>
                                <Text style={[GlobalStyles.metroMD, { color: Colors.accent, fontSize: 16 }]}>{details.address}</Text>
                            </TouchableOpacity>

                            {/* Description (Real) */}
                            {details.description ? (
                                <Text style={[GlobalStyles.metroMD, { fontSize: 20, lineHeight: 28 }]}>
                                    {details.description}
                                </Text>
                            ) : null}

                            {/* Phone */}
                            {details.phone && (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]}>PHONE</Text>
                                    <Text style={[GlobalStyles.metroMD, { fontSize: 22 }]} onPress={() => Linking.openURL(`tel:${details.phone}`)}>{details.phone}</Text>
                                </View>
                            )}

                            {/* Website */}
                            {details.website && (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]}>WEBSITE</Text>
                                    <Text style={[GlobalStyles.metroMD, { fontSize: 22, color: Colors.accent }]} onPress={() => Linking.openURL(details.website!)}>visit website</Text>
                                </View>
                            )}

                        </View>
                    </ScrollView>
                </View>

                {/* PAGE 2: PHOTOS */}
                <View key="2" style={styles.page}>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>

                        {/* "add a photo" button */}
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                <Ionicons name="add" size={24} color="#fff" />
                            </View>
                            <Text style={[GlobalStyles.metroMD, { fontSize: 24 }]}>add a photo</Text>
                        </TouchableOpacity>

                        {/* 4-Column Grid */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {details.photos && details.photos.length > 0 ? (
                                details.photos.map((photo: any, index: number) => (
                                    <View key={index} style={{ width: '23.5%', aspectRatio: 1, backgroundColor: '#222' }}>
                                        <Image
                                            source={{ uri: api.getPhotoUrl(photo.photo_reference, 200) }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))
                            ) : (
                                <Text style={GlobalStyles.dimText}>No photos available.</Text>
                            )}
                        </View>
                    </ScrollView>
                </View>

                {/* PAGE 3: REVIEWS */}
                <View key="3" style={styles.page}>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        {details.reviews && details.reviews.length > 0 ? (
                            details.reviews.map((review: any, index: number) => (
                                <View key={index} style={{ marginBottom: 32 }}>
                                    <Text style={[GlobalStyles.metroMD, { fontFamily: 'OpenSans_700Bold', fontSize: 20, marginBottom: 4 }]}>{review.author_name}</Text>
                                    <Text style={[GlobalStyles.metroMD, { color: Colors.accent, marginBottom: 8 }]}>{review.rating}/5 rating</Text>
                                    <Text style={[GlobalStyles.metroSM, { opacity: 0.9, lineHeight: 22, fontSize: 16 }]}>{review.text}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={GlobalStyles.dimText}>No reviews available.</Text>
                        )}
                    </ScrollView>
                </View>
            </PagerView>

            {/* Bottom App Bar */}
            <Animated.View style={[
                styles.appBar,
                navBarStyle, // Apply animated height
                {
                    paddingBottom: insets.bottom,
                    justifyContent: 'center',
                    gap: 20,
                }
            ]}>
                {/* Favorites Button */}
                <TouchableOpacity style={styles.appBarButton} onPress={onToggleFavorite}>
                    <View style={styles.circleButton}>
                        <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color="white" />
                    </View>
                    {showLabels && <Text style={{ color: 'white', fontSize: 12, marginTop: 4, fontFamily: 'OpenSans_400Regular' }}>favorite</Text>}
                </TouchableOpacity>

                {/* Share Button */}
                <TouchableOpacity style={styles.appBarButton} onPress={async () => {
                    const url = details.url || `https://www.google.com/maps/search/?api=1&query=${details.lat},${details.lon}&query_place_id=${details.place_id}`;
                    try {
                        await Share.share({
                            message: `${details.display_name}\n${url}`,
                            url: url,
                            title: details.display_name,
                        });
                    } catch (error) {
                        // ignore
                    }
                }}>
                    <View style={styles.circleButton}>
                        <Ionicons name="share-social-outline" size={20} color="white" />
                    </View>
                    {showLabels && <Text style={{ color: 'white', fontSize: 12, marginTop: 4, fontFamily: 'OpenSans_400Regular' }}>share</Text>}
                </TouchableOpacity>

                {/* Expand Toggle */}
                <TouchableOpacity
                    style={{ padding: 10, position: 'absolute', right: 20, bottom: insets.bottom + 15 }}
                    onPress={() => setShowLabels(!showLabels)}
                >
                    <Text style={{ fontSize: 32, color: 'white', lineHeight: 28, fontFamily: 'OpenSans_700Bold' }}>...</Text>
                </TouchableOpacity>
            </Animated.View>
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
        backgroundColor: '#000',
        zIndex: 100,
    },
    pivotHeaderContainer: {
        flexDirection: 'row',
        gap: horizontalScale(20),
        alignItems: 'center',
    },
    pivotHeaderItem: {
        fontSize: normalizeFont(60),
        fontFamily: 'OpenSans_300Light',
        fontWeight: '200',
        lineHeight: normalizeFont(70),
        letterSpacing: -1,
    },
    page: {
        flex: 1,
    },
    appBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1f1f1f',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: horizontalScale(16),
    },
    appBarButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: horizontalScale(64),
        paddingVertical: verticalScale(10),
    },
    circleButton: {
        width: horizontalScale(48),
        height: horizontalScale(48),
        borderRadius: horizontalScale(24),
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
