import type { SearchResult } from '../services/api';
export type PlaceCategory = 'food' | 'cafe' | 'bar' | 'fuel' | 'parking' | 'shop' | 'hotel' | 'park' | 'health' | 'train' | 'bus' | 'airport' | 'camera' | 'place';
export function getPlaceCategory(item: SearchResult): PlaceCategory {
    // Prefer API types; names are only a fallback (a restaurant called Station is still food).
    const classify = (text: string): PlaceCategory | null => {
        if (/gas_station|gas station|petrol|fuel/.test(text)) return 'fuel';
        if (/parking/.test(text)) return 'parking';
        if (/cafe|coffee/.test(text)) return 'cafe';
        if (/bar|night_club|pub/.test(text)) return 'bar';
        if (/restaurant|food|bakery|dining|meal/.test(text)) return 'food';
        if (/lodging|hotel|motel/.test(text)) return 'hotel';
        if (/hospital|doctor|health|pharmacy/.test(text)) return 'health';
        if (/airport/.test(text)) return 'airport';
        if (/bus/.test(text)) return 'bus';
        if (/train|subway|rail|transit_station/.test(text)) return 'train';
        if (/store|shop|mall|market|grocery/.test(text)) return 'shop';
        if (/park|garden/.test(text)) return 'park';
        if (/museum|tourist_attraction|landmark/.test(text)) return 'camera';
        return null;
    };
    return classify([item.type, ...(item.types || [])].join(' ').toLowerCase())
        || classify(item.display_name.toLowerCase()) || 'place';
}
