import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Metro/Here Maps Desaturated Style
// Metro/Here Maps Desaturated Style (User Provided + Business Labels)
const MAP_STYLE = [
    {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#6195a0"
            }
        ]
    },
    {
        "featureType": "administrative.province",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "color": "#888888"
            },
            {
                "weight": 1.5
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": "0"
            },
            {
                "saturation": "0"
            },
            {
                "color": "#f5f5f2"
            },
            {
                "gamma": "1"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "all",
        "stylers": [
            {
                "lightness": "-3"
            },
            {
                "gamma": "1.00"
            }
        ]
    },
    {
        "featureType": "landscape.natural.terrain",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    // MODIFIED: Enable POI Labels (specifically Business)
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
        "featureType": "poi.business",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#bae5ce"
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "saturation": -100
            },
            {
                "lightness": 45
            },
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#fac9a9"
            },
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text",
        "stylers": [
            {
                "color": "#4e4e4e"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#787878"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "transit.station.airport",
        "elementType": "labels.icon",
        "stylers": [
            {
                "hue": "#0a00ff"
            },
            {
                "saturation": "-77"
            },
            {
                "gamma": "0.57"
            },
            {
                "lightness": "0"
            }
        ]
    },
    {
        "featureType": "transit.station.rail",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#43321e"
            }
        ]
    },
    {
        "featureType": "transit.station.rail",
        "elementType": "labels.icon",
        "stylers": [
            {
                "hue": "#ff6c00"
            },
            {
                "lightness": "4"
            },
            {
                "gamma": "0.75"
            },
            {
                "saturation": "-68"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "color": "#eaf6f8"
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#c7eced"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "lightness": "-49"
            },
            {
                "saturation": "-53"
            },
            {
                "gamma": "0.79"
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
}

export function MapLayer({ userLocation, destination, results = [], route, mapType = 'standard', showLabels = true, onMapPress, onPinPress, cameraTrigger, onRegionChange, cameraMode = 'default', isFollowing = true, onFollowChange, onHeadingChange }: MapLayerProps) {
    // Determine effective map type for Satellite/Hybrid switch
    const effectiveMapType = mapType === 'satellite'
        ? (showLabels ? 'hybrid' : 'satellite')
        : 'standard';

    // Toggle Labels for Standard Map
    // We append a rule to hide all labels if showLabels is false
    const effectiveMapStyle = mapType === 'standard'
        ? (showLabels ? MAP_STYLE : [...MAP_STYLE, { "elementType": "labels", "stylers": [{ "visibility": "off" }] }])
        : [];
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
    useEffect(() => {
        if (userLocation && !hasCenteredOnUser.current && !destination && results.length === 0 && !route) {
            hasCenteredOnUser.current = true;
            mapRef.current?.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }
    }, [userLocation]);

    // Camera Control: Navigation Follow
    useEffect(() => {
        if (!mapRef.current) return;

        // Active Navigation Mode: Follow user with tilt (ONLY if isFollowing is true)
        if (cameraMode === 'navigation' && userLocation && isFollowing) {
            let targetHeading = userLocation.heading || 0;

            // Prioritize Route Bearing if available
            if (route && route.coordinates.length > 1) {
                // Use last known index from trimming logic (Using the Ref since it's updated in the other effect)
                // Note: lastClosestIndex might lag slightly behind visual update but is safe for heading
                let idx = lastClosestIndex.current || 0;

                // Look ahead logic
                let targetIdx = Math.min(idx + 1, route.coordinates.length - 1);

                const p1 = userLocation;
                const p2 = route.coordinates[targetIdx];

                // If points are very close (< 2 meters), look one further ahead for stability
                // 2 meters approx 0.00002 deg. Squared ~ 4e-10.
                if (getDistSq(p1, p2) < 0.0000000004 && targetIdx < route.coordinates.length - 1) {
                    targetIdx++;
                }

                targetHeading = getBearing(p1, route.coordinates[targetIdx]);
            }

            mapRef.current.animateCamera({
                center: userLocation,
                pitch: 60,
                heading: targetHeading,
                zoom: 18,
                altitude: 200,
            }, { duration: 1000 });
            return;
        }
    }, [userLocation, cameraMode, isFollowing, route]);

    // Camera Control: Overview (Route/Results/Dest) - Only if NOT navigating
    useEffect(() => {
        if (!mapRef.current || cameraMode === 'navigation') return;

        // Priority: Route > Results > Destination
        if (route && route.coordinates.length > 0) {
            mapRef.current.fitToCoordinates(route.coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
                animated: true,
            });
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

    // Route Trimming Logic
    const [displayCoordinates, setDisplayCoordinates] = React.useState<{ latitude: number, longitude: number }[]>([]);
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

    // Route Trimming & Snapping Logic
    useEffect(() => {
        // ... existing logic I added ...
        if (!route) {
            setDisplayCoordinates([]);
            setSnappedLocation(null);
            return;
        }

        if (cameraMode !== 'navigation' || !userLocation) {
            setDisplayCoordinates(route.coordinates);
            setSnappedLocation(null);
            return;
        }

        // Find closest point on route to user (Vertex)
        let minDistance = Infinity;
        let closestIndex = lastClosestIndex.current;

        // Optimization: Search window around last index (e.g., +/- 50 points) or forward only?
        // Full scan is safer for loops/recalc, but forward scan is efficient.
        // We'll stick to full scan starting from last index for now to ensure we don't jump back.
        // Actually, scan full array is safer if user does U-Turn.
        for (let i = 0; i < route.coordinates.length; i++) {
            const p = route.coordinates[i];
            const d = (p.latitude - userLocation.latitude) ** 2 + (p.longitude - userLocation.longitude) ** 2;
            if (d < minDistance) {
                minDistance = d;
                closestIndex = i;
            }
        }

        // Enforce Monotonic Progress (Optional: Disable if we allow U-turns detection here? No, rely on ActiveNavigation recalculation)
        // If we found a point "way back", it implies loop or error. 
        // Logic: If closestIndex is drastically far back, ignore? 
        // For snapping, we just want the closest point.
        lastClosestIndex.current = closestIndex;

        // --- SNAPPING CALCULATION ---
        let snapCandidate = route.coordinates[closestIndex];
        // Look at segments adjacent to closest vertex: [i-1, i] and [i, i+1]
        const segments = [];
        if (closestIndex > 0) segments.push([route.coordinates[closestIndex - 1], route.coordinates[closestIndex]]);
        if (closestIndex < route.coordinates.length - 1) segments.push([route.coordinates[closestIndex], route.coordinates[closestIndex + 1]]);

        let bestSnapDist = Infinity;

        segments.forEach(seg => {
            const p = getProjectedPoint(userLocation, seg[0], seg[1]);
            const d = getDistSq(userLocation, p);
            if (d < bestSnapDist) {
                bestSnapDist = d;
                snapCandidate = p;
            }
        });

        // Threshold (approx meters). 1 degree ~ 111km. 10m ~ 0.0001 deg. 
        // 0.0001^2 = 1e-8.
        const SNAP_THRESHOLD_SQ = 0.0003 * 0.0003; // ~30 meters

        if (bestSnapDist < SNAP_THRESHOLD_SQ) {
            setSnappedLocation(snapCandidate);
        } else {
            setSnappedLocation(null); // Too far, don't snap (Enables connection line)
        }

        // Trimming (Visual)
        // We always start the visible route from the snapCandidate (closest point on path)
        // so the blue line doesn't jump to the user when off-road.
        const remaining = route.coordinates.slice(closestIndex);
        setDisplayCoordinates([snapCandidate, ...remaining]);

    }, [route, userLocation, cameraMode]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={effectiveMapStyle}
                mapType={effectiveMapType}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={cameraMode !== 'navigation'} // Hide default blue dot in nav
                showsMyLocationButton={false}
                showsCompass={false}
                showsBuildings={true}
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
                initialRegion={{
                    latitude: 51.5074,
                    longitude: -0.1278,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
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

                {/* Route Line */}
                {route && displayCoordinates.length > 0 && (
                    <Polyline
                        key={`route-line-${displayCoordinates.length}`}
                        coordinates={displayCoordinates}
                        strokeColor={Colors.accent}
                        strokeWidth={5}
                        lineCap="round"
                        lineJoin="round"
                    />
                )}

                {/* Custom Navigation Puck (When Navigating) */}
                {cameraMode === 'navigation' && userLocation && (
                    <Marker
                        coordinate={snappedLocation || userLocation}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true} // Rotate with map
                        zIndex={999}
                    >
                        {/* Simple Chevron Puck */}
                        <View style={{
                            width: 24, height: 24,
                            borderRadius: 12, backgroundColor: 'white',
                            borderWidth: 3, borderColor: 'white',
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: 'black', shadowRadius: 2, shadowOpacity: 0.3, elevation: 3
                        }}>
                            <View style={{
                                width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.accent,
                                transform: [{ rotate: `${(userLocation.heading || 0)}deg` }] // Rotate inner arrow? Or Marker handles flat?
                                // If flat=true, the Marker view rotates with the map. 
                                // But the Marker needs to represent HEADING. 
                                // If flat=true, 'rotation' prop on Marker controls orientation relative to NORTH.
                            }} />
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
    }
});
