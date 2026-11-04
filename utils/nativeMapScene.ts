import type { RouteResult, SearchResult } from '../services/api';
import { getPlaceCategory } from './placeMarkers';

export interface MapSceneInput {
    routes: RouteResult[]; selectedRouteIndex: number; results: SearchResult[];
    favorites: SearchResult[]; nearbyPlaces: SearchResult[]; destination: SearchResult | null;
    navigating: boolean; useMiles: boolean;
}
export function buildNativeMapScene(input: MapSceneInput) {
    const saved = new Set(input.favorites.map(place => place.place_id));
    const places = new Map<string, SearchResult>();
    for (const place of [...input.nearbyPlaces, ...(input.navigating ? [] : input.favorites), ...input.results, ...(input.destination ? [input.destination] : [])]) places.set(place.place_id, place);
    const markers = [...places.values()].filter(place => place.lat.trim() && place.lon.trim()
        && Number.isFinite(Number(place.lat)) && Math.abs(Number(place.lat)) <= 90
        && Number.isFinite(Number(place.lon)) && Math.abs(Number(place.lon)) <= 180)
        .map(place => ({ id: place.place_id, latitude: Number(place.lat), longitude: Number(place.lon),
            title: place.display_name, category: getPlaceCategory(place), saved: saved.has(place.place_id),
            selected: place.place_id === input.destination?.place_id }));
    const routes = input.routes.flatMap((route, index) => {
        if (route.coordinates.length < 2 || !route.coordinates.every(p => Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180)) return [];
        const minutes = Math.max(0, Math.round(route.duration / 60));
        return [{ index, id: route.geometry || JSON.stringify(route.coordinates), points: route.coordinates,
            time: minutes >= 60 ? Math.floor(minutes / 60) + 'H ' + (minutes % 60) + 'M' : minutes + ' MIN',
            distance: (route.distance / (input.useMiles ? 1609.34 : 1000)).toFixed(1) + (input.useMiles ? ' mi' : ' km'),
            mode: route.travelMode || 'driving', transitColor: route.transitLines?.[0]?.color || '#0085d0',
            traffic: route.speedReadingIntervals || [] }];
    });
    const selected = routes.find(route => route.index === input.selectedRouteIndex);
    const cameraPoints = selected?.points || (input.results.length ? input.results.map(place => ({ latitude: Number(place.lat), longitude: Number(place.lon) }))
        : input.destination ? [{ latitude: Number(input.destination.lat), longitude: Number(input.destination.lon) }] : []);
    return { routes, selectedRouteIndex: input.selectedRouteIndex, markers,
        cameraPoints, cameraKey: selected ? 'route:' + selected.index + ':' + selected.id : JSON.stringify(cameraPoints) };
}
