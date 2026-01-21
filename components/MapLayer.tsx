import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Circle } from 'react-native-svg';
import { horizontalScale } from '../utils/responsive';

// Metro/Here Maps Desaturated Style
// Metro/Here Maps Desaturated Style (User Provided + Business Labels)
const MAP_STYLE = [
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "simplified"
            },
            {
                "hue": "#ff0000"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "labels",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#d0e3b4"
            }
        ]
    },
    {
        "featureType": "landscape.natural.terrain",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "color": "#3275eb"
            }
        ]
    },
    {
        "featureType": "poi.attraction",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi.business",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi.business",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "poi.business",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "poi.government",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi.medical",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi.medical",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#fbd3da"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#bde6ab"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffe15f"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#efd151"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "black"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "transit.line",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "transit.station",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "transit.station.airport",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "transit.station.airport",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#cfb2db"
            }
        ]
    },
    {
        "featureType": "transit.station.bus",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "transit.station.rail",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#a2daf2"
            }
        ]
    }
];

interface MapLayerProps {
    userLocation: { latitude: number; longitude: number; heading?: number | null } | null;
    destination: SearchResult | null;
    results?: SearchResult[];
    route: RouteResult | null;
    mapType?: 'standard' | 'satellite';
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
    initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

export function MapLayer({ userLocation, destination, results = [], route, mapType = 'standard', showLabels = true, showsBuildings = true, showZoomControls = false, showUserLocation = true, onMapPress, onPinPress, cameraTrigger, onRegionChange, cameraMode = 'default', isFollowing = true, onFollowChange, onHeadingChange, initialRegion }: MapLayerProps) {
    // Determine effective map type for Satellite/Hybrid switch
    // User requested "all labels" for satellite, so we force 'hybrid'
    const effectiveMapType = mapType === 'satellite' ? 'hybrid' : 'standard';

    // Toggle Labels for Standard Map
    // We append a rule to hide all labels if showLabels is false
    const effectiveMapStyle = showLabels
        ? MAP_STYLE
        : [...MAP_STYLE, { "elementType": "labels", "stylers": [{ "visibility": "off" }] }];
    // ...
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
            let targetHeading = userLocation.heading || 0;

            // Prioritize Route Bearing if available
            if (route && route.coordinates.length > 1) {
                // Use last known index from trimming logic
                let idx = lastClosestIndex.current || 0;

                // Look ahead further for smoother camera (3-5 points ahead)
                let targetIdx = Math.min(idx + 3, route.coordinates.length - 1);

                const p1 = userLocation;
                const p2 = route.coordinates[targetIdx];

                // If points are very close, look even further ahead for stability
                const distSq = getDistSq(p1, p2);
                if (distSq < 0.0000001 && targetIdx < route.coordinates.length - 3) {
                    targetIdx = Math.min(idx + 5, route.coordinates.length - 1);
                }

                targetHeading = getBearing(p1, route.coordinates[targetIdx]);
            }

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
    const { displayCoordinates, computedSnappedLocation } = React.useMemo(() => {
        if (!route) {
            return { displayCoordinates: [], computedSnappedLocation: null };
        }

        if (cameraMode !== 'navigation' || !userLocation) {
            return { displayCoordinates: route.coordinates, computedSnappedLocation: null };
        }

        // Find closest point on route to user (Vertex)
        let minDistance = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < route.coordinates.length; i++) {
            const p = route.coordinates[i];
            const d = (p.latitude - userLocation.latitude) ** 2 + (p.longitude - userLocation.longitude) ** 2;
            if (d < minDistance) {
                minDistance = d;
                closestIndex = i;
            }
        }

        lastClosestIndex.current = closestIndex;

        // --- SNAPPING CALCULATION ---
        let snapCandidate = route.coordinates[closestIndex];
        let nextIndex = closestIndex; // Default to starting from closest (will verify below)

        // Determine which segment is best and what the "next" index should be
        const segments: { p1: any, p2: any, nextIdx: number }[] = [];

        if (closestIndex > 0) {
            segments.push({
                p1: route.coordinates[closestIndex - 1],
                p2: route.coordinates[closestIndex],
                nextIdx: closestIndex
            });
        }
        if (closestIndex < route.coordinates.length - 1) {
            segments.push({
                p1: route.coordinates[closestIndex],
                p2: route.coordinates[closestIndex + 1],
                nextIdx: closestIndex + 1
            });
        }

        let bestSnapDist = Infinity;

        segments.forEach(seg => {
            const p = getProjectedPoint(userLocation, seg.p1, seg.p2);
            const d = getDistSq(userLocation, p);
            if (d < bestSnapDist) {
                bestSnapDist = d;
                snapCandidate = p;
                nextIndex = seg.nextIdx;
            }
        });

        // Threshold (~30 meters)
        const SNAP_THRESHOLD_SQ = 0.0003 * 0.0003;
        const snapped = bestSnapDist < SNAP_THRESHOLD_SQ ? snapCandidate : null;

        // Trimming (Visual) - start from the NEXT vertex after our snap segment
        const remaining = route.coordinates.slice(nextIndex);
        const coords = snapped ? [snapped, ...remaining] : remaining;

        return { displayCoordinates: coords, computedSnappedLocation: snapped };
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
                onRegionChangeComplete={onRegionChange}
                mapPadding={{ top: insets.top, right: 0, bottom: 80 + insets.bottom, left: 0 }}
                initialRegion={initialRegion}
            >
                {/* Off-Road Connection Line (e.g. from Garage to Street) */}
                {cameraMode === 'navigation' && userLocation && !snappedLocation && displayCoordinates.length > 0 && (
                    <>
                        {/* Casing (White visibility halo) */}
                        <Polyline
                            key="connection-line-casing"
                            coordinates={[userLocation, displayCoordinates[0]]}
                            strokeColor="white"
                            strokeWidth={5}
                            lineDashPattern={[10, 10]}
                            lineCap="square"
                            zIndex={997}
                        />
                        {/* Main Line (Black) */}
                        <Polyline
                            key="connection-line"
                            coordinates={[userLocation, displayCoordinates[0]]}
                            strokeColor="black"
                            strokeWidth={3}
                            lineDashPattern={[10, 10]}
                            lineCap="square"
                            zIndex={998}
                        />
                    </>
                )}

                {/* Route Line - Single Polyline for Performance (OOM Fix) */}
                {route && displayCoordinates.length > 0 && (
                    <Polyline
                        key={`route-line-${displayCoordinates.length}`}
                        coordinates={displayCoordinates}
                        strokeColor="#4A90E2"
                        strokeWidth={horizontalScale(10)}
                        lineCap="round"
                        lineJoin="round"
                        zIndex={995}
                    />
                )}

                {/* Custom Navigation Puck (Green Arrow) */}
                {cameraMode === 'navigation' && userLocation && (
                    <Marker
                        coordinate={snappedLocation || userLocation}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true} // Stays flat on map
                        zIndex={999}
                    >
                        {/* SVG Green Arrow with White Border */}
                        <View style={{
                            width: horizontalScale(40),
                            height: horizontalScale(40),
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: [{ rotate: `${(userLocation.heading || 0)}deg` }]
                        }}>
                            <Svg width={horizontalScale(40)} height={horizontalScale(40)} viewBox="-20 -20 140 140">
                                {/* White Border/Stroke Background */}
                                <Path
                                    d="M50 0 L100 100 L50 80 L0 100 Z"
                                    fill="white"
                                    stroke="white"
                                    strokeWidth="6"
                                    strokeLinejoin="round"
                                />
                                {/* Green Arrow */}
                                <Path
                                    d="M50 8 L92 92 L50 75 L8 92 Z"
                                    fill="#4CC417" // Bright Green
                                />
                            </Svg>
                        </View>
                    </Marker>
                )}
                {/* Re-implement Marker rotation properly below */}


                {/* Render Multiple Results */}
                {results.map((item) => (
                    <Marker
                        key={item.place_id}
                        coordinate={{ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }}
                        title={item.display_name.split(',')[0]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onPinPress(item);
                        }}
                    />
                ))}

                {/* Single Destination (if explicitly set separate from results) */}
                {destination && results.length === 0 && (
                    <Marker
                        coordinate={{ latitude: parseFloat(destination.lat), longitude: parseFloat(destination.lon) }}
                        title={destination.display_name.split(',')[0]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onPinPress(destination);
                        }}
                    />
                )}
            </MapView>

            {/* Zoom Controls */}
            {showZoomControls && (
                <View style={styles.zoomControls}>
                    <TouchableOpacity onPress={() => handleZoom(true)} style={styles.zoomButton}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity onPress={() => handleZoom(false)} style={styles.zoomButton}>
                        <Ionicons name="remove" size={24} color="white" />
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
        right: 20,
        top: '50%',
        marginTop: -50,
        width: 48, // Slightly wider for touch target
        backgroundColor: 'black', // Metro Black
        borderWidth: 2,
        borderColor: 'white', // Metro White border
        alignItems: 'center',
        // No shadow, no radius for Metro look
        zIndex: 50,
    },
    zoomButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomDivider: {
        width: 30,
        height: 2, // Thicker divider
        backgroundColor: 'white',
    }
});
