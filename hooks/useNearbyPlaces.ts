import React from 'react';
import type { Region } from 'react-native-maps';
import { api, SearchResult } from '../services/api';

// Keep requests to settled, neighborhood-scale views; native POIs remain the fallback.
export function useNearbyPlaces(region: Region | null, enabled: boolean) {
    const [layer, setLayer] = React.useState<{ places: SearchResult[]; replaceNativePois: boolean }>({ places: [], replaceNativePois: false });
    const cache = React.useRef(new Map<string, { places: SearchResult[] | null; expires: number }>());
    const latitude = region ? Math.round(region.latitude * 200) / 200 : 0;
    const longitude = region ? Math.round(region.longitude * 200) / 200 : 0;
    const closeEnough = !!region && region.latitudeDelta <= 0.08 && region.longitudeDelta <= 0.12;
    const radius = region ? Math.min(2500, Math.max(500, Math.ceil(Math.hypot(region.latitudeDelta * 111320,
        region.longitudeDelta * 111320 * Math.cos(latitude * Math.PI / 180)) / 1000) * 500)) : 500;
    React.useEffect(() => {
        if (!enabled || !closeEnough) { setLayer({ places: [], replaceNativePois: false }); return; }
        let cancelled = false;
        const key = latitude + ',' + longitude + ',' + radius;
        const apply = (places: SearchResult[] | null) => setLayer({ places: places || [], replaceNativePois: places !== null });
        const cached = cache.current.get(key);
        if (cached && cached.expires > Date.now()) { apply(cached.places); return; }
        setLayer({ places: [], replaceNativePois: false });
        const controller = new AbortController();
        let requestTimeout: ReturnType<typeof setTimeout> | undefined;
        const debounce = setTimeout(async () => {
            requestTimeout = setTimeout(() => controller.abort(), 15000);
            try {
                const places = await api.getNearbyPlaces(latitude, longitude, radius, controller.signal);
                if (cancelled) return;
                if (cache.current.size >= 24) cache.current.clear();
                cache.current.set(key, { places, expires: Date.now() + (places === null ? 30000 : 300000) });
                apply(places);
            } finally { clearTimeout(requestTimeout); }
        }, 1200);
        return () => { cancelled = true; clearTimeout(debounce); clearTimeout(requestTimeout); controller.abort(); };
    }, [latitude, longitude, radius, closeEnough, enabled]);
    return layer;
}
