import type { SearchResult } from '../services/api';

export function isStoredPlace(value: unknown): value is SearchResult {
    if (!value || typeof value !== 'object') return false;
    const p = value as Record<string, unknown>;
    return typeof p.place_id === 'string' && typeof p.display_name === 'string'
        && typeof p.lat === 'string' && p.lat.trim() !== '' && Number.isFinite(Number(p.lat)) && Math.abs(Number(p.lat)) <= 90
        && typeof p.lon === 'string' && p.lon.trim() !== '' && Number.isFinite(Number(p.lon)) && Math.abs(Number(p.lon)) <= 180;
}

export function isMapRegion(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const r = value as Record<string, unknown>;
    return typeof r.latitude === 'number' && Number.isFinite(r.latitude) && Math.abs(r.latitude) <= 90
        && typeof r.longitude === 'number' && Number.isFinite(r.longitude) && Math.abs(r.longitude) <= 180
        && typeof r.latitudeDelta === 'number' && Number.isFinite(r.latitudeDelta) && r.latitudeDelta > 0 && r.latitudeDelta <= 180
        && typeof r.longitudeDelta === 'number' && Number.isFinite(r.longitudeDelta) && r.longitudeDelta > 0 && r.longitudeDelta <= 360;
}
