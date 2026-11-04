import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { horizontalScale } from '../utils/responsive';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomFont } from '../contexts/FontContext';

import { LIGHT_MAP_STYLE, DARK_MAP_STYLE } from '../constants/MapStyles';

export interface MapLayerProps {
    userLocation: { latitude: number; longitude: number; heading?: number | null } | null;
    destination: SearchResult | null;
    results?: SearchResult[];
    favorites?: SearchResult[];
    routes?: RouteResult[];
    selectedRouteIndex?: number;
    onSelectRoute?: (index: number) => void;
    mapType?: 'standard' | 'satellite';
    mapTheme?: 'light' | 'dark';
    onMapPress: () => void;
    onPinPress: (item?: SearchResult) => void;
    onRegionChange?: (region: any) => void;
    cameraMode?: 'default' | 'navigation';
    cameraTrigger?: number;
    isFollowing?: boolean;
    onFollowChange?: (following: boolean) => void;
    onHeadingChange?: (heading: number) => void;
    showLabels?: boolean;
    showsBuildings?: boolean;
    showZoomControls?: boolean;
    showUserLocation?: boolean;
    useMiles?: boolean;
    initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

export function MapLayer({ userLocation, destination, results = [], routes = [], selectedRouteIndex = 0, onSelectRoute, mapType = 'standard', mapTheme = 'light', showLabels = true, showsBuildings = true, showZoomControls = false, showUserLocation = true, useMiles = true, onMapPress, onPinPress, cameraTrigger, onRegionChange, cameraMode = 'default', isFollowing = true, onFollowChange, onHeadingChange, initialRegion }: MapLayerProps) {
    const route = routes[selectedRouteIndex] || null;
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        if (defaultFont.includes('700Bold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    // Route path processing

    // Determine effective map type for Satellite/Hybrid switch
    // User requested "all labels" for satellite, so we force 'hybrid'
    const effectiveMapType = mapType === 'satellite' ? 'hybrid' : 'standard';

    const currentMapStyle = mapTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

    // Toggle Labels for Standard Map
    // We append a rule to hide all labels if showLabels is false
    const effectiveMapStyle = showLabels
        ? currentMapStyle
        : [...currentMapStyle, { "elementType": "labels", "stylers": [{ "visibility": "off" }] }];

    // Camera Change Handler
    const handleRegionChange = (region: any, details?: any) => {
        onRegionChange?.(region);
        // Unfortunately standard Region doesn't give heading.
        // We rely on simple panning for now, but for heading we need explicit camera events if supported.
        // Or we assume standard map is North Up unless user twists.
    };

    const mapRef = useRef<MapView>(null);
    const insets = useSafeAreaInsets();
    const hasCenteredOnUser = useRef(false);

    // Initial Center on User (on startup only)
    // Initial Center on User (on startup only) - Skip if we have a persisted initialRegion
    useEffect(() => {
        if (initialRegion) {
            // If we have a stored region, consider us "centered" already so we don't jump to user location
            if (!hasCenteredOnUser.current) hasCenteredOnUser.current = true;
        } else if (userLocation && !hasCenteredOnUser.current && !destination && results.length === 0 && !route) {
            hasCenteredOnUser.current = true;
            mapRef.current?.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }
    }, [userLocation, initialRegion]);

    // Camera Control: Navigation Follow
    useEffect(() => {
        if (!mapRef.current) return;

        // Active Navigation Mode: Follow user with tilt (ONLY if isFollowing is true)
        if (cameraMode === 'navigation' && userLocation && isFollowing) {
            // The camera should simply follow the user's actual heading so it stays directly behind the dot.
            // (Removed route look-ahead bearing to ensure it perfectly matches the dot's current direction)
            let targetHeading = userLocation.heading || 0;

            mapRef.current.animateCamera({
                center: userLocation,
                pitch: 65,          // Steeper tilt for better 3D effect
                heading: targetHeading,
                zoom: 19,           // Higher zoom for street-level detail
                altitude: 150,      // Lower altitude for closer view
            }, { duration: 500 }); // Faster, smoother updates
            return;
        }
    }, [userLocation, cameraMode, isFollowing, route]);

    // Camera Control: Overview (Route/Results/Dest) - Only if NOT navigating
    useEffect(() => {
        if (!mapRef.current || cameraMode === 'navigation') return;

        // Priority: Route > Results > Destination
        if (route && route.coordinates.length > 0) {
            // Use Google Directions bounds if available for accurate centering
            if (route.bounds) {
                const { northeast, southwest } = route.bounds;
                mapRef.current.fitToCoordinates(
                    [
                        { latitude: northeast.lat, longitude: northeast.lng },
                        { latitude: southwest.lat, longitude: southwest.lng },
                    ],
                    {
                        edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
                        animated: true,
                    }
                );
            } else {
                // Fallback to fitting all coordinates
                mapRef.current.fitToCoordinates(route.coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
                    animated: true,
                });
            }
            return;
        }

        if (results.length > 0) {
            const markers = results.map(r => ({ latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) }));
            mapRef.current.fitToCoordinates(markers, {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
            });
            return;
        }

        if (destination) {
            const destLat = parseFloat(destination.lat);
            const destLon = parseFloat(destination.lon);
            const markers = [{ latitude: destLat, longitude: destLon }];

            // Intelligent Zoom: Include User if close enough (<~100km)
            let includeUser = false;
            if (userLocation) {
                const latDiff = Math.abs(userLocation.latitude - destLat);
                const lonDiff = Math.abs(userLocation.longitude - destLon);
                if (latDiff < 1 && lonDiff < 1) {
                    includeUser = true;
                    markers.push(userLocation);
                }
            }

            if (includeUser) {
                mapRef.current.fitToCoordinates(markers, {
                    edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
                    animated: true,
                });
            } else {
                mapRef.current.animateToRegion({
                    latitude: destLat,
                    longitude: destLon,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            }
        }
    }, [destination, route, results, cameraMode]);

    // Separate Effect for Manual Locate Me Trigger
    useEffect(() => {
        if (!mapRef.current || !userLocation || cameraTrigger === 0) return;

        mapRef.current.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 1000);
    }, [cameraTrigger]);

    // Snapping Logic state
    const [snappedLocation, setSnappedLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // Route Trimming Logic refs
    const lastClosestIndex = useRef(0);
    const lastRouteId = useRef<string | null>(null);

    // Reset progress when route changes (and Snapping)
    useEffect(() => {
        if (route?.geometry !== lastRouteId.current) {
            lastClosestIndex.current = 0;
            lastRouteId.current = route?.geometry || null;
            setSnappedLocation(null);
        }
    }, [route]);

    // Route Trimming & Snapping Logic - Use useMemo for instant updates
    const { displayCoordinates, computedSnappedLocation, trimmedIndex } = React.useMemo(() => {
        if (!route) {
            return { displayCoordinates: [], computedSnappedLocation: null, trimmedIndex: 0 };
        }

        if (cameraMode !== 'navigation' || !userLocation) {
            return { displayCoordinates: route.coordinates, computedSnappedLocation: null, trimmedIndex: 0 };
        }

        // Find closest SEGMENT on route to user (Projection-based)
        // This is mathematically superior to vertex-distance because it correctly identifies the road 
        // even on wide turns with dense corner nodes.
        const searchStart = lastClosestIndex.current;
        const searchEnd = Math.min(route.coordinates.length - 1, lastClosestIndex.current + 50);

        let bestSnapDist = Infinity;
        let snapCandidate = route.coordinates[lastClosestIndex.current];
        let nextIndex = lastClosestIndex.current;
        let bestSegmentStartIdx = lastClosestIndex.current;

        for (let i = searchStart; i < searchEnd; i++) {
            const p1 = route.coordinates[i];
            const p2 = route.coordinates[i + 1];
            const proj = getProjectedPoint(userLocation, p1, p2);
            const d = getDistSq(userLocation, proj);
            if (d < bestSnapDist) {
                bestSnapDist = d;
                snapCandidate = proj;
                nextIndex = i + 1;
                bestSegmentStartIdx = i;
            }
        }

        // Failsafe if user teleported or GPS drifted massively (approx 3km)
        if (bestSnapDist > 0.001) { 
            for (let i = 0; i < route.coordinates.length - 1; i++) {
                const p1 = route.coordinates[i];
                const p2 = route.coordinates[i + 1];
                const proj = getProjectedPoint(userLocation, p1, p2);
                const d = getDistSq(userLocation, proj);
                if (d < bestSnapDist) {
                    bestSnapDist = d;
                    snapCandidate = proj;
                    nextIndex = i + 1;
                    bestSegmentStartIdx = i;
                }
            }
        }

        lastClosestIndex.current = bestSegmentStartIdx;

        // Increase threshold to ~200 meters to ensure it doesn't drop the snapped point 
        // when taking wide turns or when GPS drifts at an intersection.
        const SNAP_THRESHOLD_SQ = 0.002 * 0.002;
        const snapped = bestSnapDist < SNAP_THRESHOLD_SQ ? snapCandidate : null;

        // Trimming (Visual) - Update continuously (every frame) using the snapped point.
        // Because 'snapped' is mathematically collinear with the road segment, inserting it
        // perfectly preserves the road geometry without 'cutting corners' like raw GPS does.
        let coords;
        if (snapped) {
            const remaining = route.coordinates.slice(nextIndex);
            coords = [snapped, ...remaining];
        } else {
            coords = route.coordinates.slice(Math.max(0, bestSegmentStartIdx));
        }

        return { displayCoordinates: coords, computedSnappedLocation: snapped, trimmedIndex: bestSegmentStartIdx };
    }, [route, userLocation, cameraMode]);

    // Update snappedLocation state from memo (for puck rendering)
    useEffect(() => {
        setSnappedLocation(computedSnappedLocation);
    }, [computedSnappedLocation]);

    const handleZoom = async (zoomIn: boolean) => {
        if (!mapRef.current) return;
        const camera = await mapRef.current.getCamera();
        const currentZoom = camera.zoom || 15; // Default fallback
        const newZoom = zoomIn ? currentZoom + 1 : currentZoom - 1;

        mapRef.current.animateCamera({
            zoom: newZoom
        }, { duration: 300 });
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={effectiveMapStyle}
                mapType={effectiveMapType}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={showUserLocation && cameraMode !== 'navigation'} // Hide default blue dot in nav or if disabled
                showsMyLocationButton={false}
                showsCompass={false}
                showsBuildings={showsBuildings}
                showsIndoors={true}
                pitchEnabled={true}
                rotateEnabled={true}
                onPanDrag={() => onFollowChange?.(false)}
                onPress={onMapPress}
                onPoiClick={(e) => {
                    e.stopPropagation();
                    const poi = e.nativeEvent;
                    const pseudoResult: SearchResult = {
                        place_id: poi.placeId || Date.now().toString(),
                        lat: poi.coordinate.latitude.toString(),
                        lon: poi.coordinate.longitude.toString(),
                        display_name: poi.name,
                        type: 'poi',
                    };
                    onPinPress(pseudoResult);
                }}
                onRegionChange={(region) => {
                    onRegionChange?.(region);
                    if (onHeadingChange && mapRef.current) {
                        mapRef.current.getCamera().then(cam => onHeadingChange(cam.heading));
                    }
                }}
                onRegionChangeComplete={(region) => {
                    onRegionChange?.(region);
                }}
                mapPadding={{ top: insets.top, right: 0, bottom: 80 + insets.bottom, left: 0 }}
                initialRegion={initialRegion}
            >

                {/* Route Polylines */}
                {routes.map((r, i) => {
                    const isSelected = i === selectedRouteIndex;
                    // Stagger the labels so they don't overlap if routes share the exact same path
                    const fractions = [0.5, 0.45, 0.55];
                    const fraction = fractions[i % fractions.length];
                    const midpointIndex = Math.floor(r.coordinates.length * fraction);
                    const midpoint = r.coordinates[midpointIndex];
                    if (!midpoint) return null;
                    
                    const rDur = Math.round(r.duration / 60);
                    const timeDisplay = rDur >= 60 ? `${Math.floor(rDur/60)}H ${rDur%60}M` : `${rDur} MIN`;
                    const distDisplay = useMiles ? `${(r.distance / 1609.34).toFixed(1)} mi` : `${(r.distance / 1000).toFixed(1)} km`;

                    return (
                        <React.Fragment key={`route-group-${i}-${r.geometry.substring(0, 10)}`}>
                            {!isSelected && (
                                <Polyline
                                    coordinates={r.coordinates}
                                    strokeColor="#666666" // Dark gray
                                    strokeWidth={4}
                                    lineCap="round"
                                    lineJoin="round"
                                    zIndex={900}
                                    tappable={true}
                                    onPress={() => onSelectRoute?.(i)}
                                />
                            )}
                        </React.Fragment>
                    );
                })}

                {/* Route Line - Transit or Multi-color for traffic */}
                {route && displayCoordinates.length > 1 && (
                    <>
                        {(() => {
                            if (route.travelMode === 'transit') {
                                const transitColor = (route.transitLines && route.transitLines[0]?.color) || '#0085d0';
                                return (
                                    <Polyline
                                        key={`route-transit-${route.geometry}`}
                                        coordinates={displayCoordinates}
                                        strokeColor={transitColor}
                                        strokeWidth={6}
                                        lineCap="round"
                                        lineJoin="round"
                                        zIndex={995}
                                    />
                                );
                            }

                            if (!route.speedReadingIntervals || route.speedReadingIntervals.length === 0) {
                                return (
                                    <Polyline
                                        key={`route-line-${route.geometry}`}
                                        coordinates={displayCoordinates}
                                        strokeColor="#4A90E2"
                                        strokeWidth={5}
                                        lineCap="round"
                                        lineJoin="round"
                                        zIndex={995}
                                    />
                                );
                            }

                            return route.speedReadingIntervals.map((interval, index) => {
                                const adjustedStart = interval.startPolylinePointIndex - trimmedIndex;
                                const adjustedEnd = interval.endPolylinePointIndex - trimmedIndex;
                                
                                if (adjustedEnd <= 0) return null;
                                
                                const renderStart = Math.max(0, adjustedStart);
                                // Include end point to connect lines without gaps
                                const segmentCoords = displayCoordinates.slice(renderStart, adjustedEnd + 1);
                                
                                if (segmentCoords.length < 2) return null;

                                let color = "#4A90E2"; // NORMAL
                                if (interval.speed === 'SLOW') color = "#F5A623";
                                else if (interval.speed === 'TRAFFIC_JAM') color = "#D0021B";

                                return (
                                    <Polyline
                                        key={`route-segment-${index}`}
                                        coordinates={segmentCoords}
                                        strokeColor={color}
                                        strokeWidth={5}
                                        lineCap="round"
                                        lineJoin="round"
                                        zIndex={995}
                                    />
                                );
                            });
                        })()}
                    </>
                )}

                {/* Custom Navigation Puck (Static PNG - bypasses Android bitmap clipping) */}
                {cameraMode === 'navigation' && userLocation && (
                    <Marker
                        coordinate={userLocation}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true}
                        rotation={userLocation.heading || 0}
                        zIndex={999}
                        image={require('../assets/images/nav-puck.png')}
                        tracksViewChanges={false}
                    />
                )}

                {/* Render Multiple Results as Simple Pins */}
                {results.map((item) => {
                    const isSelected = destination?.place_id === item.place_id;
                    return (
                        <Marker
                            key={item.place_id}
                            coordinate={{ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }}
                            onPress={(e) => {
                                e.stopPropagation();
                                onPinPress(item);
                            }}
                            anchor={{ x: 0.5, y: 1 }}
                            zIndex={isSelected ? 100 : 10}
                        >
                            <MetroMapMarker
                                item={item}
                                isSelected={isSelected}
                            />
                        </Marker>
                    );
                })}

                {/* Single Destination Marker (if not in results) */}
                {destination && !results.some(r => r.place_id === destination.place_id) && (
                    <Marker
                        coordinate={{ latitude: parseFloat(destination.lat), longitude: parseFloat(destination.lon) }}
                        onPress={(e) => {
                            e.stopPropagation();
                            onPinPress(destination);
                        }}
                        zIndex={100}
                    />
                )}
            </MapView>

            {/* Zoom Controls (Distinct Metro Circular Buttons) */}
            {showZoomControls && (
                <View style={styles.zoomControls}>
                    <TouchableOpacity
                        onPress={() => handleZoom(true)}
                        activeOpacity={0.7}
                        style={[
                            styles.zoomButton,
                            {
                                backgroundColor: 'transparent',
                                borderColor: mapTheme === 'dark' ? '#ffffff' : '#000000',
                            }
                        ]}
                    >
                        <Ionicons name="add" size={26} color={mapTheme === 'dark' ? '#ffffff' : '#000000'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleZoom(false)}
                        activeOpacity={0.7}
                        style={[
                            styles.zoomButton,
                            {
                                backgroundColor: 'transparent',
                                borderColor: mapTheme === 'dark' ? '#ffffff' : '#000000',
                            }
                        ]}
                    >
                        <Ionicons name="remove" size={26} color={mapTheme === 'dark' ? '#ffffff' : '#000000'} />
                    </TouchableOpacity>
                </View>
            )}

        </View>
    );
}

// Math Helpers
function getBearing(p1: { latitude: number; longitude: number }, p2: { latitude: number; longitude: number }) {
    const φ1 = p1.latitude * Math.PI / 180;
    const φ2 = p2.latitude * Math.PI / 180;
    const Δλ = (p2.longitude - p1.longitude) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
}

function getProjectedPoint(p: { latitude: number; longitude: number }, v: { latitude: number; longitude: number }, w: { latitude: number; longitude: number }) {
    // ... existing getProjectedPoint ...
    // Project p onto line segment vw
    const l2 = getDistSq(v, w);
    if (l2 === 0) return v;
    let t = ((p.latitude - v.latitude) * (w.latitude - v.latitude) + (p.longitude - v.longitude) * (w.longitude - v.longitude)) / l2;
    t = Math.max(0, Math.min(1, t));
    return {
        latitude: v.latitude + t * (w.latitude - v.latitude),
        longitude: v.longitude + t * (w.longitude - v.longitude)
    };
}

function getDistSq(p1: { latitude: number; longitude: number }, p2: { latitude: number; longitude: number }) {
    return (p1.latitude - p2.latitude) ** 2 + (p1.longitude - p2.longitude) ** 2;
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    pinContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 40,
        height: 48,
    },
    pinHead: {
        width: 26,
        height: 26,
        backgroundColor: Colors.accent,
        borderWidth: 3,
        borderColor: 'white',
        borderRadius: 13,
        zIndex: 2,
    },
    pinTail: {
        width: 4,
        height: 16,
        backgroundColor: 'white',
        marginTop: -2,
        zIndex: 1,
    },
    zoomControls: {
        position: 'absolute',
        right: 18,
        top: '50%',
        marginTop: -56,
        gap: 12,
        alignItems: 'center',
        zIndex: 50,
    },
    zoomButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// Category Icon Resolver matching Windows Phone HERE Transit / Maps glyphs
function getPlaceIconName(item: SearchResult): keyof typeof Ionicons.glyphMap {
    const typeStr = ((item.type || '') + ' ' + (item.types?.join(' ') || '') + ' ' + item.display_name).toLowerCase();
    if (typeStr.includes('train') || typeStr.includes('subway') || typeStr.includes('rail') || typeStr.includes('metro') || typeStr.includes('station')) return 'train';
    if (typeStr.includes('bus')) return 'bus';
    if (typeStr.includes('airport') || typeStr.includes('plane') || typeStr.includes('flight')) return 'airplane';
    if (typeStr.includes('food') || typeStr.includes('restaurant') || typeStr.includes('cafe') || typeStr.includes('bakery') || typeStr.includes('dining')) return 'restaurant';
    if (typeStr.includes('shop') || typeStr.includes('store') || typeStr.includes('mall') || typeStr.includes('market') || typeStr.includes('grocery')) return 'cart';
    if (typeStr.includes('hotel') || typeStr.includes('lodging') || typeStr.includes('motel')) return 'bed';
    if (typeStr.includes('park') || typeStr.includes('garden')) return 'leaf';
    if (typeStr.includes('hospital') || typeStr.includes('doctor') || typeStr.includes('health') || typeStr.includes('pharmacy')) return 'medkit';
    if (typeStr.includes('church') || typeStr.includes('worship')) return 'business';
    return 'location';
}

function formatDistance(lat1: number, lon1: number, lat2: number, lon2: number, useMiles: boolean): string {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = R * c;

    if (useMiles) {
        const feet = distMeters * 3.28084;
        if (feet < 1000) {
            return `${Math.round(feet)} ft`;
        }
        const miles = distMeters / 1609.34;
        return `${miles.toFixed(1)} mi`;
    } else {
        if (distMeters < 1000) {
            return `${Math.round(distMeters)} m`;
        }
        const km = distMeters / 1000;
        return `${km.toFixed(1)} km`;
    }
}

function MetroMapMarker({
    item,
    isSelected,
}: {
    item: SearchResult;
    isSelected: boolean;
}) {
    const iconName = getPlaceIconName(item);
    const pinColor = isSelected ? '#0078d7' : '#0085d0';
    const pinScale = isSelected ? 1.15 : 1.0;

    return (
        <View style={[markerStyles.pinWrapper, { transform: [{ scale: pinScale }] }]}>
            <View style={{ width: 32, height: 40, alignItems: 'center' }}>
                <Svg width="32" height="40" viewBox="0 0 32 40">
                    <Path
                        d="M 16,38 C 12,29 1,22 1,16 A 15,15 0 1,1 31,16 C 31,22 20,29 16,38 Z"
                        fill={pinColor}
                    />
                </Svg>
                <View style={markerStyles.pinIconContainer}>
                    <Ionicons name={iconName} size={16} color="#ffffff" />
                </View>
            </View>
            <View style={markerStyles.groundShadow} />
        </View>
    );
}

const markerStyles = StyleSheet.create({
    pinWrapper: {
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    pinIconContainer: {
        position: 'absolute',
        top: 4,
        left: 4,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groundShadow: {
        width: 14,
        height: 5,
        borderRadius: 7,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        marginTop: 1,
    },
});
