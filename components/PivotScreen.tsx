import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image, Linking, Platform, Share, Modal, Pressable } from 'react-native';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import Animated, { useAnimatedStyle, withTiming, Easing, SlideInDown, SlideOutDown, useSharedValue, interpolate, Extrapolation, interpolateColor, SharedValue, FadeIn, FadeOut, withSpring, Keyframe } from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { MetroButton } from './MetroButton';
import { LIGHT_MAP_STYLE, DARK_MAP_STYLE } from '../constants/MapStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchResult, api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';

function AnimatedPivotItem({ isActive, title, onPress, colors, getFont, t, onLayout }: {
    isActive: boolean;
    title: string;
    onPress: () => void;
    colors: any;
    getFont: (font: string) => string;
    t: any;
    onLayout: (e: any) => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} onLayout={onLayout}>
            <Text style={[styles.pivotHeaderItem, { color: isActive ? colors.text : colors.textDim, fontFamily: getFont('OpenSans_300Light') }]}>
                {t(title)}
            </Text>
        </TouchableOpacity>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TurnstileEnter = new Keyframe({
    0: {
        transform: [{ perspective: 1000 }, { rotateY: '-90deg' }],
        opacity: 0,
        // @ts-ignore
        easing: Easing.out(Easing.cubic)
    },
    100: {
        transform: [{ perspective: 1000 }, { rotateY: '0deg' }],
        opacity: 1,
    },
});

const TurnstileExit = new Keyframe({
    0: {
        transform: [{ perspective: 1000 }, { rotateY: '0deg' }],
        opacity: 1,
        // @ts-ignore
        easing: Easing.in(Easing.cubic)
    },
    100: {
        transform: [{ perspective: 1000 }, { rotateY: '-90deg' }],
        opacity: 0,
    },
});

function TurnstilePage({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isActive ? 1 : 0.25, { duration: 250 }),
            transform: [
                { perspective: 1000 },
                {
                    rotateY: withTiming(isActive ? '0deg' : '-35deg', {
                        duration: 300,
                        easing: Easing.out(Easing.cubic),
                    })
                },
                {
                    translateX: withTiming(isActive ? 0 : 25, {
                        duration: 300,
                        easing: Easing.out(Easing.cubic),
                    })
                }
            ],
        };
    }, [isActive]);

    return (
        <Animated.View style={[styles.page, animatedStyle]}>
            {children}
        </Animated.View>
    );
}

interface PivotScreenProps {
    item: SearchResult | null;
    onClose: () => void;
    onGetDirections: () => void;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    mapTheme?: 'light' | 'dark';
}

const BAR_HEIGHT = 72;

export function PivotScreen({ item, onClose, onGetDirections, isFavorite, onToggleFavorite, mapTheme = 'light' }: PivotScreenProps) {
    const insets = useSafeAreaInsets();
    const pagerRef = useRef<PagerView>(null);
    const [activePage, setActivePage] = useState(0);
    const [details, setDetails] = useState<SearchResult | null>(item);
    const [showLabels, setShowLabels] = useState(false);
    const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<number | null>(null);
    const [showAddPhotoToast, setShowAddPhotoToast] = useState(false);
    const addPhotoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        if (defaultFont.includes('700Bold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    const handleAddPhotoPress = () => {
        setShowAddPhotoToast(true);
        if (addPhotoTimeoutRef.current) clearTimeout(addPhotoTimeoutRef.current);
        addPhotoTimeoutRef.current = setTimeout(() => {
            setShowAddPhotoToast(false);
        }, 2000);
    };

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

    const [headerWidths, setHeaderWidths] = useState<number[]>([0, 0, 0, 0]);

    // Header Animation - Triggered on page selection for smooth, jitter-free transitions
    const headerOffset = useSharedValue(0);

    useEffect(() => {
        let offset = 0;
        const gap = horizontalScale(20);
        for (let i = 0; i < activePage; i++) {
            offset += (headerWidths[i] || 0) + gap;
        }
        headerOffset.value = withTiming(-offset, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, [activePage, headerWidths]);

    const headerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: headerOffset.value }]
        };
    });

    if (!details) return null;

    return (
        <Animated.View
            entering={TurnstileEnter.duration(250)}
            exiting={TurnstileExit.duration(250)}
            style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: 0, backgroundColor: colors.background }]} // Handle paddingBottom in AppBar
        >
            {/* Background - Black for WP Style */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background }]} />

            {/* Title (Small, Uppercase, Top Left) */}
            <View style={{ paddingHorizontal: 20, marginBottom: 0 }}>
                <Text style={[GlobalStyles.metroSM, { fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: colors.text, fontFamily: getFont('OpenSans_700Bold') }]} numberOfLines={1}>
                    {details.display_name.toUpperCase()}
                </Text>
            </View>

            {/* Pivot Headers Container (Masked) */}
            <View style={{ overflow: 'hidden', marginLeft: 20, height: 80, marginBottom: 10 }}>
                <Animated.View style={[styles.pivotHeaderContainer, headerStyle]}>
                    {['about', 'photos', 'reviews', 'hours'].map((title, index) => (
                        <AnimatedPivotItem
                            key={title}
                            isActive={activePage === index}
                            title={title}
                            onPress={() => snapToPage(index)}
                            colors={colors}
                            getFont={getFont}
                            t={t}
                            onLayout={(e) => {
                                const w = e.nativeEvent.layout.width;
                                setHeaderWidths(prev => {
                                    const next = [...prev];
                                    next[index] = w;
                                    return next;
                                });
                            }}
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
                <View key="1" style={{ flex: 1 }}>
                    <TurnstilePage isActive={activePage === 0}>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            <View style={{ gap: 20 }}>
                                {/* Mini Map */}
                                <View style={{ width: 140, height: 140, backgroundColor: colors.border }}>
                                    <MapView
                                        provider={PROVIDER_GOOGLE}
                                        style={{ flex: 1 }}
                                        customMapStyle={mapTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
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
                                    <Text style={[GlobalStyles.metroLG, { fontSize: 28, marginBottom: 4, fontFamily: getFont('OpenSans_400Regular'), color: colors.text }]}>{t('get directions')}</Text>
                                    <Text style={[GlobalStyles.metroMD, { color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]}>{details.address?.split(',')[0]}</Text>
                                    <Text style={[GlobalStyles.metroMD, { color: colors.accent, fontSize: 16, fontFamily: getFont('OpenSans_400Regular') }]}>{details.address}</Text>
                                </TouchableOpacity>

                                {/* Rating */}
                                {details.rating ? (
                                    <View style={{ marginTop: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                            {[1, 2, 3, 4, 5].map((star) => {
                                                let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';
                                                if (details.rating! >= star - 0.25) iconName = 'star';
                                                else if (details.rating! >= star - 0.75) iconName = 'star-half';
                                                return <Ionicons key={star} name={iconName} size={24} color="#FFD700" style={{ marginRight: 2 }} />;
                                            })}
                                            <Text style={[GlobalStyles.metroMD, { fontSize: 20, marginLeft: 8, color: '#FFD700', fontFamily: getFont('OpenSans_400Regular') }]}>
                                                {details.rating.toFixed(1)}
                                            </Text>
                                        </View>
                                        <Text style={[GlobalStyles.metroSM, { fontSize: 16, color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>
                                            {details.user_ratings_total} {t('reviews')}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Description (Real) */}
                                {details.description ? (
                                    <Text style={[GlobalStyles.metroMD, { fontSize: 20, lineHeight: 28, color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>
                                        {details.description}
                                    </Text>
                                ) : null}

                                {/* Phone */}
                                {details.phone && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('PHONE')}</Text>
                                        <Text style={[GlobalStyles.metroMD, { fontSize: 22, color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]} onPress={() => Linking.openURL(`tel:${details.phone}`)}>{details.phone}</Text>
                                    </View>
                                )}

                                {/* Website */}
                                {details.website && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('WEBSITE')}</Text>
                                        <Text style={[GlobalStyles.metroMD, { fontSize: 22, color: colors.accent, fontFamily: getFont('OpenSans_400Regular') }]} onPress={() => Linking.openURL(details.website!)}>{t('visit website')}</Text>
                                    </View>
                                )}

                            </View>
                        </ScrollView>
                    </TurnstilePage>
                </View>

                {/* PAGE 2: PHOTOS */}
                <View key="2" style={{ flex: 1 }}>
                    <TurnstilePage isActive={activePage === 1}>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>

                            {/* "add a photo" button */}
                            <View style={{ marginBottom: 20 }}>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={handleAddPhotoPress}>
                                    <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.text, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                        <Ionicons name="add" size={24} color={colors.text} />
                                    </View>
                                    <Text style={[GlobalStyles.metroMD, { fontSize: 24, color: colors.text, fontFamily: getFont('OpenSans_400Regular') }]}>{t('add a photo')}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 4-Column Grid */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                {details.photos && details.photos.length > 0 ? (
                                    details.photos.map((photo: any, index: number) => (
                                        <TouchableOpacity key={index} style={{ width: '23.5%', aspectRatio: 1, backgroundColor: colors.border }} onPress={() => setFullScreenPhotoIndex(index)}>
                                            <Image
                                                source={{ uri: api.getPhotoUrl(photo.photo_reference, 200) }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={[GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('No photos available.')}</Text>
                                )}
                            </View>
                        </ScrollView>

                        {/* Centered Toast */}
                        {showAddPhotoToast && (
                            <Animated.View entering={FadeIn} exiting={FadeOut} style={{ position: 'absolute', alignSelf: 'center', top: '40%', backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, zIndex: 50 }}>
                                <Text style={[GlobalStyles.metroSM, { color: colors.white, fontFamily: getFont('OpenSans_700Bold'), fontSize: 16 }]}>{t('not yet implemented')}</Text>
                            </Animated.View>
                        )}
                    </TurnstilePage>
                </View>

                {/* PAGE 3: REVIEWS */}
                <View key="3" style={{ flex: 1 }}>
                    <TurnstilePage isActive={activePage === 2}>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {details.reviews && details.reviews.length > 0 ? (
                                details.reviews.map((review: any, index: number) => (
                                    <View key={index} style={{ marginBottom: 32 }}>
                                        <Text style={[GlobalStyles.metroMD, { fontFamily: getFont('OpenSans_700Bold'), fontSize: 20, marginBottom: 4, color: colors.text }]}>{review.author_name}</Text>
                                        <Text style={[GlobalStyles.metroMD, { color: colors.accent, marginBottom: 8, fontFamily: getFont('OpenSans_400Regular') }]}>{review.rating}/5 {t('rating')}</Text>
                                        <Text style={[GlobalStyles.metroSM, { opacity: 0.9, lineHeight: 22, fontSize: 16, color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{review.text}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={[GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('No reviews available.')}</Text>
                            )}
                        </ScrollView>
                    </TurnstilePage>
                </View>

                {/* PAGE 4: HOURS */}
                <View key="4" style={{ flex: 1 }}>
                    <TurnstilePage isActive={activePage === 3}>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {details.opening_hours && details.opening_hours.length > 0 ? (
                                details.opening_hours.map((hourStr: string, index: number) => {
                                    const [day, ...timeParts] = hourStr.split(': ');
                                    const time = timeParts.join(': ');
                                    return (
                                        <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                                            <Text style={[GlobalStyles.metroMD, { fontSize: 18, color: colors.text, fontFamily: getFont('OpenSans_700Bold') }]}>{day}</Text>
                                            <Text style={[GlobalStyles.metroMD, { fontSize: 18, color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{time}</Text>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={[GlobalStyles.dimText, { color: colors.textDim, fontFamily: getFont('OpenSans_400Regular') }]}>{t('No hours available.')}</Text>
                            )}
                        </ScrollView>
                    </TurnstilePage>
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
                    backgroundColor: colors.appBarBg,
                }
            ]}>
                {/* Favorites Button */}
                <PivotAppBarButton
                    onPress={onToggleFavorite}
                    label={t('favorite')}
                    showLabels={showLabels}
                    colors={colors}
                    getFont={getFont}
                >
                    <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={colors.text} />
                </PivotAppBarButton>

                {/* Share Button */}
                <PivotAppBarButton
                    onPress={async () => {
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
                    }}
                    label={t('share')}
                    showLabels={showLabels}
                    colors={colors}
                    getFont={getFont}
                >
                    <Ionicons name="share-social-outline" size={20} color={colors.text} />
                </PivotAppBarButton>

                {/* Expand Toggle */}
                <TouchableOpacity
                    style={{ padding: 10, position: 'absolute', right: 20, bottom: insets.bottom + 15 }}
                    onPress={() => setShowLabels(!showLabels)}
                >
                    <Text style={{ fontSize: 32, color: colors.text, lineHeight: 28, fontFamily: getFont('OpenSans_700Bold') }}>...</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Full Screen Image Viewer */}
            <Modal visible={fullScreenPhotoIndex !== null} transparent={true} animationType="fade" onRequestClose={() => setFullScreenPhotoIndex(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                    {fullScreenPhotoIndex !== null && details?.photos && (
                        <>
                            <Image
                                source={{ uri: api.getPhotoUrl(details.photos[fullScreenPhotoIndex].photo_reference, 800) }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="contain"
                            />
                            {/* Close button */}
                            <TouchableOpacity style={{ position: 'absolute', top: insets.top + 20, right: 20, zIndex: 10 }} onPress={() => setFullScreenPhotoIndex(null)}>
                                <View style={[styles.circleButton, { borderColor: colors.white }]}>
                                    <Ionicons name="close" size={24} color={colors.white} />
                                </View>
                            </TouchableOpacity>

                            {/* Left Arrow */}
                            {fullScreenPhotoIndex > 0 && (
                                <TouchableOpacity style={{ position: 'absolute', left: 20, top: '50%', transform: [{ translateY: -24 }], zIndex: 10 }} onPress={() => setFullScreenPhotoIndex(fullScreenPhotoIndex - 1)}>
                                    <View style={[styles.circleButton, { borderColor: colors.white }]}>
                                        <Ionicons name="chevron-back" size={24} color={colors.white} />
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Right Arrow */}
                            {fullScreenPhotoIndex < details.photos.length - 1 && (
                                <TouchableOpacity style={{ position: 'absolute', right: 20, top: '50%', transform: [{ translateY: -24 }], zIndex: 10 }} onPress={() => setFullScreenPhotoIndex(fullScreenPhotoIndex + 1)}>
                                    <View style={[styles.circleButton, { borderColor: colors.white }]}>
                                        <Ionicons name="chevron-forward" size={24} color={colors.white} />
                                    </View>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </Modal>
        </Animated.View>
    );
}

const METRO_EASING = Easing.bezier(0.1, 0.9, 0.2, 1);

function PivotAppBarButton({ children, onPress, label, showLabels, colors, getFont }: { children: React.ReactNode; onPress: () => void; label: string, showLabels: boolean, colors: any, getFont: (f: string) => string }) {
    const [isPressed, setIsPressed] = useState(false);
    const scale = useSharedValue(1);
    const rotateXVal = useSharedValue(0);
    const rotateYVal = useSharedValue(0);
    const translateYVal = useSharedValue(0);
    const buttonWidth = useSharedValue(48);
    const buttonHeight = useSharedValue(48);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { perspective: 800 },
                { translateY: translateYVal.value },
                { scale: scale.value },
                { rotateX: `${rotateXVal.value}deg` },
                { rotateY: `${rotateYVal.value}deg` }
            ]
        };
    });

    const updateTilt = (locX: number, locY: number, duration: number = 60) => {
        const w = buttonWidth.value || 48;
        const h = buttonHeight.value || 48;
        const normalizedX = Math.max(-1.2, Math.min(1.2, (locX / w) * 2 - 1));
        const normalizedY = Math.max(-1.2, Math.min(1.2, (locY / h) * 2 - 1));
        const maxRotate = 12; // Subtler tilt for natural feel

        rotateXVal.value = withTiming(-normalizedY * maxRotate, { duration, easing: METRO_EASING });
        rotateYVal.value = withTiming(normalizedX * maxRotate, { duration, easing: METRO_EASING });
    };

    const handlePressIn = (e: any) => {
        setIsPressed(true);
        updateTilt(e.nativeEvent.locationX, e.nativeEvent.locationY, 100);
        scale.value = withTiming(0.92, { duration: 100, easing: METRO_EASING });
        translateYVal.value = withSpring(-2, { mass: 1, damping: 12, stiffness: 200 });
    };

    const handleTouchMove = (e: any) => {
        updateTilt(e.nativeEvent.locationX, e.nativeEvent.locationY, 50);
    };

    const handlePressOut = () => {
        setIsPressed(false);
        rotateXVal.value = withTiming(0, { duration: 150, easing: METRO_EASING });
        rotateYVal.value = withTiming(0, { duration: 150, easing: METRO_EASING });
        scale.value = withTiming(1, { duration: 150, easing: METRO_EASING });
        translateYVal.value = withSpring(0, { mass: 1, damping: 12, stiffness: 200 });
    };

    const handleLayout = (e: any) => {
        buttonWidth.value = e.nativeEvent.layout.width;
        buttonHeight.value = e.nativeEvent.layout.height;
    };

    return (
        <Pressable 
            onPress={onPress} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onTouchMove={handleTouchMove}
            style={styles.appBarButton}
        >
            <Animated.View 
                onLayout={handleLayout}
                style={[
                    styles.circleButton, 
                    animatedStyle,
                    { 
                        borderColor: colors.text,
                        backgroundColor: isPressed ? colors.accent : 'transparent'
                    }
                ]}
            >
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            color: colors.text
                        });
                    }
                    return child;
                })}
            </Animated.View>
            {showLabels && <Text style={{ color: colors.text, fontSize: 12, marginTop: 4, fontFamily: getFont('OpenSans_400Regular') }}>{label}</Text>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 100,
    },
    pivotHeaderContainer: {
        flexDirection: 'row',
        gap: horizontalScale(20),
        alignItems: 'center',
    },
    pivotHeaderItem: {
        fontSize: normalizeFont(60),
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
        alignItems: 'center',
        justifyContent: 'center',
    }
});
