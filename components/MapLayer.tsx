import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Metro/Here Maps Desaturated Style
const MAP_STYLE = [
    { "featureType": "landscape.man_made", "elementType": "geometry", "stylers": [{ "color": "#f7f1df" }] },
    { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#d0e3b4" }] },
    { "featureType": "landscape.natural.terrain", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "on" }] },
    { "featureType": "poi.business", "elementType": "all", "stylers": [{ "visibility": "simplified" }] },
    { "featureType": "poi.medical", "elementType": "geometry", "stylers": [{ "color": "#fbd3da" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#bde6ab" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "visibility": "simplified" }] },
    { "featureType": "road", "elementType": "labels", "stylers": [{ "visibility": "on" }] },
    { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffe15f" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#efd151" }] },
    { "featureType": "road.arterial", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road.local", "elementType": "geometry.fill", "stylers": [{ "color": "black" }] },
    { "featureType": "transit.station.airport", "elementType": "geometry.fill", "stylers": [{ "color": "#cfb2db" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#a2daf2" }] }
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
            mapRef.current.animateCamera({
                center: userLocation,
                pitch: 60,
                heading: 0,
                zoom: 18,
                altitude: 200,
            }, { duration: 1000 });
            return;
        }
    }, [userLocation, cameraMode, isFollowing]);

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

    // Route Trimming Logic
    const [displayCoordinates, setDisplayCoordinates] = React.useState<{ latitude: number, longitude: number }[]>([]);
    const lastClosestIndex = useRef(0);
    const lastRouteId = useRef<string | null>(null);

    // Reset progress when route changes
    useEffect(() => {
        if (route?.geometry !== lastRouteId.current) {
            lastClosestIndex.current = 0;
            lastRouteId.current = route?.geometry || null;
        }
    }, [route]);

    useEffect(() => {
        if (!route) {
            setDisplayCoordinates([]);
            return;
        }

        if (cameraMode !== 'navigation' || !userLocation) {
            setDisplayCoordinates(route.coordinates);
            return;
        }

        // Find closest point on route to user
        let minDistance = Infinity;
        let closestIndex = lastClosestIndex.current;

        for (let i = lastClosestIndex.current; i < route.coordinates.length; i++) {
            const p = route.coordinates[i];
            const d = (p.latitude - userLocation.latitude) ** 2 + (p.longitude - userLocation.longitude) ** 2;
            if (d < minDistance) {
                minDistance = d;
                closestIndex = i;
            }
        }

        // Enforce Monotonic Progress
        if (closestIndex < lastClosestIndex.current) {
            closestIndex = lastClosestIndex.current;
        } else {
            lastClosestIndex.current = closestIndex;
        }

        const remaining = route.coordinates.slice(closestIndex);
        setDisplayCoordinates([userLocation, ...remaining]);

    }, [route, userLocation, cameraMode]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={effectiveMapStyle}
                mapType={effectiveMapType}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
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
                    // Fire region change
                    onRegionChange?.(region);

                    // Also fetch heading
                    if (onHeadingChange && mapRef.current) {
                        mapRef.current.getCamera().then(cam => {
                            onHeadingChange(cam.heading);
                        });
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
