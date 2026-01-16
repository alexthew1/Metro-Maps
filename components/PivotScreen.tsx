import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image, Linking, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing, SlideInDown, SlideOutDown, useSharedValue, interpolate, Extrapolation } from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { MetroButton } from './MetroButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchResult, api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PivotScreenProps {
    item: SearchResult | null;
    onClose: () => void;
    onGetDirections: () => void;
}

export function PivotScreen({ item, onClose, onGetDirections }: PivotScreenProps) {
    const insets = useSafeAreaInsets();
    const pagerRef = useRef<PagerView>(null);
    const [activePage, setActivePage] = useState(0);
    const scrollOffset = useSharedValue(0);
    const [details, setDetails] = useState<SearchResult | null>(item);

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

    const handlePageScroll = (e: any) => {
        'worklet';
        const { position, offset } = e.nativeEvent;
        scrollOffset.value = position + offset;
    };

    const snapToPage = (index: number) => {
        pagerRef.current?.setPage(index);
        setActivePage(index);
    };

    // Header Animation
    // Shift headers left as we scroll right.
    const headerStyle = useAnimatedStyle(() => {
        // Approximate shift: - (scroll * 150)
        return {
            transform: [{ translateX: -scrollOffset.value * 140 }]
        };
    });

    if (!details) return null;

    return (
        <Animated.View
            entering={SlideInDown.duration(300).easing(Easing.out(Easing.quad))}
            exiting={SlideOutDown.duration(200)}
            style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}
        >
            {/* Background - Black for WP Style */}
            <View style={StyleSheet.absoluteFillObject} />

            {/* Title (Small, Uppercase, Top Left) */}
            <View style={{ paddingHorizontal: 20, marginBottom: 0 }}>
                <Text style={[GlobalStyles.metroSM, { fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: '#fff', fontWeight: 'bold' }]} numberOfLines={1}>
                    {details.display_name.toUpperCase()}
                </Text>
            </View>

            {/* Pivot Headers Container (Masked) */}
            <View style={{ overflow: 'hidden', marginLeft: 20, height: 80, marginBottom: 10 }}>
                <Animated.View style={[styles.pivotHeaderContainer, headerStyle]}>
                    {['about', 'photos', 'reviews'].map((title, index) => {
                        // We can also animate opacity individually if we want, but simple highlight is ok
                        const isActive = activePage === index;
                        return (
                            <TouchableOpacity key={title} onPress={() => snapToPage(index)}>
                                <Text style={[
                                    styles.pivotHeaderItem,
                                    { color: isActive ? '#fff' : '#666' }
                                ]}>
                                    {title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>
            </View>

            {/* Pager Content */}
            <PagerView
                ref={pagerRef}
                style={{ flex: 1 }}
                initialPage={0}
                onPageSelected={handlePageSelection}
                onPageScroll={handlePageScroll}
                pageMargin={20}
            >
                {/* PAGE 1: ABOUT */}
                <View key="1" style={styles.page}>
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
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
                                    <Text style={[GlobalStyles.metroMD, { fontSize: 22 }]}>{details.phone}</Text>
                                </View>
                            )}

                        </View>
                    </ScrollView>
                </View>

                {/* PAGE 2: PHOTOS */}
                <View key="2" style={styles.page}>
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

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
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                        {details.reviews && details.reviews.length > 0 ? (
                            details.reviews.map((review: any, index: number) => (
                                <View key={index} style={{ marginBottom: 32 }}>
                                    <Text style={[GlobalStyles.metroMD, { fontWeight: 'bold', fontSize: 20, marginBottom: 4 }]}>{review.author_name}</Text>
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
        backgroundColor: '#000', // Pitch black
        zIndex: 100,
    },
    pivotHeaderContainer: {
        flexDirection: 'row',
        // paddingLeft: 20, // Now handled by parent margin
        // marginBottom: 10,
        gap: 20,
        // overflow: 'hidden', // Bleed effect
        alignItems: 'center',
    },
    pivotHeaderItem: {
        fontSize: 60, // Massive font
        fontFamily: 'OpenSans_300Light',
        fontWeight: '200',
        lineHeight: 70,
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
        height: 72,
        backgroundColor: '#1f1f1f', // Dark grey app bar
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    appBarButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
        height: '100%',
    },
    circleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
