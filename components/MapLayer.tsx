import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../constants/Colors';
import { RouteResult, SearchResult } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Metro/Here Maps Desaturated Style
const MAP_STYLE = [
    { "stylers": [{ "saturation": -100 }, { "gamma": 0.5 }] },
    { "elementType": "geometry", "stylers": [{ "color": "#E6E3DF" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#FFFFFF" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#D1D1D1" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#A3CCFF" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#CDDDC2" }] }
];

interface MapLayerProps {
    userLocation: { latitude: number; longitude: number } | null;
    destination: SearchResult | null;
    results?: SearchResult[];
    route: RouteResult | null;
    mapType?: 'standard' | 'satellite';
    onMapPress: () => void;
    onPinPress: (item?: SearchResult) => void;
    onRegionChange?: (region: any) => void;
    cameraMode?: 'default' | 'navigation';
    cameraTrigger?: number;
}

export function MapLayer({ userLocation, destination, results = [], route, mapType = 'standard', onMapPress, onPinPress, cameraTrigger, onRegionChange, cameraMode = 'default' }: MapLayerProps) {
    const mapRef = useRef<MapView>(null);
    const insets = useSafeAreaInsets();
    const hasCenteredOnUser = useRef(false);

    // Auto-fit Logic / Camera Trigger
    useEffect(() => {
        if (!mapRef.current) return;

        // Active Navigation Mode: Follow user with tilt
        if (cameraMode === 'navigation' && userLocation) {
            mapRef.current.animateCamera({
                center: userLocation,
                pitch: 60,
                heading: 0,
                zoom: 18,
                altitude: 200,
            }, { duration: 1000 });
            return;
        }

        // Initial Center on User (on startup only)
        if (userLocation && !hasCenteredOnUser.current && !destination && results.length === 0 && !route) {
            hasCenteredOnUser.current = true;
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
            return;
        }

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
            return;
        }

        // Manual Locate Me trigger (only if nothing else to show)
        if (cameraTrigger && userLocation) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    }, [destination, route, userLocation, results, cameraTrigger, cameraMode]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={mapType === 'standard' ? MAP_STYLE : []}
                mapType={mapType}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                onPress={onMapPress}
                onPoiClick={(e) => {
                    e.stopPropagation();
                    const poi = e.nativeEvent;
                    const pseudoResult: SearchResult = {
                        place_id: parseInt(poi.placeId) || Date.now(),
                        lat: poi.coordinate.latitude.toString(),
                        lon: poi.coordinate.longitude.toString(),
                        display_name: poi.name,
                        type: 'poi',
                    };
                    onPinPress(pseudoResult);
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
                {route && (
                    <Polyline
                        coordinates={route.coordinates}
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
