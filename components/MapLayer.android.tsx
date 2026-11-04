import { CLOUD_MAP_IDS } from '../constants/CloudMapConfig';
import React from 'react';
import { requireNativeComponent, NativeSyntheticEvent, StyleSheet, ViewProps } from 'react-native';
import type { Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapLayerProps } from './MapLayer';
import { buildNativeMapScene } from '../utils/nativeMapScene';
import { LIGHT_MAP_STYLE, DARK_MAP_STYLE } from '../constants/MapStyles';

type MapEvent = { kind: string; index?: number; placeId?: string; name?: string; latitude?: number; longitude?: number; region?: Region; heading?: number };
interface NativeMapProps extends ViewProps { scene: string; options: string; location: string; onMapEvent: (event: NativeSyntheticEvent<MapEvent>) => void }
const MetroMap = requireNativeComponent<NativeMapProps>('MetroMap');

// Android owns MapView, every map overlay and camera operation. React supplies app data and receives taps.
export function MapLayer(props: MapLayerProps) {
    const { routes = [], results = [], favorites = [], selectedRouteIndex = 0, destination, userLocation,
        cameraMode = 'default', initialRegion, mapTheme = 'light', showLabels = true, useMiles = true } = props;
    const insets = useSafeAreaInsets();
    const cloudMapId = CLOUD_MAP_IDS[mapTheme];
    const scene = React.useMemo(() => JSON.stringify(buildNativeMapScene({ routes, results, favorites,
        selectedRouteIndex, destination, nearbyPlaces: [], navigating: cameraMode === 'navigation', useMiles })),
        [routes, results, favorites, selectedRouteIndex, destination, cameraMode, useMiles]);
    const options = React.useMemo(() => {
        const style: object[] = [...(mapTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE)];
        if (!showLabels) style.push({ elementType: 'labels', stylers: [{ visibility: 'off' }] });
        return JSON.stringify({ mode: cameraMode, following: props.isFollowing ?? true, theme: mapTheme,
            mapType: props.mapType || 'standard', showLabels, buildings: props.showsBuildings ?? true,
            zoomControls: props.showZoomControls ?? false, showUser: props.showUserLocation ?? true,
            cameraTrigger: props.cameraTrigger || 0, mapId: cloudMapId, initialRegion, top: insets.top, bottom: insets.bottom, style });
    }, [cameraMode, props.isFollowing, props.mapType, props.showsBuildings, props.showZoomControls, props.showUserLocation,
        props.cameraTrigger, initialRegion, insets.top, insets.bottom, mapTheme, showLabels, cloudMapId]);
    const location = React.useMemo(() => JSON.stringify(userLocation), [userLocation]);
    const onMapEvent = (event: NativeSyntheticEvent<MapEvent>) => {
        const data = event.nativeEvent;
        if (data.kind === 'mapPress') props.onMapPress();
        else if (data.kind === 'gesture') props.onFollowChange?.(false);
        else if (data.kind === 'routePress' && data.index !== undefined) props.onSelectRoute?.(data.index);
        else if (data.kind === 'camera' && data.region) {
            props.onRegionChange?.(data.region);
            if (data.heading !== undefined) props.onHeadingChange?.(data.heading);
        } else if (data.kind === 'placePress') {
            const place = [destination, ...results, ...favorites].find(place => place?.place_id === data.placeId);
            if (place) props.onPinPress(place);
            else if (data.latitude !== undefined && data.longitude !== undefined) props.onPinPress({ place_id: data.placeId || String(Date.now()),
                display_name: data.name || '', lat: String(data.latitude), lon: String(data.longitude), type: 'poi' });
        }
    };
    return <MetroMap key={cloudMapId || 'embedded-style'} style={StyleSheet.absoluteFill} scene={scene} options={options} location={location} onMapEvent={onMapEvent} />;
}
